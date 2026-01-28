import React, { useState, useRef, useEffect, MouseEvent, WheelEvent } from 'react';
import type { HeliosController } from '@helios-project/player';
import { useStudio } from '../../context/StudioContext';
import { StageToolbar } from './StageToolbar';
import './Stage.css';

interface StageProps {
  src: string;
}

interface HeliosPlayerElement extends HTMLElement {
  getController(): HeliosController | null;
}

export const Stage: React.FC<StageProps> = ({ src }) => {
  const { setController, canvasSize, setCanvasSize, playerState } = useStudio();
  const playerRef = useRef<HeliosPlayerElement>(null);

  // State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isTransparent, setIsTransparent] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Refs for HMR state preservation
  const playerStateRef = useRef(playerState);
  playerStateRef.current = playerState;
  const knownControllerRef = useRef<HeliosController | null>(null);

  // Reset known controller when src changes (composition switch)
  useEffect(() => {
    knownControllerRef.current = null;
    setController(null);
  }, [src, setController]);

  // Controller Connection Logic & HMR State Preservation
  useEffect(() => {
    const el = playerRef.current;
    if (!el || !src) return;

    const interval = setInterval(() => {
      const ctrl = el.getController();

      // Detect controller change
      if (ctrl !== knownControllerRef.current) {
        if (ctrl) {
          // If we previously had a controller, this is likely an HMR reload
          // so we attempt to restore the state.
          if (knownControllerRef.current) {
            const { currentFrame, isPlaying } = playerStateRef.current;
            try {
              ctrl.seek(currentFrame);
              if (isPlaying) {
                ctrl.play();
              }
            } catch (e) {
              console.warn('Failed to restore playback state after HMR', e);
            }
          }
          setController(ctrl);
        }
        knownControllerRef.current = ctrl;
      }
    }, 100);

    return () => clearInterval(interval);
  }, [src, setController]);

  // Event Handlers
  const handleWheel = (e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
        // Zoom
        e.preventDefault();
        const delta = -e.deltaY * 0.001;
        setZoom(prev => Math.min(Math.max(prev + delta, 0.1), 5));
    } else {
        // Pan
        setPan(prev => ({
            x: prev.x - e.deltaX,
            y: prev.y - e.deltaY
        }));
    }
  };

  const handleMouseDown = (e: MouseEvent) => {
    if (e.button === 0 || e.button === 1) { // Left or Middle click
        setIsDragging(true);
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
        setPan({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleFit = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div
        className={`stage-container ${isTransparent ? 'checkerboard-bg' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
    >
        <div
            className="stage-content"
            style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
            }}
        >
            {src ? (
              <helios-player
                ref={playerRef}
                key={src}
                src={src}
                style={{
                  width: `${canvasSize.width}px`,
                  height: `${canvasSize.height}px`,
                  display: 'block',
                  boxShadow: '0 0 20px rgba(0,0,0,0.5)'
                }}
              ></helios-player>
            ) : (
                <div style={{ color: '#888' }}>No composition selected</div>
            )}
        </div>
        <StageToolbar
            zoom={zoom}
            onZoom={setZoom}
            onFit={handleFit}
            isTransparent={isTransparent}
            onToggleTransparent={() => setIsTransparent(!isTransparent)}
            canvasSize={canvasSize}
            onCanvasSizeChange={setCanvasSize}
        />
    </div>
  );
};
