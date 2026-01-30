import { Helios } from '@helios-project/core';
import { connectToParent } from '@helios-project/player/bridge';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const resizeCanvas = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
};
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const helios = new Helios({
    duration: 5,
    fps: 30
});

helios.bindToDocumentTimeline();

function draw(frame: number) {
    const { width, height } = canvas;
    const time = frame / 30;

    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, width, height);

    // Draw bouncing ball
    const period = 2; // seconds per bounce
    const t = (time % period) / period;
    // Bouncing logic
    const bounce = Math.abs(Math.sin(t * Math.PI));
    const y = height - 100 - (bounce * (height * 0.6));
    const x = width / 2;

    ctx.fillStyle = '#00cc66';
    ctx.beginPath();
    ctx.arc(x, y, 50, 0, Math.PI * 2);
    ctx.fill();

    // Draw text
    ctx.fillStyle = 'white';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Frame: ${frame.toFixed(0)}`, width/2, 50);
}

helios.subscribe((state) => {
    draw(state.currentFrame);
});

// Enable bridge
connectToParent(helios);
