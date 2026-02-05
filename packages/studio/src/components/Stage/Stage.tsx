import React, { useState, useRef, useEffect, MouseEvent, WheelEvent } from 'react';
import type { HeliosController } from '@helios-project/player';
import { useStudio } from '../../context/StudioContext';
import { EmptyState } from './EmptyState';
import { StageToolbar } from './StageToolbar';
import { useKeyboardShortcut } from '../../hooks/useKeyboardShortcut';
import { usePersistentState } from '../../hooks/usePersistentState';
import './Stage.css';

interface StageProps {
  src: string;
}

interface HeliosPlayerElement extends HTMLElement {
  getController(): HeliosController | null;
}

export const Stage: React.FC<StageProps> = ({ src }) => {
  const { setController, canvasSize, setCanvasSize, playerState, controller, takeSnapshot, setSettingsOpen, activeComposition } = useStudio();
  const playerRef = useRef<HeliosPlayerElement>(null);

  // State
  const [zoom, setZoom] = usePersistentState('stage-zoom', 1);
  const [pan, setPan] = usePersistentState('stage-pan', { x: 0, y: 0 });
  const [isTransparent, setIsTransparent] = usePersistentState('stage-transparent', true);
  const [showGuides, setShowGuides] = usePersistentState('stage-guides', false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useKeyboardShortcut("'", () => setShowGuides(p => !p), { ignoreInput: true });

  // HMR State Preservation
  const lastStateRef = useRef<{ frame: number, isPlaying: boolean, src: string, inputProps: Record<string, any> | null }>({ frame: 0, isPlaying: false, src: '', inputProps: null });

  // Track latest state
  useEffect(() => {
    if (controller && src) {
      lastStateRef.current = {
        frame: playerState.currentFrame,
        isPlaying: playerState.isPlaying,
        src: src,
        inputProps: playerState.inputProps
      };
    }
  }, [playerState.currentFrame, playerState.isPlaying, src, controller, playerState.inputProps]);

  // Reset controller when composition changes
  useEffect(() => {
    setController(null);
  }, [src, setController]);

  // Controller Connection & HMR Detection
  useEffect(() => {
    const el = playerRef.current;
    if (!el || !src) return;

    const interval = setInterval(() => {
      const freshCtrl = el.getController();

      // Check if controller has changed (reference inequality)
      // This handles:
      // a) Initial load (null -> ctrl)
      // b) HMR Reload (ctrlA -> null -> ctrlB) or (ctrlA -> ctrlB)
      if (freshCtrl && freshCtrl !== controller) {
        setController(freshCtrl);

        // If we found a new controller, check if we should restore state
        if (lastStateRef.current.src === src) {
          // Restore state
          const { frame, isPlaying, inputProps } = lastStateRef.current;
          // Use try-catch as seeking immediately might sometimes fail if not ready,
          // though freshCtrl usually implies ready in Helios.
          try {
            if (inputProps && Object.keys(inputProps).length > 0) {
              freshCtrl.setInputProps(inputProps);
            }
            if (frame > 0) freshCtrl.seek(frame);
            if (isPlaying) freshCtrl.play();
          } catch (e) {
            console.warn('Failed to restore state after HMR', e);
          }
        } else {
          // Fresh load or new composition - apply default props if available
          if (activeComposition?.metadata?.defaultProps) {
            try {
              freshCtrl.setInputProps(activeComposition.metadata.defaultProps);
            } catch (e) {
              console.warn('Failed to apply default props', e);
            }
          }
        }
      }
    }, 200);

    return () => clearInterval(interval);
  }, [src, controller, setController, activeComposition]);

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
            {src && (
              <>
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
                {showGuides && (
                  <div
                    className="stage-guides-overlay"
                    style={{
                      width: `${canvasSize.width}px`,
                      height: `${canvasSize.height}px`
                    }}
                  >
                    <div className="guide-action-safe" />
                    <div className="guide-title-safe" />
                    <div className="guide-crosshair-x" />
                    <div className="guide-crosshair-y" />
                  </div>
                )}
              </>
            )}
        </div>
        {!src && <EmptyState />}
        <StageToolbar
            zoom={zoom}
            onZoom={setZoom}
            onFit={handleFit}
            isTransparent={isTransparent}
            onToggleTransparent={() => setIsTransparent(!isTransparent)}
            canvasSize={canvasSize}
            onCanvasSizeChange={setCanvasSize}
            onSnapshot={takeSnapshot}
            showGuides={showGuides}
            onToggleGuides={() => setShowGuides(!showGuides)}
            onOpenSettings={() => setSettingsOpen(true)}
        />
    </div>
  );
};
