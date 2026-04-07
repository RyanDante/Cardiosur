/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { Play, Pause, Volume2, ArrowLeft } from "lucide-react";

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
  prediction,
  isPredicting = false,
}: ResultsPageProps) {
  console.log("ResultsPage rendering with:", { bpm, stress, hrv, risk, audioUrl, prediction, isPredicting });
  
  // Fallback for debugging
  if (!bpm && !prediction) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-red-100 p-8">
        <h1 className="text-2xl font-bold text-red-800 mb-4">Debug: No Data</h1>
        <p className="text-red-600">BPM: {bpm}, Prediction: {prediction ? "exists" : "null"}</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-red-500 text-white rounded">
          Go Back
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
      <div className="relative z-10 flex-1 flex flex-col w-full h-full">
        <Header title="Quick Results" onBack={onBack} />

        <div className="flex-1 px-6 flex flex-col gap-6 py-6 overflow-y-auto pb-12">
          {/* PCG Result Card - comes from above */}
          <motion.div
            initial={{ opacity: 0, y: -60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, type: "spring", damping: 20 }}
            className="bg-white rounded-[32px] shadow-lg p-6"
          >
            <p className="text-slate-700 text-[10px] font-bold uppercase tracking-[0.2em] mb-4 opacity-70">
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
              <div className="w-full h-32 bg-slate-50 rounded-lg p-4 flex items-center justify-center border border-slate-200">
                <p className="text-slate-500 text-xs text-center">Graph Data Available</p>
              </div>
            ) : (
              <Waveform color="#10b981" />
            )}
          </motion.div>

          {/* Audio Playback Card - comes from below and right */}
          {audioUrl && (
            <motion.div
              initial={{ opacity: 0, y: 60, x: 40 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              transition={{ delay: 0.3, type: "spring", damping: 20 }}
              className="bg-white rounded-[32px] shadow-lg p-4 flex items-center gap-4"
            >
              <button 
                onClick={onTogglePlayback}
                className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg active:scale-90 transition-transform"
              >
                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
              </button>
              <div className="flex-1">
                <p className="text-slate-900 font-bold text-sm">Heart Sound Recording</p>
                <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">PCG Audio Captured</p>
              </div>
              <Volume2 className="text-emerald-500 opacity-50" size={20} />
            </motion.div>
          )}

          <div className="grid grid-cols-2 gap-6 mt-6">
            {/* Backend BPM Card - comes from below and left */}
            <motion.div
              initial={{ opacity: 0, y: 60, x: -40 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              transition={{ delay: 0.4, type: "spring", damping: 20 }}
              className="bg-white rounded-[32px] shadow-lg p-6 flex flex-col justify-center min-h-[140px]"
            >
              <p className="text-slate-700 text-[10px] font-bold uppercase tracking-[0.15em] mb-2 opacity-70">
                Backend BPM
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-slate-900">{prediction?.bpm || "--"}</span>
                <span className="text-xl text-slate-700 font-light">BPM</span>
              </div>
            </motion.div>

            {/* Confidence Card - comes from below and right */}
            <motion.div
              initial={{ opacity: 0, y: 60, x: 40 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              transition={{ delay: 0.6, type: "spring", damping: 20 }}
              className="bg-white rounded-[32px] shadow-lg p-6 min-h-[140px]"
            >
              <p className="text-slate-700 text-[10px] font-bold uppercase tracking-[0.15em] mb-2 opacity-70">
                Confidence
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-emerald-600">{prediction?.confidence ? (prediction.confidence * 100).toFixed(0) : "--"}</span>
                <span className="text-xl text-slate-700 font-light">%</span>
              </div>
              {prediction?.confidence && (
                <div className="mt-3 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-emerald-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${prediction.confidence * 100}%` }}
                    transition={{ duration: 1 }}
                  />
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