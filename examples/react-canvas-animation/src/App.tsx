import React, { useEffect, useRef, useState } from 'react';
import { Helios } from '@helios-project/core';

const DURATION = 5;
const FPS = 30;

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentFrame, setCurrentFrame] = useState(0);

  useEffect(() => {
    // Initialize Helios
    const helios = new Helios({
      duration: DURATION,
      fps: FPS,
    });

    // Make helios available globally for the player and renderer
    (window as any).helios = helios;

    // Bind to document timeline for renderer support
    helios.bindToDocumentTimeline();

    // Subscribe to state changes
    const unsubscribe = helios.subscribe((state) => {
      setCurrentFrame(state.currentFrame);
    });

    return () => {
      unsubscribe();
      // helios.unbindFromDocumentTimeline(); // If we had such a method exposed or needed cleanup
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;

    // Clear
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, width, height);

    const time = currentFrame / FPS;
    const progress = (time % DURATION) / DURATION;

    // Draw
    const centerX = width / 2;
    const centerY = height / 2;

    // Animated Circle
    const radius = 50 + Math.sin(progress * Math.PI * 2) * 20;

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${progress * 360}, 70%, 50%)`;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Text
    ctx.fillStyle = '#fff';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Frame: ${currentFrame}`, centerX, centerY + 100);

  }, [currentFrame]);

  // Handle Resize
  useEffect(() => {
      const handleResize = () => {
          if (canvasRef.current) {
              canvasRef.current.width = window.innerWidth;
              canvasRef.current.height = window.innerHeight;
              // Trigger a re-render if needed, but the next frame update will catch it
          }
      };
      window.addEventListener('resize', handleResize);
      handleResize(); // Initial
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
    />
  );
}

export default App;
