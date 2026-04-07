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

// --- Types ---
type Screen = "instructions" | "loading" | "ready" | "recording" | "analyzing" | "results";

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

// API helper to send audio to backend
async function sendAudioToBackend(audioBlob: Blob): Promise<PredictionResult | null> {
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

    const response = await fetch("http://localhost:8000/api/predict", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      console.warn(`Backend returned status ${response.status}`);
      return null;
    }

    const data = await response.json();
    console.log("Backend prediction:", data);
    return data as PredictionResult;
  } catch (err) {
    console.error("Backend API error:", err);
    return null;
  }
}

function riskFromBpm(bpm: number): "low" | "moderate" | "high" {
  if (bpm < 40 || bpm >= 120) return "high";
  if (bpm < 60 || bpm > 100)  return "moderate";
  return "low";
}

// --- Waveform ---
const Waveform = ({ color = "#cbd5e1" }: { color?: string }) => (
  <svg
    viewBox="0 0 400 100"
    className="w-full h-24 my-8"
    preserveAspectRatio="none"
  >
    <motion.path
      d="M 0 50 L 50 50 L 60 20 L 70 80 L 80 50 L 120 50 L 130 10 L 140 90 L 150 50 L 200 50 L 210 30 L 220 70 L 230 50 L 280 50 L 290 15 L 300 85 L 310 50 L 400 50"
      fill="transparent"
      stroke={color}
      strokeWidth="3"
      strokeLinecap="round"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
    />
  </svg>
);

