import React, { useEffect, useRef, useState } from 'react';

interface AudioWaveformProps {
  buffer: ArrayBuffer;
  color?: string;
  backgroundColor?: string;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  buffer,
  color = 'rgba(255, 255, 255, 0.8)',
  backgroundColor = 'transparent'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!buffer || buffer.byteLength === 0 || !canvasRef.current) return;

    let isMounted = true;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    const decodeAndDraw = async () => {
      try {
        // We need to copy the buffer because decodeAudioData detaches it
        const bufferCopy = buffer.slice(0);

        // Use OfflineAudioContext to decode (safely without needing a real audio device)
        const audioContext = new (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext)(1, 44100, 44100);

        const audioBuffer = await audioContext.decodeAudioData(bufferCopy);

        if (!isMounted) return;

        drawWaveform(audioBuffer, canvas, ctx);
      } catch (e) {
        console.error("Failed to decode audio data for waveform:", e);
        if (isMounted) setError("Failed to load audio");
      }
    };

    decodeAndDraw();

    return () => {
      isMounted = false;
    };
  }, [buffer, color, backgroundColor]);

  const drawWaveform = (audioBuffer: AudioBuffer, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    const width = canvas.width;
    const height = canvas.height;
    const data = audioBuffer.getChannelData(0);
    const step = Math.ceil(data.length / width);
    const amp = height / 2;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = color;

    // Draw peaks
    for (let i = 0; i < width; i++) {
      let min = 1.0;
      let max = -1.0;

      for (let j = 0; j < step; j++) {
        const datum = data[(i * step) + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }

      // Prevent flat line for silence if there's noise, but usually silence is 0
      // Draw rect from min to max centered around amp
      const y = (1 + min) * amp;
      const h = Math.max(1, (max - min) * amp);
      ctx.fillRect(i, y, 1, h);
    }
  };

  if (error) {
      return <div style={{ color: 'red', fontSize: '10px', padding: '2px', overflow: 'hidden' }}>{error}</div>;
  }

  return (
    <canvas
      ref={canvasRef}
      width={1000}
      height={100}
      style={{
        width: '100%',
        height: '100%',
        display: 'block'
      }}
    />
  );
};
