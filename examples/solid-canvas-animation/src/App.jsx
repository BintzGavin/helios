import { createEffect } from 'solid-js';
import { createHeliosSignal } from './lib/createHeliosSignal';

// Ensure helios is available
import { Helios } from '../../../packages/core/src/index.ts';

// Initialize Helios if not already present (for dev mode)
if (!window.helios) {
  window.helios = new Helios({
    fps: 30,
    duration: 60, // frames
    width: 1920,
    height: 1080,
    autoStart: true,
  });
}

function App() {
  let canvasRef;
  const frame = createHeliosSignal(window.helios);

  createEffect(() => {
    const canvas = canvasRef;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const state = frame();
    const { width, height, currentFrame, duration } = state;

    canvas.width = width;
    canvas.height = height;

    // Clear
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    // Draw
    const totalFrames = duration * window.helios.fps;
    const progress = totalFrames > 0 ? currentFrame / totalFrames : 0;

    ctx.fillStyle = '#446b9e'; // SolidJS Blueish
    const size = 200;
    const x = (width - size) * progress;
    const y = (height - size) / 2;

    ctx.fillRect(x, y, size, size);

    // Draw text
    ctx.fillStyle = 'white';
    ctx.font = '40px sans-serif';
    ctx.fillText(`Frame: ${currentFrame}`, 50, 100);
  });

  return (
    <canvas ref={canvasRef} style={{ width: '100%', height: 'auto' }} />
  );
}

export default App;
