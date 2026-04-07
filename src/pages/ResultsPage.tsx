/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { Play, Pause, Volume2, ArrowLeft, RefreshCw } from "lucide-react";
import heartAnimation from "../../assets/videos/heat-beat.mp4";

// --- Types ---
interface ResultsPageProps {
  bpm: number;
  stress: string;
  hrv: number;
  risk: "low" | "moderate" | "high";
  audioUrl: string | null;
  isPlaying: boolean;
  onBack: () => void;
  onTogglePlayback: () => void;
  onRestart: () => void;
}

const riskConfig = {
  low:      { label: "Low Risk",      color: "#22c55e", bg: "#f0fdf4" },
  moderate: { label: "Moderate Risk", color: "#f59e0b", bg: "#fffbeb" },
  high:     { label: "High Risk",     color: "#ef4444", bg: "#fef2f2" },
};

// --- Components ---
const Header = ({ title, onBack, onRestart }: { title: string; onBack: () => void; onRestart: () => void }) => (
  <div className="flex items-center px-4 sm:px-6 py-4 sm:py-6">
    <button onClick={onBack} className="p-2 -ml-2 text-emerald-600">
      <ArrowLeft size={22} />
    </button>
    <h1 className="flex-1 text-center text-base sm:text-xl font-medium text-slate-600 tracking-tight">
      {title}
    </h1>
    <button onClick={onRestart} className="p-2 -mr-2 text-emerald-600" aria-label="Restart test">
      <RefreshCw size={22} />
    </button>
  </div>
);

const Waveform = ({ color = "#cbd5e1" }: { color?: string }) => (
  <svg
    viewBox="0 0 400 100"
    className="w-full h-14 sm:h-20 my-3 sm:my-5"
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

export default function ResultsPage({
  bpm,
  stress,
  hrv,
  risk,
  audioUrl,
  isPlaying,
  onBack,
  onTogglePlayback,
  onRestart,
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
        //   muted
          playsInline
          className="w-full h-full object-contain scale-150"
        >
          <source src={heartAnimation} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_20%,white_90%)]" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col h-full overflow-y-auto">
        <Header title="Quick Results" onBack={onBack} onRestart={onRestart} />

        <div className="flex-1 px-4 sm:px-6 flex flex-col gap-3 sm:gap-4 pb-6">
          {/* BPM Card */}
          <motion.div
            initial={{ opacity: 0, y: -60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, type: "spring", damping: 20 }}
            className="backdrop-blur-[10px] bg-white/10 border border-white/40 p-3 sm:p-3.5 rounded-[22px] sm:rounded-[28px] shadow-[0_20px_50px_rgba(0,0,0,0.05)]"
          >
            <p className="text-black text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] mb-1 opacity-70">
              PCG Readings
            </p>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-5xl sm:text-7xl font-bold text-[#1e293b] tracking-tighter">{bpm}</span>
              <span className="text-lg sm:text-2xl font-light text-black -translate-y-3 sm:-translate-y-5">BPM</span>
            </div>
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mb-1"
              style={{ background: riskConfig[risk].bg, color: riskConfig[risk].color }}
            >
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: riskConfig[risk].color }} />
              {riskConfig[risk].label}
            </div>
            <Waveform color="#10b981" />
          </motion.div>

          {/* Audio Playback Card */}
          {audioUrl && (
            <motion.div
              initial={{ opacity: 0, y: 40, x: 40 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              transition={{ delay: 0.3, type: "spring", damping: 20 }}
              className="backdrop-blur-[10px] bg-white/20 border border-white/40 p-3 sm:p-3.5 rounded-[22px] sm:rounded-[28px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] flex items-center gap-3"
            >
              <button
                onClick={onTogglePlayback}
                className="w-9 h-9 sm:w-10 sm:h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg active:scale-90 transition-transform flex-shrink-0"
              >
                {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-[#1e293b] font-bold text-xs sm:text-sm truncate">Heart Sound Recording</p>
                <p className="text-slate-500 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider">PCG Audio Captured</p>
              </div>
              <Volume2 className="text-emerald-500 opacity-50 flex-shrink-0" size={16} />
            </motion.div>
          )}

          {/* Bottom two cards */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-2 sm:mt-4">
            {/* Stress Level Card */}
            <motion.div
              initial={{ opacity: 0, y: 40, x: -40 }}
              animate={{ opacity: 1, y: -12, x: 0 }}
              transition={{ delay: 0.4, type: "spring", damping: 20 }}
              className="backdrop-blur-[10px] bg-white/10 border border-white/40 p-3 sm:p-4 rounded-[22px] sm:rounded-[28px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] flex flex-col justify-center min-h-[90px] sm:min-h-[110px]"
            >
              <p className="text-black text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.15em] mb-1 opacity-70">
                Stress Levels
              </p>
              <span className="text-lg sm:text-xl font-bold text-[#1e293b]">{stress}</span>
            </motion.div>

            {/* HRV Card */}
            <motion.div
              initial={{ opacity: 0, y: 60, x: 40 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              transition={{ delay: 0.6, type: "spring", damping: 20 }}
              className="backdrop-blur-[10px] bg-white/10 border border-white/40 p-3 sm:p-4 rounded-[22px] sm:rounded-[28px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] min-h-[90px] sm:min-h-[110px]"
            >
              <p className="text-black text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.15em] mb-1 opacity-70">
                Heart Rate Variability
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-bold text-[#1e293b]">{hrv}</span>
                <span className="text-xs sm:text-sm text-black font-light">ms</span>
              </div>
              <p className="text-[9px] sm:text-[10px] mt-1.5 font-semibold">
                Status: <span className="text-emerald-500">{hrv > 60 ? "Stable" : "Variable"}</span>
              </p>
            </motion.div>
          </div>

          {/* CTA Button */}
          <div className="mt-auto pt-4 pb-4 sm:pb-6">
            <button className="w-full bg-[#34d399] hover:bg-[#10b981] py-4 sm:py-5 rounded-[28px] sm:rounded-[32px] text-white font-bold text-lg sm:text-xl shadow-[0_15px_30px_rgba(52,211,153,0.3)] transition-all active:scale-[0.98]">
              Get full results
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}