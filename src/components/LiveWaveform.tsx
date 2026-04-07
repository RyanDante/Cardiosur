import { useEffect, useRef } from 'react';
import { HeartAudioProcessor } from '../hooks/useHeartAudio';

interface LiveWaveformProps {
  processor: HeartAudioProcessor | null;
  color?: string;
  width?: number;
  height?: number;
}

export default function LiveWaveform({ 
  processor, 
  color = "#10b981", 
  width = 400, 
  height = 100 
}: LiveWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!processor || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    const draw = () => {
      const waveformData = processor.getWaveformData();
      if (!waveformData) {
        animationRef.current = requestAnimationFrame(draw);
        return;
      }

      // Clear canvas
      ctx.fillStyle = 'transparent';
      ctx.fillRect(0, 0, width, height);

      // Draw waveform
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      const sliceWidth = width / waveformData.length;
      let x = 0;

      for (let i = 0; i < waveformData.length; i++) {
        const v = waveformData[i] * 0.5; // Scale down amplitude
        const y = (v * height / 2) + height / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.stroke();
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [processor, color, width, height]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-24 my-8 rounded-lg"
      style={{ maxWidth: `${width}px`, height: `${height}px` }}
    />
  );
}