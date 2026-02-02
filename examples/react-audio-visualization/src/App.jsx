import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { Helios } from '@helios-project/core';
import { useVideoFrame } from './hooks/useVideoFrame';
import { useAudioData } from './hooks/useAudioData';

// Initialize Helios outside
const duration = 10;
const fps = 30;
const helios = new Helios({ duration, fps });
helios.bindToDocumentTimeline();

// Expose for debugging
if (typeof window !== 'undefined') {
    window.helios = helios;
}

export default function App() {
  const [buffer, setBuffer] = useState(null);
  const canvasRef = useRef(null);

  // Initialize Audio Buffer
  useEffect(() => {
    try {
        const sampleRate = 44100;

        const AudioCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtor) return;

        const ctx = new AudioCtor({ sampleRate });
        const b = ctx.createBuffer(1, sampleRate * duration, sampleRate);
        const data = b.getChannelData(0);

        // Fill data: Sine sweep + Beats
        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            // Frequency sweep from 100Hz to 1000Hz
            const freq = 100 + (900 * t / duration);
            const sine = Math.sin(2 * Math.PI * freq * t);

            // Beat every 0.5s
            const beatFreq = 2; // Hz
            const beatEnv = Math.exp(-10 * (t * beatFreq % 1)); // Decay envelope
            const kick = Math.sin(2 * Math.PI * 60 * t) * beatEnv;

            data[i] = (sine * 0.5) + (kick * 0.5);
        }
        setBuffer(b);

    } catch (e) {
        console.error('Error in App useEffect:', e);
    }
  }, []);

  // Sync with Helios
  const frame = useVideoFrame(helios);
  const currentTime = frame / helios.fps;

  // Derived Audio Data
  const { rms, waveform } = useAudioData(buffer, currentTime);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Draw Frame
  useLayoutEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;

    // Clear
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, width, height);

    // Draw Pulsating Circle (Volume)
    const radius = 50 + (rms * 300);
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 50, 50, ${0.5 + rms})`;
    ctx.fill();

    // Draw Waveform
    ctx.beginPath();
    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth = 2;

    const windowSize = waveform.length;
    for (let i = 0; i < windowSize; i++) {
        const sample = waveform[i];
        // Map sample (-1 to 1) to y (height to 0)
        const y = (height / 2) + (sample * (height / 4));
        const x = (i / windowSize) * width;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw Time Info
    ctx.fillStyle = '#fff';
    ctx.font = '20px monospace';
    ctx.fillText(`Time: ${currentTime.toFixed(2)}s`, 20, 30);

  }, [rms, waveform, currentTime]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
}
