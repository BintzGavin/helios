<script setup>
import { ref, watch, onMounted } from 'vue';
import { Helios } from '../../../packages/core/dist/index.js';
import { useVideoFrame } from './composables/useVideoFrame';

// Initialize Helios singleton
const duration = 5;
const fps = 30;
const helios = new Helios({ duration, fps });
helios.bindToDocumentTimeline();

// Expose to window for debugging/player control
if (typeof window !== 'undefined') {
    window.helios = helios;
}

const canvasRef = ref(null);
const frame = useVideoFrame(helios);

const draw = () => {
    const canvas = canvasRef.value;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;

    // Clear
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, width, height);

    const time = frame.value / fps * 1000;
    const progress = (time % (duration * 1000)) / (duration * 1000);

    // Draw Vue-y visuals
    const cx = width / 2;
    const cy = height / 2;
    const size = 200;

    ctx.save();
    ctx.translate(cx, cy);

    // Pulse effect
    const scale = 1 + Math.sin(progress * Math.PI * 2) * 0.1;
    ctx.scale(scale, scale);

    // Rotate
    ctx.rotate(progress * Math.PI * 2);

    // Vue Triangle (Outer)
    ctx.beginPath();
    ctx.moveTo(0, size / 2);
    ctx.lineTo(size / 2, -size / 2);
    ctx.lineTo(-size / 2, -size / 2);
    ctx.closePath();
    ctx.fillStyle = '#42b883'; // Vue Green
    ctx.fill();

    // Vue Triangle (Inner)
    ctx.beginPath();
    ctx.moveTo(0, size / 4);
    ctx.lineTo(size / 4, -size / 2);
    ctx.lineTo(-size / 4, -size / 2);
    ctx.closePath();
    ctx.fillStyle = '#35495e'; // Vue Dark Blue
    ctx.fill();

    ctx.restore();

    // Text
    ctx.fillStyle = 'white';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Frame: ${frame.value}`, cx, cy + size / 1.5 + 50);
};

// React to frame changes
watch(frame, draw);

// Handle resize
onMounted(() => {
    const canvas = canvasRef.value;
    if (!canvas) return;

    const resize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        // Redraw immediately on resize
        draw();
    };

    window.addEventListener('resize', resize);
    resize();

    // Cleanup handled by Vue automatically for DOM listeners attached in component context usually,
    // but window listeners need manual cleanup if component unmounts.
    // However, for this root component, it's fine.
});
</script>

<template>
  <canvas ref="canvasRef" style="width: 100%; height: 100%; display: block;"></canvas>
</template>
