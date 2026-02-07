import React, { useRef, useEffect } from 'react';
import { Helios } from '@helios-project/core';
import { useVideoFrame } from './hooks/useVideoFrame';

// Initialize Helios outside the component to keep a stable instance
// or use useMemo if you want it tied to component lifecycle,
// but typically the engine instance is a singleton for the page.
const duration = 5;
const fps = 30;
const helios = new Helios({ duration, fps });

// Bind to document timeline so it can be driven by the player/renderer
helios.bindToDocumentTimeline();

// Expose to window for debugging/player control
if (typeof window !== 'undefined') {
    (window as any).helios = helios;
}

export default function App() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const frame = useVideoFrame(helios);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { width, height } = canvas;

        // Clear
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, width, height);

        const time = frame / fps * 1000;
        const progress = (time % (duration * 1000)) / (duration * 1000);

        // Draw React-y visuals
        // Rotating React Logo-ish thing
        const cx = width / 2;
        const cy = height / 2;
        const radius = 100;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(progress * Math.PI * 2);

        ctx.strokeStyle = '#61dafb';
        ctx.lineWidth = 5;

        // Atom rings
        for (let i = 0; i < 3; i++) {
            ctx.save();
            ctx.rotate((i * Math.PI) / 3);
            ctx.beginPath();
            ctx.ellipse(0, 0, radius, radius / 2.5, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // Nucleus
        ctx.fillStyle = '#61dafb';
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Text
        ctx.fillStyle = 'white';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Frame: ${frame}`, cx, cy + radius + 50);

    }, [frame]);

    // Handle resize
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        window.addEventListener('resize', resize);
        resize();

        return () => window.removeEventListener('resize', resize);
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', display: 'block' }}
        />
    );
}
