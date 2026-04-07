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
  prediction?: {
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
  } | null;
  isPredicting?: boolean;
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
  prediction,
  isPredicting = false,
}: ResultsPageProps) {
  console.log("ResultsPage rendering with:", { bpm, stress, hrv, risk, audioUrl, prediction, isPredicting });
  
  // Fallback for debugging - show when no data is available
  if (!bpm && !prediction) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-red-100 p-8">
        <h1 className="text-2xl font-bold text-red-800 mb-4">No Recording Data</h1>
        <p className="text-red-600 text-center mb-2">
          The recording didn't capture any heart sound data.
        </p>
        <p className="text-red-500 text-sm text-center mb-4">
          This usually means the microphone didn't work properly.
        </p>
        <div className="bg-white/50 p-4 rounded-lg mb-4 text-xs text-red-700">
          <p><strong>Troubleshooting:</strong></p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Make sure you allowed microphone access</li>
            <li>Try using Chrome browser</li>
            <li>Check browser permissions in settings</li>
            <li>Make sure you're using HTTPS or localhost</li>
          </ul>
        </div>
        <button onClick={onBack} className="px-6 py-3 bg-red-500 text-white rounded-lg font-bold">
          Try Again
        </button>
      </div>
    );
  }
  
  return (
    <motion.div
      key="results"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col bg-gradient-to-b from-emerald-50 to-blue-50 relative overflow-hidden"
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
              Heart Sound Analysis
            </p>
            
            {/* Result Badge */}
            {prediction?.result && (
              <div className="mb-4">
                <div
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold uppercase tracking-widest mb-4 ${
                    prediction.result?.toLowerCase() === "abnormal"
                      ? "bg-red-100/30 text-red-600"
                      : "bg-emerald-100/30 text-emerald-600"
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      background:
                        prediction.result?.toLowerCase() === "abnormal"
                          ? "#dc2626"
                          : "#059669",
                    }}
                  />
                  {prediction.result}
                </div>
              </div>
            )}
            
            {/* Backend Graph / Visualization */}
            {prediction?.graph ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mb-1">
                <p className="w-1.5 h-1.5 rounded-full inline-block">Graph Data Available</p>
              </div>
            ) : (
              <Waveform color="#10b981" />
            )}
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
            {/* Heart Rate Card */}
            <motion.div
              initial={{ opacity: 0, y: 40, x: -40 }}
              animate={{ opacity: 1, y: -12, x: 0 }}
              transition={{ delay: 0.4, type: "spring", damping: 20 }}
              className="backdrop-blur-[10px] bg-white/10 border border-white/40 p-3 sm:p-4 rounded-[22px] sm:rounded-[28px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] flex flex-col justify-center min-h-[90px] sm:min-h-[110px]"
            >
              <p className="text-black text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.15em] mb-1 opacity-70">
                Heart Rate
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-lg sm:text-xl font-bold text-[#1e293b]">{bpm || "--"}</span>
                <span className="text-xl text-slate-700 font-light">BPM</span>
              </div>
              {risk && (
                <div className="mt-2">
                  <span 
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-bold uppercase tracking-wider"
                    style={{
                      background: riskConfig[risk].bg,
                      color: riskConfig[risk].color,
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: riskConfig[risk].color }} />
                    {riskConfig[risk].label}
                  </span>
                </div>
              )}
            </motion.div>

            {/* HRV & Stress Card */}
            <motion.div
              initial={{ opacity: 0, y: 60, x: 40 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              transition={{ delay: 0.6, type: "spring", damping: 20 }}
              className="backdrop-blur-[10px] bg-white/10 border border-white/40 p-3 sm:p-4 rounded-[22px] sm:rounded-[28px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] min-h-[90px] sm:min-h-[110px]"
            >
              <p className="text-black text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.15em] mb-1 opacity-70">
                HRV
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-bold text-[#1e293b]">{hrv || "--"}</span>
                <span className="text-xs sm:text-sm text-black font-light">ms</span>
              </div>
              {stress && stress !== "UNKNOWN" && (
                <div className="mt-2">
                  <span 
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-bold uppercase tracking-wider"
                    style={{
                      background: stress === "HIGH" ? "#fef2f2" : stress === "MODERATE" ? "#fffbeb" : "#f0fdf4",
                      color: stress === "HIGH" ? "#ef4444" : stress === "MODERATE" ? "#f59e0b" : "#22c55e",
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ 
                      background: stress === "HIGH" ? "#ef4444" : stress === "MODERATE" ? "#f59e0b" : "#22c55e" 
                    }} />
                    Stress: {stress}
                  </span>
                </div>
              )}
            </motion.div>
          </div>

          {/* ML Prediction Card */}
          {isPredicting && (
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, type: "spring", damping: 20 }}
              className="bg-white rounded-[32px] shadow-lg p-6 mt-6 animate-pulse"
            >
              <p className="text-slate-700 text-[10px] font-bold uppercase tracking-[0.15em] mb-4 opacity-70">
                Analyzing...
              </p>
              <div className="space-y-2">
                <div className="h-4 bg-slate-200 rounded-full w-3/4"></div>
                <div className="h-4 bg-slate-200 rounded-full w-1/2"></div>
              </div>
            </motion.div>
          )}

          {prediction && !isPredicting && (
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, type: "spring", damping: 20 }}
              className="bg-white rounded-[32px] shadow-lg p-6 mt-6"
            >
              <p className="text-slate-700 text-[10px] font-bold uppercase tracking-[0.15em] mb-4 opacity-70">
                AI Diagnosis
              </p>
              
              {/* Result Label */}
              {(prediction.result || prediction.predicted_label) && (
                <div className="mb-4">
                  <div
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold uppercase tracking-widest mb-3 ${
                      (prediction.result?.toLowerCase() === "abnormal" || prediction.predicted_label?.toLowerCase().includes("abnormal"))
                        ? "bg-red-100/30 text-red-600"
                        : "bg-emerald-100/30 text-emerald-600"
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        background:
                          (prediction.result?.toLowerCase() === "abnormal" || prediction.predicted_label?.toLowerCase().includes("abnormal"))
                            ? "#dc2626"
                            : "#059669",
                      }}
                    />
                    {prediction.result || prediction.predicted_label}
                  </div>
                </div>
              )}

              {/* Confidence Score */}
              {prediction.confidence !== undefined && (
                <div className="mb-4">
                  <p className="text-slate-700 text-[10px] uppercase tracking-wider opacity-70 mb-1">Confidence</p>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-emerald-600">{(prediction.confidence * 100).toFixed(1)}%</span>
                    <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-emerald-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${prediction.confidence * 100}%` }}
                        transition={{ duration: 1 }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Model BPM (if different from local) */}
              {prediction.bpm !== undefined && (
                <div className="mb-3 p-3 bg-slate-50 rounded-lg">
                  <p className="text-slate-700 text-[10px] uppercase tracking-wider opacity-70">Model BPM</p>
                  <p className="text-lg font-bold text-slate-900">{prediction.bpm}</p>
                </div>
              )}

              {/* Chunks Analyzed */}
              {prediction.chunks_analyzed !== undefined && (
                <div className="mb-3 p-3 bg-slate-50 rounded-lg">
                  <p className="text-slate-700 text-[10px] uppercase tracking-wider opacity-70">Analysis</p>
                  <p className="text-sm text-slate-600">{prediction.chunks_analyzed} audio chunk{prediction.chunks_analyzed !== 1 ? "s" : ""} analyzed</p>
                </div>
              )}

              {/* Raw Score */}
              {prediction.raw_score !== undefined && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-slate-700 text-[10px] uppercase tracking-wider opacity-70">Raw Score</p>
                  <p className="text-sm text-slate-600">{(prediction.raw_score * 100).toFixed(2)}%</p>
                </div>
              )}

              {/* Class Probabilities */}
              {prediction.class_probabilities && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <p className="text-slate-700 text-[10px] uppercase tracking-wider opacity-70 mb-2">Probabilities</p>
                  <div className="space-y-1.5">
                    {Object.entries(prediction.class_probabilities)
                      .sort((a, b) => (b[1] as number) - (a[1] as number))
                      .slice(0, 3)
                      .map(([label, prob]) => (
                        <div key={label} className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-600 capitalize">{label}</span>
                          <span className="text-slate-800 font-semibold">{((prob as number) * 100).toFixed(0)}%</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          <div className="mt-auto pb-8">
            <button className="w-full bg-[#34d399] hover:bg-[#10b981] py-5 rounded-[32px] text-white font-bold text-xl shadow-[0_15px_30px_rgba(52,211,153,0.3)] transition-all active:scale-[0.98] disabled:opacity-50" disabled={isPredicting}>
              {isPredicting ? "Analyzing..." : "Get full results"}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}