/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { Play, Pause, Volume2, ArrowLeft } from "lucide-react";
import heartAnimation from "../../assets/videos/Medical_Heart_Visualization.mp4";

// --- Types ---
interface ResultsPageProps {
  bpm: number;  // Fixed: was 'bmp'
  stress: string;
  hrv: number;
  risk: "low" | "moderate" | "high";
  audioUrl: string | null;
  isPlaying: boolean;
  onBack: () => void;
  onTogglePlayback: () => void;
}

// Add this object near the top of the component
const riskConfig = {
  low:      { label: "Low Risk",      color: "#22c55e", bg: "#f0fdf4" },
  moderate: { label: "Moderate Risk", color: "#f59e0b", bg: "#fffbeb" },
  high:     { label: "High Risk",     color: "#ef4444", bg: "#fef2f2" },
};

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

export default function ResultsPage({
  bpm,  // Fixed: was 'bmp'
  stress,
  hrv,
  risk,
  audioUrl,
  isPlaying,
  onBack,
  onTogglePlayback,
}: ResultsPageProps) {
  return (
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
          className="w-full h-full object-contain scale-100"
        >
          <source 
            src={heartAnimation}
            type="video/mp4" 
          />
          Your browser does not support the video tag.
        </video>
        {/* Soft white vignette to blend with background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_20%,white_90%)]" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col">
        <Header title="Quick Results" onBack={onBack} />

        <div className="flex-1 px-6 flex flex-col gap-6 py-6  -translate-y-8">
          {/* BPM Card - comes from above */}
          <motion.div
            initial={{ opacity: 0, y: -60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, type: "spring", damping: 20 }}
            className="backdrop-blur-[40px] bg-white/10 border border-white/40 p-4 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.05)]"
          >
            <p className="text-black text-[10px] font-bold uppercase tracking-[0.2em] mb-2 opacity-70">
              PCG Readings
            </p>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-8xl font-bold text-[#1e293b] tracking-tighter">{bpm}</span>
              <span className="text-3xl font-light text-black -translate-y-6">BPM</span>
            </div>
            {/* Risk badge */}
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-2"
              style={{
                background: riskConfig[risk].bg,
                color: riskConfig[risk].color,
              }}
            >
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ background: riskConfig[risk].color }}
              />
              {riskConfig[risk].label}
            </div>

            <Waveform color="#10b981" />
          </motion.div>

          {/* Audio Playback Card - comes from below and right */}
          {audioUrl && (
            <motion.div
              initial={{ opacity: 0, y: 60, x: 40 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              transition={{ delay: 0.3, type: "spring", damping: 20 }}
              className="backdrop-blur-[40px] bg-white/20 border border-white/40 p-4 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] flex items-center gap-4"
            >
              <button 
                onClick={onTogglePlayback}
                className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg active:scale-90 transition-transform"
              >
                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
              </button>
              <div className="flex-1">
                <p className="text-[#1e293b] font-bold text-sm">Heart Sound Recording</p>
                <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">PCG Audio Captured</p>
              </div>
              <Volume2 className="text-emerald-500 opacity-50" size={20} />
            </motion.div>
          )}

          <div className="grid grid-cols-2 gap-6 mt-24">
            {/* Stress Level Card - comes from below and left */}
            <motion.div
              initial={{ opacity: 0, y: 60, x: -40 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              transition={{ delay: 0.4, type: "spring", damping: 20 }}
              className="backdrop-blur-[40px] bg-white/10 border border-white/40 p-6 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] flex flex-col justify-center min-h-[140px]"
            >
              <p className="text-black text-[10px] font-bold uppercase tracking-[0.15em] mb-2 opacity-70">
                Stress Levels
              </p>
              <span className="text-2xl font-bold text-[#1e293b]">{stress}</span>
            </motion.div>

            {/* HRV Card - comes from below and right */}
            <motion.div
              initial={{ opacity: 0, y: 60, x: 40 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              transition={{ delay: 0.6, type: "spring", damping: 20 }}
              className="backdrop-blur-[40px] bg-white/10 border border-white/40 p-6 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] min-h-[140px]"
            >
              <p className="text-black text-[10px] font-bold uppercase tracking-[0.15em] mb-2 opacity-70">
                Heart Rate Variability
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-[#1e293b]">{hrv}</span>
                <span className="text-xl text-black font-light">ms</span>
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
  );
}