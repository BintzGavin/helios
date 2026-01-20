import React, { useEffect, useRef } from 'react';
import { Helios } from '@helios/core';

const App = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Handle resizing
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const helios = new Helios({
      duration: 5,
      fps: 30
    });

    helios.bindToDocumentTimeline();

    const draw = (frame: number) => {
        const { width, height } = canvas;
        const totalFrames = 30 * 5;
        const progress = frame / totalFrames;

        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, width, height);

        // Draw a rotating React logo-ish thing
        const cx = width / 2;
        const cy = height / 2;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(progress * Math.PI * 2);

        ctx.strokeStyle = '#61dafb';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.ellipse(0, 0, 100, 40, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.rotate(Math.PI / 3);
        ctx.beginPath();
        ctx.ellipse(0, 0, 100, 40, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.rotate(Math.PI / 3);
        ctx.beginPath();
        ctx.ellipse(0, 0, 100, 40, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fillStyle = '#61dafb';
        ctx.fill();

        ctx.restore();
    };

    const unsubscribe = helios.subscribe((state) => {
        draw(state.currentFrame);
    });

    // Initial draw
    draw(0);

    return () => {
        unsubscribe();
        window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} />;
};

export default App;
