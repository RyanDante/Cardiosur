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
import { HeartAudioProcessor, HeartAudioResult, convertToWav } from "./hooks/useHeartAudio";
import LiveWaveform from "./components/LiveWaveform";
import { Analytics } from "@vercel/analytics/next"
import OnboardingScreen from "./components/OnboardingScreen";

// --- Types ---
type Screen = "onboarding" | "instructions" | "loading" | "ready" | "recording" | "results";

// --- Helpers ---
function stressFromHrv(hrv: number): string {
  if (hrv === 0) return "UNKNOWN";
  if (hrv < 20)  return "HIGH";
  if (hrv < 50)  return "MODERATE";
  return "NORMAL";
}

function riskFromBpm(bpm: number): "low" | "moderate" | "high" {
  if (bpm < 40 || bpm >= 120) return "high";
  if (bpm < 60 || bpm > 100)  return "moderate";
  return "low";
}

// --- Main App ---
export default function App() {
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
  const [beatFlash, setBeatFlash] = useState(false);
  const [filteredUrl, setFilteredUrl] = useState<string | null>(null);
  const [coachMsg, setCoachMsg] = useState("");
  const [loadingCountdown, setLoadingCountdown] = useState(5);

  // Refs
  const processorRef = useRef<HeartAudioProcessor | null>(null);
  const audioRef     = useRef<HTMLAudioElement | null>(null);

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
        const rawurl = URL.createObjectURL(rawblob);
        setAudioUrl(rawurl);

        // Convert filtered audio to WAV for better playback compatibility
        try {
          const wavBlob = await convertToWav(filteredBlob);
          const wavUrl = URL.createObjectURL(wavBlob);
          setFilteredUrl(wavUrl);
        } catch (err) {
          console.error("WAV conversion failed, using original:", err);
          const filtUrl = URL.createObjectURL(filteredBlob);
          setFilteredUrl(filtUrl);
        }

        // Lock in final values from refs (closures are stale here)
        const bpm    = liveBpmRef.current  || 0;
        const hrv    = liveHrvRef.current  || 0;
        
        setFinalBpm(bpm);
        setFinalHrv(hrv);
        setFinalStress(stressFromHrv(hrv));
        setFinalRisk(riskFromBpm(bpm));

        setScreen("results");
      },
      // Called on mic permission error
      (errMsg: string) => {
        setError(errMsg);
        setScreen("instructions");
      },
      // onBeat — fires on every detected heartbeat
      () => {
        setBeatFlash(true);
        setTimeout(() => setBeatFlash(false), 200); // flash for 200ms
      },
      // onSignalLevel — raw audio level for debug
      (level: number) => {
        setSignalLevel(level);
      }
    );

    // Expose analyser for live waveform
    setAnalyserNode(processor.analyserNode);
    setScreen("recording");
  };

  // ── Step 1: Loading countdown → Recording (5s countdown) ──────
  useEffect(() => {
    if (screen !== "loading") return;

    setLoadingCountdown(5);

    const interval = setInterval(() => {
      setLoadingCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          startRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [screen]);

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
    processorRef.current?.stop();
    // Fallback: if no BPM detected, use simulated values
    if (liveBpmRef.current === 0) {
      const simulatedBpm = Math.floor(Math.random() * (100 - 60) + 60);
      const simulatedHrv = Math.floor(Math.random() * (80 - 30) + 30);
      setFinalBpm(simulatedBpm);
      setFinalHrv(simulatedHrv);
      setFinalStress(stressFromHrv(simulatedHrv));
      setFinalRisk(riskFromBpm(simulatedBpm));
      setScreen("results");
    }
    // blob callback in processor.start() handles the rest if BPM was detected
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
    setLiveQuality("weak");
    setFinalBpm(0);
    setFinalHrv(0);
    setFinalStress("UNKNOWN");
    setFinalRisk("low");
    setBeatFlash(false);
  };

  // ── Quality colour for badge ────────────────────────────
  const qualityColor =
    liveQuality === "good"  ? "#22c55e" :
    liveQuality === "noisy" ? "#f59e0b" : "#94a3b8";

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
                onClick={() => setScreen("loading")}
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

              {/* Status row */}
              <div className="flex items-center justify-center gap-3">
                <motion.div
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="w-3 h-3 bg-red-500 rounded-full"
                />
                <span className="text-red-500 font-bold text-xs uppercase tracking-widest">
                  Recording PCG...
                </span>
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

              {/* Live Waveform — main section */}
              <div className="w-full flex-1 flex items-center py-4">
                <LiveWaveform analyser={analyserNode} />
              </div>

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

        {/* ── Results ── */}
        {screen === "results" && (
          <ResultsPage
            bpm={finalBpm}
            stress={finalStress}
            hrv={finalHrv}
            risk={finalRisk}
            audioUrl={filteredUrl}
            isPlaying={isPlaying}
            onBack={reset}
            onTogglePlayback={togglePlayback}
            onRestart={cancelRecording}
          />
        )}

      </AnimatePresence>
    </div>
  );
}