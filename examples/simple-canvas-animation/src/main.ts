import { Helios, HeliosState } from '@helios-project/core';

const canvas = document.getElementById('composition-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const resizeCanvas = () => {
    // Use window dimensions to be safe, as we want full screen canvas
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    console.log(`Canvas resized to ${canvas.width}x${canvas.height}`);
};

// Resize immediately
resizeCanvas();
// And on window resize
window.addEventListener('resize', resizeCanvas);

const duration = 5; // seconds
const fps = 30;

// Initialize Helios
const helios = new Helios({
    duration,
    fps
});

// Bind to document.timeline so the Renderer can drive us
helios.bindToDocumentTimeline();

function draw(currentFrame: number) {
  const time = currentFrame / fps * 1000; // in ms
  const progress = (time % (duration * 1000)) / (duration * 1000);

  const { width, height } = canvas;

  // Clear
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, width, height);

  const x = progress * width;
  const y = height / 2;
  const radius = 50;

  // Draw moving circle
  ctx.fillStyle = 'royalblue';
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  // Draw rotating square
  const squareSize = 100;
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate(progress * Math.PI * 2);
  ctx.fillStyle = 'tomato';
  ctx.fillRect(-squareSize / 2, -squareSize / 2, squareSize, squareSize);
  ctx.restore();
}

// Subscribe to Helios state changes
helios.subscribe((state: HeliosState) => {
    draw(state.currentFrame);
});

// Make helios available globally for debugging/manual driving if needed
declare global {
  interface Window {
    helios: Helios;
  }
}
window.helios = helios;
