/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft } from "lucide-react";
import torsoImage from "../assets/images/nice1.png";
import ResultsPage from "./pages/ResultsPage";
import InstallPrompt from "./components/InstallPrompt";
import LiveWaveform from "./components/LiveWaveform";
import { HeartAudioProcessor, HeartAudioResult, convertToWav } from "./hooks/useHeartAudio";
import { Analytics } from "@vercel/analytics/next"
import OnboardingScreen from "./components/OnboardingScreen";

// --- Types ---
type Screen = "onboarding" | "instructions" | "loading" | "ready" | "recording" | "results";

interface PredictionResult {
  result?: string;
  predicted_label?: string;
  bpm?: number;
  confidence?: number;
  chunks_analyzed?: number;
  raw_score?: number;
  graph?: string;
  class_probabilities?: {
    [key: string]: number;
  };
  [key: string]: any;
}

// --- Helpers ---
function stressFromHrv(hrv: number): string {
  if (hrv === 0) return "UNKNOWN";
  if (hrv < 20)  return "HIGH";
  if (hrv < 50)  return "MODERATE";
  return "NORMAL";
}

// API helper to send audio to backend with timeout
async function sendAudioToBackend(audioBlob: Blob, timeoutMs: number = 15000): Promise<PredictionResult | null> {
  try {
    // Convert to WAV format for backend compatibility
    let wavBlob: Blob;
    try {
      wavBlob = await convertToWav(audioBlob);
    } catch (err) {
      console.error("WAV conversion failed:", err);
      return null;
    }

    const formData = new FormData();
    formData.append("file", wavBlob, "heart_sound.wav");

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch("https://cardiosur-api.onrender.com/api/predict", {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`Backend returned status ${response.status}`);
      return null;
    }

    const data = await response.json();
    console.log("Backend prediction:", data);
    return data as PredictionResult;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.warn("Backend API request timed out");
    } else {
      console.error("Backend API error:", err);
    }
    return null;
  }
}

function riskFromBpm(bpm: number): "low" | "moderate" | "high" {
  if (bpm < 40 || bpm >= 120) return "high";
  if (bpm < 60 || bpm > 100)  return "moderate";
  return "low";
}

