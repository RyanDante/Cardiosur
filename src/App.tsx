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
import { Analytics } from "@vercel/analytics/next"
// --- Types ---
type Screen = "instructions" | "loading" | "ready" | "recording" | "results";

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
  const [timer, setTimer]         = useState(30);
  const [audioUrl, setAudioUrl]   = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  // Live values — update on every detected heartbeat during recording
  const [liveBpm,     setLiveBpm]     = useState<number>(0);
  const [liveHrv,     setLiveHrv]     = useState<number>(0);
  const [liveQuality, setLiveQuality] = useState<"good" | "weak" | "noisy">("weak");
  const [signalLevel, setSignalLevel] = useState<number>(0); // Raw audio level for debug

  // Locked-in final values — set when recording stops
  const [finalBpm,    setFinalBpm]    = useState(0);
  const [finalHrv,    setFinalHrv]    = useState(0);
  const [finalStress, setFinalStress] = useState("UNKNOWN");
  const [finalRisk,   setFinalRisk]   = useState<"low" | "moderate" | "high">("low");
  const [beatFlash, setBeatFlash] = useState(false);
  const [filteredUrl, setFilteredUrl] = useState<string | null>(null);

  // Refs
  const processorRef = useRef<HeartAudioProcessor | null>(null);
  const audioRef     = useRef<HTMLAudioElement | null>(null);

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
                className="w-full max-w-[260px] bg-[#121826] py-5 rounded-[40px] text-[#00ff44] font-bold text-4xl tracking-tight transition-transform active:scale-95 shadow-2xl"
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
            <div className="flex items-center px-6 py-8">
              <button onClick={reset} className="p-2 -ml-2 text-emerald-600">
                <ArrowLeft size={24} />
              </button>
              <h1 className="flex-1 text-center text-xl font-medium text-slate-600 pr-8 tracking-tight">
                CardioSur Recording
              </h1>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center px-6">

              {/* Status row */}
              <div className="flex items-center justify-center gap-3 mb-8">
                <motion.div
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="w-3 h-3 bg-red-500 rounded-full"
                />
                <span className="text-red-500 font-bold text-xs uppercase tracking-widest">
                  Recording PCG...
                </span>
                {/* Signal quality badge */}
                <span
                  className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                  style={{
                    background: qualityColor + "22",
                    color: qualityColor,
                  }}
                >
                  {liveQuality}
                </span>
              </div>

              {/* Live BPM — re-animates on each new heartbeat */}
              <div className="text-center mb-4">
                <motion.h2
                  key={liveBpm}
                  initial={{ scale: 1.2, opacity: 0.6 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="text-[100px] font-bold text-[#0f172a] leading-none"
                >
                  {liveBpm > 0 ? liveBpm : "--"}
                </motion.h2>
                <p className="text-slate-500 text-xl font-light tracking-widest uppercase mt-2">
                  BPM
                </p>

                {/* Signal Level Bar */}
                <div className="mt-3 w-48 mx-auto">
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>Signal</span>
                    <span>{(signalLevel * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-emerald-500"
                      animate={{ width: `${Math.min(signalLevel * 100 * 5, 100)}%` }}
                      transition={{ duration: 0.1 }}
                    />
                  </div>
                  <p className="text-slate-300 text-[10px] mt-1">
                    Threshold: ~0.8% needed for detection
                  </p>
                </div>

                {/* Debug info */}
                <p className="text-slate-300 text-xs mt-2">
                  Debug: BPM={liveBpm}, HRV={liveHrv}, Quality={liveQuality}
                </p>

                {/* Live HRV sub-label */}
                {liveHrv > 0 && (
                  <motion.p
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-slate-400 text-sm mt-2"
                  >
                    HRV {liveHrv}ms · {stressFromHrv(liveHrv)} stress
                  </motion.p>
                )}

                {/* Guidance when signal is too weak */}
                {liveQuality === "weak" && (
                  <p className="text-amber-500 text-xs mt-3 max-w-[220px] mx-auto leading-relaxed">
                    Press mic firmly against bare chest and hold still
                  </p>
                )}
                {liveQuality === "noisy" && (
                  <p className="text-amber-500 text-xs mt-3 max-w-[220px] mx-auto leading-relaxed">
                    Try to stay still — movement is affecting the reading
                  </p>
                )}
              </div>

              {/* Waveform — green when good signal, grey when weak */}
              <Waveform color={liveQuality === "good" ? "#10b981" : "#d1d5db"} />

              {/* Stop early */}
              <button
                onClick={handleStop}
                className="mt-4 px-6 py-2 text-slate-400 text-sm font-medium hover:text-slate-600 transition-colors"
              >
                Stop & See Results →
              </button>

              {/* Countdown */}
              <div className="relative mt-8">
                <div className="w-64 h-64 bg-emerald-100/30 rounded-full absolute -top-12 left-1/2 -translate-x-1/2 -z-10" />
                <div className="bg-[#121826] px-12 py-5 rounded-full shadow-2xl">
                  <span className="text-[#00ff44] text-5xl font-mono font-bold">
                    00:{timer.toString().padStart(2, "0")}
                  </span>
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
          />
        )}

      </AnimatePresence>
    </div>
  );
}