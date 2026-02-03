import React, { useRef, useEffect } from 'react';
import type { AudioTrackMetadata } from '@helios-project/core';
import { useAudioWaveform } from '../hooks/useAudioWaveform';

interface TimelineAudioTrackProps {
  track: AudioTrackMetadata;
  fps: number;
  height: number;
  top: number;
  totalFrames: number;
  containerWidth: number;
  getPercent: (frame: number) => number;
}

export const TimelineAudioTrack: React.FC<TimelineAudioTrackProps> = ({
  track,
  fps,
  height,
  top,
  totalFrames,
  containerWidth,
  getPercent
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Use higher resolution (200 peaks/sec) for better detail on zoom
  const { peaks } = useAudioWaveform(track.src, 200);

  const startFrame = track.startTime * fps;
  const durationFrame = track.duration * fps;

  // Calculate positioning
  const leftPercent = getPercent(startFrame);
  const widthPercent = getPercent(durationFrame);

  // Calculate exact pixel width for the canvas
  const trackWidthPx = (durationFrame / totalFrames) * containerWidth;

  useEffect(() => {
    // If no peaks yet, or canvas not ready, or width invalid, skip
    if (!peaks || !canvasRef.current || trackWidthPx <= 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions to match pixel size
    canvas.width = trackWidthPx;
    canvas.height = height;

    // Clear
    ctx.clearRect(0, 0, trackWidthPx, height);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; // Dark semi-transparent

    // Draw waveform
    const peaksPerPixel = peaks.length / trackWidthPx;
    const midY = height / 2;

    for (let x = 0; x < trackWidthPx; x++) {
        // Determine the range of peaks that map to this pixel
        const startPeakIndex = Math.floor(x * peaksPerPixel);
        const endPeakIndex = Math.floor((x + 1) * peaksPerPixel);

        // Find max amplitude in this range
        let max = 0;
        // Ensure we check at least one peak
        const actualEnd = Math.max(startPeakIndex + 1, endPeakIndex);

        for (let i = startPeakIndex; i < actualEnd; i++) {
            if (i < peaks.length) {
                const val = peaks[i];
                if (val > max) max = val;
            }
        }

        // Draw centered bar
        // Scale max (0-1) to height. Ensure at least 1px height.
        const barHeight = Math.max(1, max * height);
        ctx.fillRect(x, midY - barHeight / 2, 1, barHeight);
    }

  }, [peaks, trackWidthPx, height]);

  return (
    <div
      className="timeline-audio-track"
      style={{
        left: `${leftPercent}%`,
        width: `${widthPercent}%`,
        top: `${top}px`,
        height: `${height}px`,
        // Note: 'position: absolute' is handled by timeline-audio-track class or should be inline if class is reused
      }}
      title={`Audio: ${track.id}`}
    >
        <canvas
            ref={canvasRef}
            style={{
                width: '100%',
                height: '100%',
                display: 'block'
            }}
        />
    </div>
  );
};
