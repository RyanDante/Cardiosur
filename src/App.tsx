/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Play, Pause, Volume2 } from "lucide-react";

// --- Types ---
type Screen = "instructions" | "loading" | "recording" | "results";

// --- Components ---

const Header = ({ title, onBack }: { title: string; onBack: () => void }) => (
  <div className="flex items-center px-6 py-8">
    <button onClick={onBack} className="p-2 -ml-2 text-emerald-600">
      <ArrowLeft size={24} />
    </button>
    <h1 className="flex-1 text-center text-xl font-medium text-slate-600 pr-8 tracking-tight">
      {title}
    </h1>
  </div>
);

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
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "linear",
      }}
    />
  </svg>
);

export default function App() {
  const [screen, setScreen] = useState<Screen>("instructions");
  const [timer, setTimer] = useState(30);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [bmp, setBmp] = useState(110);
  const [stress, setStress] = useState("HIGH");
  const [hrv, setHrv] = useState(97);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        // Stop all tracks to release the microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      // Simulate dynamic readings based on "actual" data
      setBmp(Math.floor(Math.random() * (120 - 70) + 70));
      setStress(Math.random() > 0.5 ? "HIGH" : "NORMAL");
      setHrv(Math.floor(Math.random() * (110 - 40) + 40));
    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Handle loading to recording transition
  useEffect(() => {
    if (screen === "loading") {
      // Pre-request microphone access during loading to avoid delay
      navigator.mediaDevices.getUserMedia({ audio: true }).catch(console.error);
      
      const timeout = setTimeout(() => {
        setScreen("recording");
        startRecording();
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [screen]);

  // Handle recording countdown
  useEffect(() => {
    if (screen === "recording" && timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else if (screen === "recording" && timer === 0) {
      stopRecording();
      setScreen("results");
    }
  }, [screen, timer]);

  const reset = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setScreen("instructions");
    setTimer(30);
    setIsPlaying(false);
  };

  return (
    <div className="min-h-screen bg-[#f8fff9] font-sans overflow-hidden flex flex-col max-w-md mx-auto relative shadow-2xl">
      <AnimatePresence mode="wait">
        {/* --- Instructions & Loading Screens --- */}
        {(screen === "instructions" || screen === "loading") && (
          <motion.div
            key="setup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col relative bg-[#121826]"
          >
            {/* Torso Background */}
            <div className="absolute inset-0 z-0 flex items-center justify-center pt-20 overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=2070&auto=format&fit=crop"
                alt="Human Torso"
                className="w-[140%] h-auto object-contain opacity-80 brightness-200 grayscale contrast-125 translate-y-[-10%]"
                referrerPolicy="no-referrer"
              />
              {/* Vignette to blend edges */}
              <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_40%,#121826_90%)]" />
            </div>

            {/* Marker */}
            <div className="flex-1 flex items-center justify-center relative z-10">
              <div className="relative translate-x-14 translate-y-10">
                {screen === "loading" && (
                  <motion.div
                    className="absolute -inset-2 border-4 border-emerald-500 border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                )}
                <div className="w-14 h-14 bg-[#6dfa7e] rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                  1
                </div>
              </div>
            </div>

            {/* Bottom Panel */}
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              className="bg-[#6dfa7e] p-10 rounded-t-[40px] z-20 flex flex-col items-center gap-8 shadow-[0_-10px_40px_rgba(0,0,0,0.3)]"
            >
              <p className="text-center text-[#0f172a] font-bold leading-tight max-w-[280px] text-xl tracking-tight">
                Place the microphone at the labelled position and start the recording
              </p>

              <button
                onClick={() => screen === "instructions" && setScreen("loading")}
                disabled={screen === "loading"}
                className="w-full max-w-[260px] bg-[#121826] py-5 rounded-[40px] text-[#00ff44] font-bold text-5xl tracking-tight transition-transform active:scale-95 disabled:opacity-90 shadow-2xl"
              >
                {screen === "instructions" ? "Start" : (
                  <span className="text-2xl">Getting Ready...</span>
                )}
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* --- Recording Screen --- */}
        {screen === "recording" && (
          <motion.div
            key="recording"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="flex-1 flex flex-col bg-[#f1fdf4]"
          >
            <Header title="CardioSur Recording" onBack={reset} />

            <div className="flex-1 flex flex-col items-center justify-center px-6">
              <div className="text-center mb-12">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <motion.div 
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-3 h-3 bg-red-500 rounded-full"
                  />
                  <span className="text-red-500 font-bold text-xs uppercase tracking-widest">Recording PCG...</span>
                </div>
                <motion.h2
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="text-[100px] font-bold text-[#0f172a] leading-none"
                >
                  {bmp}
                </motion.h2>
                <p className="text-slate-500 text-xl font-light tracking-widest uppercase mt-2">
                  BMP
                </p>
              </div>

              <Waveform color="#d1d5db" />

              <div className="relative mt-12">
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

        {/* --- Results Screen --- */}
        {screen === "results" && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col bg-white relative overflow-hidden"
          >
            {/* Heart Background Video */}
            <div className="absolute inset-0 z-0 flex items-center justify-center">
              <video
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-contain scale-150"
              >
                <source 
                  src="https://i.imgur.com/jHgkj8F.mp4" 
                  type="video/mp4" 
                />
                Your browser does not support the video tag.
              </video>
              {/* Soft white vignette to blend with background */}
              <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_20%,white_90%)]" />
            </div>

            <div className="relative z-10 flex-1 flex flex-col">
              <Header title="Quick Results" onBack={reset} />

              <div className="flex-1 px-6 flex flex-col gap-4 py-4">
                {/* BMP Card */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, type: "spring", damping: 20 }}
                  className="backdrop-blur-[40px] bg-white/10 border border-white/40 p-6 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.05)]"
                >
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-3 opacity-70">
                    PCG Readings
                  </p>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-8xl font-bold text-[#1e293b] tracking-tighter">{bmp}</span>
                    <span className="text-3xl text-slate-400 font-light">BMP</span>
                  </div>
                  <Waveform color="#10b981" />
                </motion.div>

                {/* Audio Playback Card */}
                {audioUrl && (
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, type: "spring", damping: 20 }}
                    className="backdrop-blur-[40px] bg-white/20 border border-white/40 p-5 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] flex items-center gap-4"
                  >
                    <button 
                      onClick={togglePlayback}
                      className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg active:scale-90 transition-transform"
                    >
                      {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                    </button>
                    <div className="flex-1">
                      <p className="text-[#1e293b] font-bold text-sm">Heart Sound Recording</p>
                      <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">PCG Audio Captured</p>
                    </div>
                    <Volume2 className="text-emerald-500 opacity-50" size={20} />
                    <audio 
                      ref={audioRef} 
                      src={audioUrl} 
                      onEnded={() => setIsPlaying(false)}
                      className="hidden"
                    />
                  </motion.div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {/* Stress Level Card */}
                  <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4, type: "spring", damping: 20 }}
                    className="backdrop-blur-[40px] bg-white/10 border border-white/40 p-6 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] flex flex-col justify-center min-h-[140px]"
                  >
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.15em] mb-2 opacity-70">
                      Stress Levels
                    </p>
                    <span className="text-4xl font-bold text-[#1e293b]">{stress}</span>
                  </motion.div>

                  {/* HRV Card */}
                  <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6, type: "spring", damping: 20 }}
                    className="backdrop-blur-[40px] bg-white/10 border border-white/40 p-6 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] min-h-[140px]"
                  >
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.15em] mb-2 opacity-70">
                      Heart Rate Variability
                    </p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-[#1e293b]">{hrv}</span>
                      <span className="text-xl text-slate-400 font-light">ms</span>
                    </div>
                    <p className="text-[10px] mt-3 font-semibold">
                      Status: <span className="text-emerald-500">{hrv > 60 ? "Stable" : "Variable"}</span>
                    </p>
                  </motion.div>
                </div>

                <div className="mt-auto pb-8">
                  <button className="w-full bg-[#34d399] hover:bg-[#10b981] py-5 rounded-[32px] text-white font-bold text-xl shadow-[0_15px_30px_rgba(52,211,153,0.3)] transition-all active:scale-[0.98]">
                    Get full results
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
