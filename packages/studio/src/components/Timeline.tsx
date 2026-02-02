import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useStudio } from '../context/StudioContext';
import { usePersistentState } from '../hooks/usePersistentState';
import { framesToTimecode } from '@helios-project/core';
import { TimecodeDisplay } from './Controls/TimecodeDisplay';
import './Timeline.css';

interface Tick {
  frame: number;
  label: string;
}

const SNAP_THRESHOLD_PX = 10;

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
  const totalFrames = duration * fps || 100;
  const captions = playerState.captions || [];
  const markers = playerState.markers || [];
  const audioTracks = playerState.availableAudioTracks || [];

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [isDragging, setIsDragging] = useState<'playhead' | 'in' | 'out' | null>(null);
  const [zoom, setZoom] = usePersistentState('timeline-zoom', 0);
  const [hoverFrame, setHoverFrame] = useState<number | null>(null);
  const [contentWidth, setContentWidth] = useState(0);

  // Measure content width for Fit mode
  useEffect(() => {
    if (!contentRef.current) return;
    const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
            setContentWidth(entry.contentRect.width);
        }
    });
    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, []);

  // Calculate pixels per frame
  const pixelsPerFrame = useMemo(() => {
    if (zoom === 0) {
        // Fit mode: Width / Total Frames
        if (contentWidth > 0 && totalFrames > 0) {
            return contentWidth / totalFrames;
        }
        return 0; // fallback
    } else {
        return 0.5 * Math.pow(1.04, zoom);
    }
  }, [zoom, contentWidth, totalFrames]);

  const effectiveWidth = zoom === 0 ? '100%' : `${totalFrames * pixelsPerFrame}px`;

  // Calculate Ticks
  const ticks = useMemo(() => {
    if (!fps || totalFrames <= 0) return [];

    // Use estimated width if zoom > 0, else contentWidth
    const width = zoom === 0 ? contentWidth : totalFrames * pixelsPerFrame;
    if (width <= 0) return [];

    const minTickSpacingPx = 80;
    const maxTicks = Math.floor(width / minTickSpacingPx);
    if (maxTicks <= 0) return [];

    const intervals = [1, 2, 5, 10, 15, 30, 60, 300, 600, 1800, 3600];
    let intervalFrames = fps; // 1 second

    // Find best interval
    for (const secs of intervals) {
        const frames = secs * fps;
        const tickCount = totalFrames / frames;
        if (tickCount <= maxTicks) {
            intervalFrames = frames;
            break;
        }
    }

    // Sub-second handling for high zoom
    if (totalFrames / intervalFrames < 2 && width > 1000) {
        if (totalFrames / (fps/2) <= maxTicks) intervalFrames = fps / 2;
        else if (totalFrames / (fps/10) <= maxTicks) intervalFrames = fps / 10;
        else if (totalFrames <= maxTicks) intervalFrames = 1;
    }

    const res: Tick[] = [];
    for (let f = 0; f <= totalFrames; f += intervalFrames) {
        // Avoid adding tick at exact end if it overlaps with others heavily? No, keep simple.
        res.push({
            frame: f,
            label: framesToTimecode(f, fps)
        });
    }
    return res;

  }, [fps, totalFrames, pixelsPerFrame, zoom, contentWidth]);

  const formatTime = (frame: number, fps: number) => {
    if (!fps || fps <= 0) return "00:00:00:00";
    try {
      return framesToTimecode(frame, fps);
    } catch (e) {
      return "00:00:00:00";
    }
  };

  const getFrameFromEvent = (e: MouseEvent | React.MouseEvent) => {
    if (!contentRef.current) return 0;
    const rect = contentRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = x / rect.width;
    return Math.round(percentage * totalFrames);
  };

  const getSnapFrame = (rawFrame: number) => {
      // If pixelsPerFrame is very small (zoomed out), threshold covers many frames.
      // If pixelsPerFrame is large (zoomed in), threshold covers few frames.
      const ppf = pixelsPerFrame || (contentWidth / totalFrames);
      if (ppf <= 0) return rawFrame;

      const thresholdFrames = SNAP_THRESHOLD_PX / ppf;

      const snapPoints = [
          0,
          totalFrames,
          inPoint,
          outPoint,
          ...markers.map(m => m.time * fps),
          ...captions.map(c => (c.startTime / 1000) * fps),
          ...captions.map(c => (c.endTime / 1000) * fps)
      ];

      let closest = rawFrame;
      let minDist = Infinity;

      for (const p of snapPoints) {
          const dist = Math.abs(rawFrame - p);
          if (dist < minDist) {
              minDist = dist;
              closest = p;
          }
      }

      if (minDist <= thresholdFrames) {
          return Math.round(closest);
      }

      return rawFrame;
  };

  const handleMouseDown = (e: React.MouseEvent, type: 'playhead' | 'in' | 'out') => {
    e.preventDefault();
    setIsDragging(type);

    if (type === 'playhead' && controller) {
      // Initial click snaps too? Yes.
      const rawFrame = getFrameFromEvent(e);
      const frame = e.shiftKey ? rawFrame : getSnapFrame(rawFrame);
      controller.seek(frame);
    }
  };

  // Track mouse over track area for Hover Guide
  const handleTrackMouseMove = (e: React.MouseEvent) => {
      // Only update hover if NOT dragging (dragging handled globally)
      if (!isDragging) {
          setHoverFrame(getFrameFromEvent(e));
      }
  };

  const handleTrackMouseLeave = () => {
      if (!isDragging) {
          setHoverFrame(null);
      }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rawFrame = getFrameFromEvent(e);
      const frame = e.shiftKey ? rawFrame : getSnapFrame(rawFrame);

      if (isDragging === 'playhead') {
        if (controller) controller.seek(frame);
      } else if (isDragging === 'in') {
        // Clamp inPoint: 0 <= inPoint < outPoint
        // Also ensure snap doesn't violate clamp
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
  }, [isDragging, controller, totalFrames, inPoint, outPoint, setInPoint, setOutPoint, pixelsPerFrame, contentWidth, markers, captions]);

  const getPercent = (frame: number) => {
    const p = (frame / totalFrames) * 100;
    return Math.max(0, Math.min(100, p));
  };

  return (
    <div className="timeline-container">
      <div className="timeline-header">
        <div className="timeline-header-left">
          <TimecodeDisplay
            frame={currentFrame}
            fps={fps}
            totalFrames={totalFrames}
            onChange={(f) => controller?.seek(f)}
          />
          <span style={{ margin: '0 4px', color: '#666' }}>/</span>
          <span>{formatTime(totalFrames, fps)}</span>
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
            style={{ width: effectiveWidth }}
            onMouseDown={(e) => handleMouseDown(e, 'playhead')}
            onMouseMove={handleTrackMouseMove}
            onMouseLeave={handleTrackMouseLeave}
        >
            {/* Ruler Layer */}
            <div className="timeline-ruler">
                {ticks.map(tick => (
                    <div
                        key={tick.frame}
                        className="timeline-tick"
                        style={{ left: `${getPercent(tick.frame)}%` }}
                    >
                        <div className="timeline-tick-line" />
                        <div className="timeline-tick-label">{tick.label}</div>
                    </div>
                ))}
            </div>

            <div className="timeline-track" />

            {/* Audio Tracks */}
            {audioTracks.map((track) => {
              const startFrame = track.startTime * fps;
              const durationFrame = track.duration * fps;

              return (
                <div
                  key={track.id}
                  className="timeline-audio-track"
                  style={{
                    left: `${getPercent(startFrame)}%`,
                    width: `${getPercent(durationFrame)}%`
                  }}
                  title={`Audio: ${track.id}`}
                />
              );
            })}

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
                  // Snap handled by global logic?
                  // If we click a marker, we usually want to seek to IT.
                  // But the click propagates to track.
                  // Existing code stopped propagation and sought.
                  // We should keep that behavior.
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

            {/* Hover Guide */}
            {hoverFrame !== null && (
                <div
                    className="timeline-hover-guide"
                    style={{ left: `${getPercent(hoverFrame)}%` }}
                >
                    <div className="timeline-hover-tooltip">
                        {formatTime(hoverFrame, fps)}
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