// --- Main App ---
export default function App() {
  // Warn about HTTP access on non-localhost
  useEffect(() => {
    if (window.location.hostname !== 'localhost' && window.location.protocol !== 'https:') {
      console.warn(
        "%c⚠️ MICROPHONE SECURITY WARNING",
        "color: red; font-size: 16px; font-weight: bold;"
      );
      console.warn(
        "Microphone access requires a secure context (HTTPS or localhost).\n" +
        "Current URL:", window.location.href, "\n" +
        "To test on mobile, use one of these options:\n" +
        "1. Use ngrok: ngrok http 3000\n" +
        "2. Use localtunnel: lt --port 3000\n" +
        "3. Deploy to HTTPS server (Vercel, Netlify, etc.)"
      );
    }
  }, []);

  const [screen, setScreen]       = useState<Screen>("onboarding");
  const [timer, setTimer]         = useState(30);
  const [audioUrl, setAudioUrl]   = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  // Live values — update on every detected heartbeat during recording
  const [liveBpm,     setLiveBpm]     = useState<number>(0);
  const [liveHrv,     setLiveHrv]     = useState<number>(0);
  const [liveQuality, setLiveQuality] = useState<"good" | "weak" | "noisy">("weak");
  const [signalLevel, setSignalLevel] = useState<number>(0); // Raw audio level for debug
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);

  // Locked-in final values — set when recording stops
  const [finalBpm,    setFinalBpm]    = useState(0);
  const [finalHrv,    setFinalHrv]    = useState(0);
  const [finalStress, setFinalStress] = useState("UNKNOWN");
  const [finalRisk,   setFinalRisk]   = useState<"low" | "moderate" | "high">("low");
  const [filteredUrl, setFilteredUrl] = useState<string | null>(null);
  const [coachMsg, setCoachMsg] = useState("");
  const [loadingCountdown, setLoadingCountdown] = useState(5);

  // Heart beat detection indicator
  const [heartbeat, setHeartbeat] = useState(false);
  const [beatFlash, setBeatFlash] = useState(false);

  // Backend predictions
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);

  // Refs
  const processorRef = useRef<HeartAudioProcessor | null>(null);
  const audioRef     = useRef<HTMLAudioElement | null>(null);
  const filteredBlobRef = useRef<Blob | null>(null);

  // Keep live values accessible inside callbacks without stale closure
  const liveBpmRef = useRef(0);
  const liveHrvRef = useRef(0);
  useEffect(() => { liveBpmRef.current = liveBpm; }, [liveBpm]);
  useEffect(() => { liveHrvRef.current = liveHrv; }, [liveHrv]);

  // ── Coaching messages during recording ──────────────────
  useEffect(() => {
    if (screen !== "recording") { setCoachMsg(""); return; }

    const messages = [
      { time: 2,  text: "Hold your phone steady against your chest..." },
      { time: 6,  text: "You're doing great — stay still" },
      { time: 10, text: "Breathe normally, try not to move" },
      { time: 14, text: "Almost halfway there, keep going..." },
      { time: 18, text: "Stay relaxed, we're picking up your signal" },
      { time: 22, text: "Just a few more seconds..." },
      { time: 26, text: "Wrapping up — hang tight!" },
    ];

    const elapsed = 30 - timer;
    const current = [...messages].reverse().find(m => elapsed >= m.time);
    setCoachMsg(current?.text ?? "Listening for your heartbeat...");
  }, [screen, timer]);

  // ── Step 2: Start recording when user presses button ──────
  const startRecording = async () => {
    try {
      console.log("Starting recording...");
      setError(null);
      
      // Check if browser supports microphone
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("Microphone API not supported");
        setError("Microphone is not supported on this device. Please try a different browser.");
        return;
      }
      
      // Check and request microphone permission first
      console.log("Checking microphone permission...");
      try {
        // Try to get permission before creating processor
        const tempStream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          }
        });
        
        // Permission granted, stop the temp stream immediately
        tempStream.getTracks().forEach(track => track.stop());
        console.log("Microphone permission granted");
      } catch (permError) {
        console.error("Microphone permission denied:", permError);
        setError(
          "Microphone access is required. Please enable microphone permissions in your browser settings and try again."
        );
        return;
      }
      
      const processor = new HeartAudioProcessor();
      processorRef.current = processor;

      await processor.start(
        // Called on every detected heartbeat — updates live display
        (result: HeartAudioResult) => {
          console.log("Heartbeat detected:", result);
          if (result.bpm > 0) setLiveBpm(result.bpm);
          if (result.hrv > 0) setLiveHrv(result.hrv);
          setLiveQuality(result.signalQuality);
        },
        // Called when .stop() finishes and blob is ready
        async (rawblob: Blob, filteredBlob: Blob) => {
          console.log("Audio processing callback triggered");
          console.log("Raw blob size:", rawblob.size, "Filtered blob size:", filteredBlob.size);
          
          try {
            const rawurl = URL.createObjectURL(rawblob);
            setAudioUrl(rawurl);
            console.log("Raw audio URL created");

            // Store filtered blob for API call
            filteredBlobRef.current = filteredBlob;
            console.log("Filtered blob stored");

            // Convert filtered audio to WAV for better playback compatibility
            try {
              const wavBlob = await convertToWav(filteredBlob);
              const wavUrl = URL.createObjectURL(wavBlob);
              setFilteredUrl(wavUrl);
              console.log("WAV conversion successful");
            } catch (err) {
              console.error("WAV conversion failed, using original:", err);
              const filtUrl = URL.createObjectURL(filteredBlob);
              setFilteredUrl(filtUrl);
              console.log("Using original filtered blob for playback");
            }

            // Lock in final values from refs (closures are stale here)
            const bpm = liveBpmRef.current || 0;
            const hrv = liveHrvRef.current || 0;
            
            console.log("Setting final values:", { bpm, hrv });
            setFinalBpm(bpm);
            setFinalHrv(hrv);
            setFinalStress(stressFromHrv(hrv));
            setFinalRisk(riskFromBpm(bpm));
            console.log("Final values set successfully");

            // Immediately show results with local calculations
            console.log("Transitioning to results screen immediately");
            setScreen("results");
            
            // Send to backend API in background (non-blocking)
            setIsPredicting(true);
            console.log("Sending audio to backend in background...");
            
            // Safety timeout: ensure isPredicting is set to false after 20 seconds max
            const safetyTimeout = setTimeout(() => {
              console.warn("Safety timeout triggered - forcing isPredicting to false");
              setIsPredicting(false);
            }, 20000);
            
            // Run API call asynchronously
            const makeBackendCall = async () => {
              try {
                console.log("Starting backend API call...");
                const pred = await sendAudioToBackend(filteredBlob);
                console.log("Backend API call completed, setting prediction:", pred);
                setPrediction(pred);
              } catch (err) {
                console.error("Backend API call failed with error:", err);
                setPrediction(null);
              } finally {
                console.log("Setting isPredicting to false");
                clearTimeout(safetyTimeout);
                setIsPredicting(false);
              }
            };
            
            // Start the API call
            makeBackendCall();
            
          } catch (error) {
            console.error("Critical error in audio processing callback:", error);
            // Force transition to results even if there's an error
            setIsPredicting(false);
            setScreen("results");
          }
        },
        // Called on mic permission error
        (errMsg: string) => {
          console.error("Microphone error:", errMsg);
          setError(errMsg);
          setScreen("instructions");
        },
        // onBeat — fires on every detected heartbeat
        () => {
          setHeartbeat(true);
          setTimeout(() => setHeartbeat(false), 300);
        }
      );

      // Expose analyser for live waveform
      setAnalyserNode(processor.analyserNode);
      console.log("Analyser node set:", processor.analyserNode);
      setScreen("recording");
      console.log("Screen set to recording");
      
    } catch (error) {
      console.error("Failed to start recording:", error);
      setError("Failed to start recording. Please try again. Error: " + (error instanceof Error ? error.message : String(error)));
      setScreen("instructions");
    }
  };

  // ── Step 1: User clicks "Start" - Request permission first ──────
  const handleStartClick = async () => {
    console.log("User clicked Start - requesting microphone permission...");
    
    try {
      // Request microphone permission immediately on user click
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1,
          sampleRate: 44100,
        },
      });
      
      // Permission granted - stop the stream immediately (we'll create a new one during recording)
      stream.getTracks().forEach(track => track.stop());
      console.log("Microphone permission granted, proceeding to countdown");
      
      // Now go to loading screen
      setScreen("loading");
    } catch (err) {
      console.error("Microphone permission denied:", err);
      setError("Microphone access is required. Please allow microphone access and try again.");
    }
  };

  // ── Step 2: Loading countdown → Recording (5s countdown) ──────
  useEffect(() => {
    if (screen !== "loading") return;

    console.log("Loading screen started, countdown from 5...");
    setLoadingCountdown(5);

    const interval = setInterval(() => {
      setLoadingCountdown(prev => {
        if (prev <= 1) {
          console.log("Countdown finished, calling startRecording...");
          clearInterval(interval);
          startRecording();
          return 0;
        }
        console.log("Loading countdown:", prev - 1);
        return prev - 1;
      });
    }, 1000);

    return () => {
      console.log("Loading countdown cleanup");
      clearInterval(interval);
    };
  }, [screen]);

  // ── Step 3: Countdown while recording ──────────────────
  useEffect(() => {
    if (screen !== "recording") return;

    if (timer <= 0) {
      // Time's up — show analyzing screen and stop processor
      console.log("Timer reached 0, stopping processor...");
      setScreen("analyzing");
      processorRef.current?.stop();
      return;
    }

    const interval = setInterval(() => setTimer(t => t - 1), 1000);
    return () => clearInterval(interval);
  }, [screen, timer]);

  // ── Stop microphone when on results screen ──────────────────
  useEffect(() => {
    if (screen === "results" && processorRef.current) {
      console.log("On results screen - stopping microphone to release resources");
      processorRef.current.stop();
      processorRef.current = null;
    }
  }, [screen]);

  // ── Manual stop (Skip button) ───────────────────────────
  const handleStop = () => {
    setScreen("analyzing"); // Show analyzing screen while processing
    processorRef.current?.stop();
    
    // Fallback timeout in case the callback never fires
    setTimeout(() => {
      console.log("Fallback timeout triggered - forcing results screen");
      setScreen("results");
    }, 10000); // 10 second fallback
  };

  // ── Cancel recording and return to instructions ──────────────
  const cancelRecording = () => {
    processorRef.current?.stop();
    processorRef.current = null;
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    if (filteredUrl) URL.revokeObjectURL(filteredUrl);

    setAudioUrl(null);
    setFilteredUrl(null);
    setAnalyserNode(null);
    setScreen("instructions");
    setTimer(30);
    setIsPlaying(false);
    setError(null);
    setLiveBpm(0);
    setLiveHrv(0);
    setLiveQuality("weak");
    setFinalBpm(0);
    setFinalHrv(0);
    setFinalStress("UNKNOWN");
    setFinalRisk("low");
    setBeatFlash(false);
    setCoachMsg("");
    setLoadingCountdown(5);
  };

  // ── Playback ────────────────────────────────────────────
  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(p => !p);
  };

  // ── Reset everything ────────────────────────────────────
  const reset = () => {
    processorRef.current?.stop();
    processorRef.current = null;
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    if (filteredUrl) URL.revokeObjectURL(filteredUrl);

    setAudioUrl(null);
    setFilteredUrl(null);
    setAnalyserNode(null);
    setScreen("instructions");
    setTimer(30);
    setIsPlaying(false);
    setError(null);
    setLiveBpm(0);
    setLiveHrv(0);
    setFinalBpm(0);
    setFinalHrv(0);
    setFinalStress("UNKNOWN");
    setFinalRisk("low");
    setPrediction(null);
    setIsPredicting(false);
    setHeartbeat(false);
    filteredBlobRef.current = null;
  };

  // ── Pulsing marker dots on torso ────────────────────────
  const markerPositions = [
    "translate-x-10 translate-y-4",
    "-translate-x-4 translate-y-5",
    "translate-x-2 translate-y-10",
    "translate-x-1 translate-y-[4.25rem]",
    "translate-x-8 translate-y-20",
  ];

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#f8fff9] font-sans overflow-hidden flex flex-col max-w-md mx-auto relative shadow-2xl">
      
      <InstallPrompt />

      {/* Hidden audio element — use FILTERED audio for playback */}
      {filteredUrl && (
        <audio
          ref={audioRef}
          src={filteredUrl}
          onEnded={() => setIsPlaying(false)}
        />
      )}

      <AnimatePresence mode="wait">


        {/* ── Onboarding ── */}
        {screen === "onboarding" && (
          <motion.div
            key="onboarding"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
          >
            <OnboardingScreen onComplete={() => setScreen("instructions")} />
          </motion.div>
        )}

        {/* ── Instructions ── */}
        {screen === "instructions" && (
          <motion.div
            key="instructions"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col relative bg-[#121826]"
          >
            {/* Torso image */}
            <div className="absolute inset-0 z-0 flex items-center justify-center pt-20 overflow-hidden">
              <img
                src={torsoImage}
                alt="Human Torso"
                className="w-[140%] h-auto object-contain opacity-80 grayscale contrast-125 translate-y-[-10%]"
              />
              <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_40%,#121826_90%)]" />
            </div>

            {/* Placement marker dots */}
            <div className="flex-1 flex items-center justify-center relative z-10">
              {markerPositions.map((cls, i) => (
                <div key={i} className={`relative ${cls}`}>
                  <div className="w-4 h-4 bg-[#6dfa7e] rounded-full shadow-lg relative z-10" />
                </div>
              ))}
            </div>

            {/* Bottom panel */}
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              className="bg-[#6dfa7e] p-6 sm:p-10 rounded-t-[32px] sm:rounded-t-[40px] z-20 flex flex-col items-center gap-5 sm:gap-8 shadow-[0_-10px_40px_rgba(0,0,0,0.3)]"
            >
              {error ? (
                <p className="text-center text-red-800 font-bold leading-tight max-w-[280px] text-base sm:text-lg">
                  {error}
                </p>
              ) : (
                <p className="text-center text-[#0f172a] font-bold leading-tight max-w-[280px] text-lg sm:text-xl tracking-tight">
                  Place the microphone at the labelled position and start the recording
                </p>
              )}

              <button
                onClick={handleStartClick}
                className="w-full max-w-[260px] bg-[#121826] py-4 sm:py-5 rounded-[40px] text-[#00ff44] font-bold text-4xl sm:text-5xl tracking-tight transition-transform active:scale-95 shadow-2xl"
              >
                Start
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* ── Loading (preparation) ── */}
        {screen === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col relative bg-[#121826]"
          >
            {/* Torso image */}
            <div className="absolute inset-0 z-0 flex items-center justify-center pt-20 overflow-hidden">
              <img
                src={torsoImage}
                alt="Human Torso"
                className="w-[140%] h-auto object-contain opacity-80 grayscale contrast-125 translate-y-[-10%]"
              />
              <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_40%,#121826_90%)]" />
            </div>

            {/* Placement marker dots with pulse animation */}
            <div className="flex-1 flex items-center justify-center relative z-10">
              {markerPositions.map((cls, i) => (
                <div key={i} className={`relative ${cls}`}>
                  <motion.div
                    className="absolute inset-0 bg-[#6dfa7e] rounded-full"
                    animate={{ scale: [1, 2.5], opacity: [0.6, 0] }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeOut",
                      delay: i * 0.25,
                    }}
                  />
                  <div className="w-4 h-4 bg-[#6dfa7e] rounded-full shadow-lg relative z-10" />
                </div>
              ))}
            </div>

            {/* Bottom panel */}
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              className="bg-[#AEEAD5] p-6 sm:p-10 rounded-t-[32px] sm:rounded-t-[40px] z-20 flex flex-col items-center gap-5 sm:gap-8 shadow-[0_-10px_40px_rgba(0,0,0,0.3)]"
            >
              <p className="text-center text-[#0f172a] font-bold leading-tight max-w-[280px] text-lg sm:text-xl tracking-tight">
                Hold your phone firmly against your bare chest at the marked spot
              </p>

              <div className="w-full max-w-[260px] bg-[#121826] py-4 sm:py-5 rounded-[40px] text-[#00ff44] font-bold text-xl sm:text-2xl tracking-tight text-center opacity-90 flex items-center justify-center gap-2">
                <span>Getting ready...</span>
                <motion.span
                  key={loadingCountdown}
                  initial={{ scale: 1.4, opacity: 0.6 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="text-2xl sm:text-3xl"
                >
                  {loadingCountdown}
                </motion.span>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ── Ready (start recording button) ── */}
        {screen === "ready" && (
          <motion.div
            key="ready"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col relative bg-[#121826]"
          >
            {/* Torso image */}
            <div className="absolute inset-0 z-0 flex items-center justify-center pt-20 overflow-hidden">
              <img
                src={torsoImage}
                alt="Human Torso"
                className="w-[140%] h-auto object-contain opacity-80 grayscale contrast-125 translate-y-[-10%]"
              />
              <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_40%,#121826_90%)]" />
            </div>

            {/* Placement marker dots */}
            <div className="flex-1 flex items-center justify-center relative z-10">
              {markerPositions.map((cls, i) => (
                <div key={i} className={`relative ${cls}`}>
                  <div className="w-4 h-4 bg-[#6dfa7e] rounded-full shadow-lg relative z-10" />
                </div>
              ))}
            </div>

            {/* Bottom panel */}
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              className="bg-[#6dfa7e] p-6 sm:p-10 rounded-t-[32px] sm:rounded-t-[40px] z-20 flex flex-col items-center gap-5 sm:gap-8 shadow-[0_-10px_40px_rgba(0,0,0,0.3)]"
            >
              <p className="text-center text-[#0f172a] font-bold leading-tight max-w-[280px] text-lg sm:text-xl tracking-tight">
                Ready to record. Press the button when you're in position.
              </p>

              <button
                onClick={startRecording}
                className="w-full max-w-[260px] bg-[#121826] py-4 sm:py-5 rounded-[40px] text-[#00ff44] font-bold text-3xl sm:text-4xl tracking-tight transition-transform active:scale-95 shadow-2xl"
              >
                Record
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* ── Recording ── */}
        {screen === "recording" && (
          <motion.div
            key="recording"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="flex-1 flex flex-col bg-[#f1fdf4]"
          >
            <div className="flex items-center px-4 sm:px-6 py-4 sm:py-8">
              <button onClick={cancelRecording} className="p-2 -ml-2 text-emerald-600">
                <ArrowLeft size={22} />
              </button>
              <h1 className="flex-1 text-center text-base sm:text-xl font-medium text-slate-600 pr-8 tracking-tight">
                CardioSur Recording
              </h1>
            </div>

            <div className="flex-1 flex flex-col items-center justify-between px-4 sm:px-6 py-3 sm:py-4">

              {/* Status row - dynamic, only show while recording */}
              {timer > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="flex items-center justify-center gap-3"
                >
                  <motion.div
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                    className="w-3 h-3 bg-red-500 rounded-full"
                  />
                  <span className="text-red-500 font-bold text-xs uppercase tracking-widest">
                    Recording PCG...
                  </span>
                </motion.div>
              )}

              {/* Live Waveform */}
              <div className="w-full flex items-center py-4">
                <LiveWaveform analyser={analyserNode} />
              </div>

              {/* Coaching message */}
              <AnimatePresence mode="wait">
                <motion.p
                  key={coachMsg}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.4 }}
                  className="text-slate-400 text-sm text-center italic mt-2"
                >
                  {coachMsg}
                </motion.p>
              </AnimatePresence>

              {/* Bottom controls */}
              <div className="flex flex-col items-center gap-2 sm:gap-4 pb-2">
                {/* Stop early */}
                <button
                  onClick={handleStop}
                  className="px-4 sm:px-6 py-1.5 sm:py-2 text-slate-400 text-xs sm:text-sm font-medium hover:text-slate-600 transition-colors"
                >
                  Stop & See Results →
                </button>

                {/* Countdown */}
                <div className="relative">
                  <div className="bg-[#121826] px-8 sm:px-12 py-3.5 sm:py-5 rounded-full shadow-2xl">
                    <span className="text-[#00ff44] text-3xl sm:text-5xl font-mono font-bold">
                      00:{timer.toString().padStart(2, "0")}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        )}

        {/* ── Analyzing ── */}
        {screen === "analyzing" && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center bg-[#121826]"
          >
            <div className="flex flex-col items-center gap-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-20 h-20 border-4 border-[#6dfa7e] border-t-transparent flex items-center justify-center rounded-full"
              >
                <div className="w-12 h-12 border-4 border-[#ff0044] border-b-transparent rounded-full animate-pulse z-10" style={{ animationDirection: "reverse" }} />
              </motion.div>
              <p className="text-[#6dfa7e] font-bold text-3xl tracking-tight text-center">
                Analyzing heart sounds...
              </p>
              <p className="text-slate-400 text-base max-w-[250px] text-center">
                Running advanced phonocardiography AI model
              </p>
            </div>
          </motion.div>
        )}

        {/* ── Results ── */}
        {screen === "results" && (
          <>
            {console.log("Rendering results screen with screen:", screen)}
            <ResultsPage
              bpm={finalBpm}
              stress={finalStress}
              hrv={finalHrv}
              risk={finalRisk}
              audioUrl={filteredUrl}
              isPlaying={isPlaying}
              onBack={reset}
              onTogglePlayback={togglePlayback}
              onRestart={reset}
              prediction={prediction}
              isPredicting={isPredicting}
            />
          </>
        )}

      </AnimatePresence>
    </div>
  );
}