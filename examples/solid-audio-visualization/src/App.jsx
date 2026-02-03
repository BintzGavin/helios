import { createSignal, onMount, onCleanup, createEffect } from 'solid-js';
import { Helios } from '@helios-project/core';
import { createHeliosSignal } from './lib/createHeliosSignal';
import { useAudioData } from './lib/useAudioData';

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
  const [buffer, setBuffer] = createSignal(null);
  let canvasRef;

  const heliosState = createHeliosSignal(helios);
  const currentTime = () => {
    const s = heliosState();
    return s.currentTime;
  };

  onMount(() => {
    let ctx;
    try {
      const sampleRate = 44100;
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (AudioCtor) {
        ctx = new AudioCtor({ sampleRate });
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
      }
    } catch (e) {
      console.error('Error generating audio:', e);
    }

    const handleResize = () => {
      if (canvasRef) {
        canvasRef.width = window.innerWidth;
        canvasRef.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    onCleanup(() => {
      window.removeEventListener('resize', handleResize);
      if (ctx && ctx.state !== 'closed') {
        ctx.close();
      }
    });
  });

  const audioData = useAudioData(buffer, currentTime);

  createEffect(() => {
    if (!canvasRef) return;
    const { rms, waveform } = audioData();
    const time = currentTime();
    const ctx = canvasRef.getContext('2d');
    const { width, height } = canvasRef;

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
    ctx.fillText(`Time: ${time.toFixed(2)}s`, 20, 30);
  });

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
}
