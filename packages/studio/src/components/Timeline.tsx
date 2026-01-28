import React, { useRef, useState, useEffect } from 'react';
import { useStudio } from '../context/StudioContext';
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut';
import { CaptionCue } from '@helios-project/core';
import './Timeline.css';

export const Timeline: React.FC = () => {
  const {
    controller,
    playerState,
    inPoint,
    setInPoint,
    outPoint,
    setOutPoint
  } = useStudio();

  const { currentFrame, duration, fps } = playerState;
  const totalFrames = duration * fps || 100; // Default to 100 to avoid div by zero
  const captions = playerState.captions || [];
  const markers = playerState.markers || [];

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<'playhead' | 'in' | 'out' | null>(null);
  const [zoom, setZoom] = useState(0);

  const pixelsPerFrame = zoom === 0 ? 0 : 0.5 * Math.pow(1.04, zoom);

  const formatTime = (frame: number, fps: number) => {
    if (!fps) return "0:00.00";
    const totalSeconds = frame / fps;
    const mins = Math.floor(totalSeconds / 60);
    const secs = (totalSeconds % 60).toFixed(2);
    return `${mins}:${secs.padStart(5, '0')}`;
  };

  const getFrameFromEvent = (e: MouseEvent | React.MouseEvent) => {
    if (!contentRef.current) return 0;
    const rect = contentRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = x / rect.width;
    return Math.round(percentage * totalFrames);
  };

  const handleMouseDown = (e: React.MouseEvent, type: 'playhead' | 'in' | 'out') => {
    e.preventDefault();
    setIsDragging(type);

    // If clicking track (playhead), seek immediately
    if (type === 'playhead' && controller) {
      const frame = getFrameFromEvent(e);
      controller.seek(frame);
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const frame = getFrameFromEvent(e);

      if (isDragging === 'playhead') {
        if (controller) controller.seek(frame);
      } else if (isDragging === 'in') {
        // Clamp inPoint: 0 <= inPoint < outPoint
        const newIn = Math.max(0, Math.min(frame, outPoint - 1));
        setInPoint(newIn);
      } else if (isDragging === 'out') {
        // Clamp outPoint: inPoint < outPoint <= totalFrames
        const newOut = Math.max(inPoint + 1, Math.min(frame, totalFrames));
        setOutPoint(newOut);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, controller, totalFrames, inPoint, outPoint, setInPoint, setOutPoint]);

  // Keyboard Shortcuts
  useKeyboardShortcut('i', () => {
    // Clamp
    const newIn = Math.max(0, Math.min(Math.round(currentFrame), outPoint - 1));
    setInPoint(newIn);
  }, { ignoreInput: true });

  useKeyboardShortcut('o', () => {
    // Clamp
    const newOut = Math.max(inPoint + 1, Math.min(Math.round(currentFrame), totalFrames));
    setOutPoint(newOut);
  }, { ignoreInput: true });

  const getPercent = (frame: number) => {
    const p = (frame / totalFrames) * 100;
    return Math.max(0, Math.min(100, p));
  };

  return (
    <div className="timeline-container">
      <div className="timeline-header">
        <div className="timeline-header-left">
          <span>{formatTime(currentFrame, fps)} / {formatTime(totalFrames, fps)}</span>
          <div className="timeline-zoom-control">
            <span className="timeline-zoom-label">Fit</span>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="timeline-zoom-slider"
              title="Zoom Timeline"
            />
            <span className="timeline-zoom-label">Zoom</span>
          </div>
        </div>
        <div className="timeline-header-right">
          <span>In: {inPoint}</span>
          <span>Out: {outPoint}</span>
          <span>Fr: {Math.round(currentFrame)}</span>
        </div>
      </div>

      <div
        className="timeline-track-area"
        ref={scrollContainerRef}
      >
        <div
            className="timeline-content"
            ref={contentRef}
            style={{
                width: zoom === 0 ? '100%' : `${totalFrames * pixelsPerFrame}px`
            }}
            onMouseDown={(e) => handleMouseDown(e, 'playhead')}
        >
            <div className="timeline-track" />

            {/* Caption Markers */}
            {captions.map((cue, i) => {
                const startFrame = (cue.startTime / 1000) * fps;
                const endFrame = (cue.endTime / 1000) * fps;
                const durationFrame = endFrame - startFrame;

                return (
                    <div
                        key={i}
                        className="timeline-caption-marker"
                        style={{
                            left: `${getPercent(startFrame)}%`,
                            width: `${Math.max(0.5, (durationFrame / totalFrames) * 100)}%`
                        }}
                        title={cue.text}
                    />
                );
            })}

            {/* Composition Markers */}
            {markers.map((marker) => (
              <div
                key={marker.id}
                className="timeline-marker-comp"
                style={{
                  left: `${getPercent(marker.time * fps)}%`,
                  backgroundColor: marker.color || '#ff9800'
                }}
                title={`${marker.label} (${marker.id})`}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  if (controller) controller.seek(marker.time * fps);
                }}
              />
            ))}

            {/* Render Region */}
            <div
            className="timeline-region"
            style={{
                left: `${getPercent(inPoint)}%`,
                width: `${getPercent(outPoint - inPoint)}%`
            }}
            />

            {/* In Marker */}
            <div
            className="timeline-marker in"
            style={{ left: `${getPercent(inPoint)}%` }}
            onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'in'); }}
            title="In Point (I)"
            />

            {/* Out Marker */}
            <div
            className="timeline-marker out"
            style={{ left: `${getPercent(outPoint)}%` }}
            onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'out'); }}
            title="Out Point (O)"
            />

            {/* Playhead */}
            <div
            className="timeline-playhead"
            style={{ left: `${getPercent(currentFrame)}%` }}
            />
        </div>
      </div>
    </div>
  );
};