// --- Main App ---
export default function App() {
  const [screen, setScreen]       = useState<Screen>("instructions");
  
  // Debug screen changes
  useEffect(() => {
    console.log("Screen changed to:", screen);
  }, [screen]);
  const [timer, setTimer]         = useState(30);
  const [audioUrl, setAudioUrl]   = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  // Live values — update on every detected heartbeat during recording
  const [liveBpm,     setLiveBpm]     = useState<number>(0);
  const [liveHrv,     setLiveHrv]     = useState<number>(0);
  const [liveQuality, setLiveQuality] = useState<"good" | "weak" | "noisy">("weak");

  // Locked-in final values — set when recording stops
  const [finalBpm,    setFinalBpm]    = useState(0);
  const [finalHrv,    setFinalHrv]    = useState(0);
  const [finalStress, setFinalStress] = useState("UNKNOWN");
  const [finalRisk,   setFinalRisk]   = useState<"low" | "moderate" | "high">("low");
  const [filteredUrl, setFilteredUrl] = useState<string | null>(null);

  // Heart beat detection indicator
  const [heartbeat, setHeartbeat] = useState(false);

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
  

  // ── Step 1: Loading → Ready (show start button) ──────
  useEffect(() => {
    if (screen !== "loading") return;

    const timeout = setTimeout(() => {
      setScreen("ready");
    }, 3000);

    return () => clearTimeout(timeout);
  }, [screen]);

  // ── Step 2: Start recording when user presses button ──────
  const startRecording = async () => {
    const processor = new HeartAudioProcessor();
    processorRef.current = processor;

    await processor.start(
      // Called on every detected heartbeat — updates live display
      (result: HeartAudioResult) => {
        if (result.bpm > 0) setLiveBpm(result.bpm);
        if (result.hrv > 0) setLiveHrv(result.hrv);
        setLiveQuality(result.signalQuality);
      },
      // Called when .stop() finishes and blob is ready
      async (rawblob: Blob, filteredBlob: Blob) => {
        console.log("Audio processing callback triggered");
        
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

          // Send to backend API for predictions
          setIsPredicting(true);
          console.log("Sending audio to backend...");
          
          try {
            const pred = await sendAudioToBackend(filteredBlob);
            setPrediction(pred);
            console.log("Backend response received:", pred);
          } catch (err) {
            console.error("Backend API failed:", err);
            setPrediction(null);
          }
          
          setIsPredicting(false);
          console.log("Transitioning to results screen");
          setScreen("results");
          
        } catch (error) {
          console.error("Critical error in audio processing callback:", error);
          // Force transition to results even if there's an error
          setIsPredicting(false);
          setScreen("results");
        }
      },
      // Called on mic permission error
      (errMsg: string) => {
        setError(errMsg);
        setScreen("instructions");
      },
      // onBeat — fires on every detected heartbeat
      () => {
        setHeartbeat(true);
        setTimeout(() => setHeartbeat(false), 300);
      }
    );

    setScreen("recording");
  };

  // ── Step 2: Countdown while recording ──────────────────
  useEffect(() => {
    if (screen !== "recording") return;

    if (timer <= 0) {
      // Time's up — stop processor (blob callback fires → sets results → goes to results screen)
      processorRef.current?.stop();
      return;
    }

    const interval = setInterval(() => setTimer(t => t - 1), 1000);
    return () => clearInterval(interval);
  }, [screen, timer]);

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
    <div className="min-h-screen bg-[#f8fff9] font-sans overflow-hidden flex flex-col max-w-md mx-auto relative shadow-2xl">
      
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
              className="bg-[#6dfa7e] p-10 rounded-t-[40px] z-20 flex flex-col items-center gap-8 shadow-[0_-10px_40px_rgba(0,0,0,0.3)]"
            >
              {error ? (
                <p className="text-center text-red-800 font-bold leading-tight max-w-[280px] text-lg">
                  {error}
                </p>
              ) : (
                <p className="text-center text-[#0f172a] font-bold leading-tight max-w-[280px] text-xl tracking-tight">
                  Place the microphone at the labelled position and start the recording
                </p>
              )}

              <button
                onClick={() => setScreen("loading")}
                className="w-full max-w-[260px] bg-[#121826] py-5 rounded-[40px] text-[#00ff44] font-bold text-5xl tracking-tight transition-transform active:scale-95 shadow-2xl"
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
              className="bg-[#6dfa7e] p-10 rounded-t-[40px] z-20 flex flex-col items-center gap-8 shadow-[0_-10px_40px_rgba(0,0,0,0.3)]"
            >
              <p className="text-center text-[#0f172a] font-bold leading-tight max-w-[280px] text-xl tracking-tight">
                Hold your phone firmly against your bare chest at the marked spot
              </p>

              <div className="w-full max-w-[260px] bg-[#121826] py-5 rounded-[40px] text-[#00ff44] font-bold text-2xl tracking-tight text-center opacity-90">
                Getting Ready...
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
              className="bg-[#6dfa7e] p-10 rounded-t-[40px] z-20 flex flex-col items-center gap-8 shadow-[0_-10px_40px_rgba(0,0,0,0.3)]"
            >
              <p className="text-center text-[#0f172a] font-bold leading-tight max-w-[280px] text-xl tracking-tight">
                Ready to record. Press the button when you're in position.
              </p>

              <button
                onClick={startRecording}
                className="w-full max-w-[260px] bg-[#121826] py-5 rounded-[40px] text-[#00ff44] font-bold text-3xl tracking-tight transition-transform active:scale-95 shadow-2xl"
              >
                Begin Recording
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
            <div className="flex items-center px-6 py-8">
              <button onClick={reset} className="p-2 -ml-2 text-emerald-600">
                <ArrowLeft size={24} />
              </button>
              <h1 className="flex-1 text-center text-xl font-medium text-slate-600 pr-8 tracking-tight">
                CardioSur Recording
              </h1>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center px-6">

              {/* Status row - dynamic, only show while recording */}
              {timer > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="flex items-center justify-center gap-3 mb-12"
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
              <div className="flex-1 flex items-center justify-center mb-8 w-full">
                <LiveWaveform 
                  processor={processorRef.current}
                  color={liveQuality === "good" ? "#10b981" : "#94a3b8"}
                  width={350}
                  height={120}
                />
              </div>

              {/* Countdown */}
              <div className="relative mb-8">
                <div className="bg-[#121826] px-12 py-5 rounded-full shadow-2xl">
                  <span className="text-[#00ff44] text-5xl font-mono font-bold">
                    00:{timer.toString().padStart(2, "0")}
                  </span>
                </div>
              </div>

              {/* Stop early */}
              <button
                onClick={handleStop}
                className="px-6 py-2 text-slate-400 text-sm font-medium hover:text-slate-600 transition-colors"
              >
                Stop & See Results →
              </button>

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
              prediction={prediction}
              isPredicting={isPredicting}
            />
          </>
        )}

      </AnimatePresence>
    </div>
  );
}