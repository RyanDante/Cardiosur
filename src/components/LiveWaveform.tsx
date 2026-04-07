import { useRef, useEffect, useState } from "react";

interface LiveWaveformProps {
  analyser: AnalyserNode | null;
}

export default function LiveWaveform({ analyser }: LiveWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [height, setHeight] = useState(280);

  // Responsive height
  useEffect(() => {
    const updateHeight = () => {
      const w = window.innerWidth;
      setHeight(w < 380 ? 180 : w < 420 ? 220 : 280);
    };
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.fftSize;
    const dataArray = new Float32Array(bufferLength);

    // History buffer for scrolling waveform effect
    const historyLength = 300;
    const history: number[] = new Array(historyLength).fill(0);

    const draw = () => {
      animRef.current = requestAnimationFrame(draw);

      analyser.getFloatTimeDomainData(dataArray);

      // Get RMS of current frame
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / bufferLength);

      // Push new value, shift history left
      history.push(rms);
      if (history.length > historyLength) history.shift();

      // Canvas dimensions (handle high DPI)
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      const w = rect.width;
      const h = rect.height;
      const midY = h / 2;

      // Clear
      ctx.clearRect(0, 0, w, h);

      // Draw center line
      ctx.strokeStyle = "rgba(16, 185, 129, 0.15)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(w, midY);
      ctx.stroke();

      // Draw waveform — left to right like a normal EKG
      const sliceWidth = w / historyLength;

      // Glow effect
      ctx.shadowColor = "#10b981";
      ctx.shadowBlur = 12;
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 2.5;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();

      for (let i = 0; i < history.length; i++) {
        const x = (history.length - 1 - i) * sliceWidth;
        // Scale RMS to visible amplitude (multiply to make it visible)
        const amplitude = history[i] * h * 8;
        // Create a waveform-like pattern using sin modulation
        const freq = (i * 0.15) + (history[i] * 50);
        const y = midY + Math.sin(freq) * amplitude;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          // Smooth curve
          const prevIdx = i - 1;
          const prevX = (history.length - 1 - prevIdx) * sliceWidth;
          const prevAmplitude = history[prevIdx] * h * 8;
          const prevFreq = (prevIdx * 0.15) + (history[prevIdx] * 50);
          const prevY = midY + Math.sin(prevFreq) * prevAmplitude;
          const cpX = (prevX + x) / 2;
          ctx.bezierCurveTo(cpX, prevY, cpX, y, x, y);
        }
      }
      ctx.stroke();

      // Draw a second, fainter trace for depth
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(16, 185, 129, 0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();

      for (let i = 0; i < history.length; i++) {
        const x = (history.length - 1 - i) * sliceWidth;
        const amplitude = history[i] * h * 5;
        const freq = (i * 0.2) + (history[i] * 30);
        const y = midY + Math.sin(freq + 1.5) * amplitude;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          const prevIdx = i - 1;
          const prevX = (history.length - 1 - prevIdx) * sliceWidth;
          const prevAmplitude = history[prevIdx] * h * 5;
          const prevFreq = (prevIdx * 0.2) + (history[prevIdx] * 30);
          const prevY = midY + Math.sin(prevFreq + 1.5) * prevAmplitude;
          const cpX = (prevX + x) / 2;
          ctx.bezierCurveTo(cpX, prevY, cpX, y, x, y);
        }
      }
      ctx.stroke();
    };

    draw();

    return () => {
      cancelAnimationFrame(animRef.current);
    };
  }, [analyser]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-2xl"
      style={{ height: `${height}px`, background: "rgba(15, 23, 42, 0.03)" }}
    />
  );
}
