import React, { useEffect, useRef, useState } from 'react';

interface AudioWaveformProps {
  buffer: ArrayBuffer;
  color?: string;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({ buffer, color = '#2196F3' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);

  // Decode audio data
  useEffect(() => {
    let cancelled = false;

    const decode = async () => {
      if (!buffer || buffer.byteLength === 0) return;

      try {
        // Check for OfflineAudioContext support (browser vs node)
        const AudioContextClass = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
        if (!AudioContextClass) return;

        // We use OfflineAudioContext to decode without playing
        // Sample rate doesn't strictly matter for decoding, but standard 44100 is fine
        const ctx = new AudioContextClass(1, 1, 44100);

        // We need to copy the buffer because decodeAudioData detaches it
        const bufferCopy = buffer.slice(0);

        // Use promise-based syntax or callback based depending on browser,
        // but modern browsers return promise.
        const decoded = await ctx.decodeAudioData(bufferCopy);

        if (!cancelled) {
          setAudioBuffer(decoded);
        }
      } catch (e) {
        console.error("Failed to decode audio data for waveform", e);
      }
    };

    decode();

    return () => {
      cancelled = true;
    };
  }, [buffer]);

  // Draw function
  const draw = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !audioBuffer) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    if (width === 0 || height === 0) return;

    // Handle high DPI
    const dpr = window.devicePixelRatio || 1;

    // Only resize if needed to avoid flickering/clearing
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset transform to handle dpr correctly on re-draws
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = color;

    // Draw waveform
    const channelData = audioBuffer.getChannelData(0); // Use first channel
    // We want to map the entire buffer to the width of the canvas
    // BUT the track might be zoomed or cropped in the timeline?
    // Wait, the parent container in Timeline.tsx is set to:
    // width: `${getPercent(durationFrame)}%`
    // So the container IS the full duration of the audio clip.
    // So drawing the full buffer into the full width is correct.

    const step = Math.ceil(channelData.length / width);
    const amp = height / 2;

    for (let i = 0; i < width; i++) {
      let min = 1.0;
      let max = -1.0;

      for (let j = 0; j < step; j++) {
        const datum = channelData[(i * step) + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }

      // Prevent flat line if silence/error
      if (min === 1.0 && max === -1.0) {
          min = 0; max = 0;
      }

      ctx.fillRect(i, Math.max(0, (1 + min) * amp), 1, Math.max(1, (max - min) * amp));
    }
  };

  // Resize Observer
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver(() => {
      window.requestAnimationFrame(draw);
    });

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [audioBuffer, color]); // Re-bind if buffer changes

  // Initial draw when buffer is ready
  useEffect(() => {
    if (audioBuffer) {
      window.requestAnimationFrame(draw);
    }
  }, [audioBuffer, color]);

  return (
    <div
      ref={containerRef}
      className="audio-waveform"
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none', // Let clicks pass through to track
        opacity: 0.8
      }}
    >
      <canvas ref={canvasRef} />
    </div>
  );
};
