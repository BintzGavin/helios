import { Helios, random, interpolateColors } from '@helios-project/core';

// Init Helios
const helios = new Helios({ fps: 30, duration: 10 });
helios.bindToDocumentTimeline();

const canvas = document.querySelector('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

// Grid Config
const COLS = 10;
const ROWS = 10;

// Resize handler
function resize() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    helios.setSize(canvas.width, canvas.height);
}
window.addEventListener('resize', resize);
resize();

helios.subscribe((state) => {
  const frame = state.currentFrame;
  const { width, height } = canvas;

  // Background Color Cycle
  // Use interpolateColors to shift background over time
  // Animate from frame 0 to 300 (10 seconds at 30fps)
  const bg = interpolateColors(frame, [0, 300], ['#1a1a2e', '#16213e'], { extrapolateRight: 'clamp' });
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const cellW = width / COLS;
  const cellH = height / ROWS;

  // Draw Grid
  for (let i = 0; i < COLS * ROWS; i++) {
     const col = i % COLS;
     const row = Math.floor(i / COLS);

     // Deterministic properties based on index
     // random(i) returns same value every render for this cell
     const seed = i;
     const baseSize = random(seed) * (Math.min(cellW, cellH) * 0.5);
     const speed = random(seed + 1000) * 0.2;
     const offset = random(seed + 2000) * Math.PI * 2;
     const colorSeed = random(seed + 3000);

     // Animate scale using sine wave based on frame
     const currentScale = 0.5 + 0.5 * Math.sin(frame * speed + offset);

     const x = col * cellW + cellW/2;
     const y = row * cellH + cellH/2;

     // Color based on position or random
     ctx.fillStyle = colorSeed > 0.5 ? 'tomato' : 'teal';

     // Draw
     ctx.beginPath();
     ctx.arc(x, y, baseSize * currentScale, 0, Math.PI * 2);
     ctx.fill();
  }
});

// Expose helios for verification
(window as any).helios = helios;
