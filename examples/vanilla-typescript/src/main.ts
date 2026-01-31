import { Helios } from '@helios-project/core';

// Initialize engine
const helios = new Helios({
  fps: 30,
  duration: 5,
  autoSyncAnimations: true
});

// Create Canvas element
const canvas = document.createElement('canvas');
canvas.width = 1920;
canvas.height = 1080;
canvas.style.width = '100%';
canvas.style.height = '100%';
document.body.appendChild(canvas);

const ctx = canvas.getContext('2d')!;

// Animate using subscribe
helios.subscribe((state) => {
   // Clear
   ctx.fillStyle = '#f0f0f0';
   ctx.fillRect(0, 0, canvas.width, canvas.height);

   const progress = state.currentFrame / (state.duration * state.fps);

   // Draw box
   const x = (progress * (canvas.width - 200)) + 100; // Move across screen
   const y = canvas.height / 2;

   ctx.fillStyle = 'red';
   ctx.beginPath();
   ctx.rect(x - 50, y - 50, 100, 100);
   ctx.fill();
});

// Enable external control
helios.bindToDocumentTimeline();

// Expose for debugging
(window as any).helios = helios;
