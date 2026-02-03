import React, { useRef, useState, useEffect } from 'react';

interface AudioWaveformProps {
  buffer: ArrayBuffer;
  width: number;
  height: number;
  color?: string;
  className?: string;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  buffer,
  width,
  height,
  color = '#4CAF50',
  className
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);

  useEffect(() => {
    if (!buffer) return;

    const decode = async () => {
        try {
            // Need a new context for decoding
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContextClass) {
                console.warn("Web Audio API not supported");
                return;
            }
            const ctx = new AudioContextClass();
            // Clone buffer because decodeAudioData detaches it
            const bufferCopy = buffer.slice(0);
            const decoded = await ctx.decodeAudioData(bufferCopy);
            setAudioBuffer(decoded);
        } catch (e) {
            console.error("Failed to decode audio data", e);
        }
    };

    decode();
  }, [buffer]);

  useEffect(() => {
    if (!audioBuffer || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    const data = audioBuffer.getChannelData(0); // Use first channel
    const step = Math.ceil(data.length / width);
    const amp = height / 2;

    ctx.fillStyle = color;

    // Optimizing drawing loop
    for (let i = 0; i < width; i++) {
        let min = 1.0;
        let max = -1.0;

        // Sample the chunk
        for (let j = 0; j < step; j++) {
            const index = (i * step) + j;
            if (index < data.length) {
                const datum = data[index];
                if (datum < min) min = datum;
                if (datum > max) max = datum;
            }
        }

        // If no data found in chunk (should not happen if math is right)
        if (min > max) {
            min = 0;
            max = 0;
        }

        // Draw vertical bar
        const y = (1 + min) * amp;
        const h = Math.max(1, (max - min) * amp);

        ctx.fillRect(i, y, 1, h);
    }

  }, [audioBuffer, width, height, color]);

  return (
    <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className={className}
        style={{ width: `${width}px`, height: `${height}px`, display: 'block' }}
    />
  );
};
