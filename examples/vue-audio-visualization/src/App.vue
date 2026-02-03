<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { Helios } from '@helios-project/core';
import { useVideoFrame } from './composables/useVideoFrame';
import { useAudioData } from './composables/useAudioData';

// Initialize Helios
const duration = 10;
const fps = 30;
const helios = new Helios({ duration, fps });
helios.bindToDocumentTimeline();

// Expose for debugging
if (typeof window !== 'undefined') {
    window.helios = helios;
}

const buffer = ref(null);
const canvasRef = ref(null);

// Generate Audio Buffer
onMounted(() => {
    try {
        const sampleRate = 44100;
        const AudioCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtor) return;

        const ctx = new AudioCtor({ sampleRate });
        const b = ctx.createBuffer(1, sampleRate * duration, sampleRate);
        const data = b.getChannelData(0);

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
        buffer.value = b;
    } catch (e) {
        console.error('Error generating audio:', e);
    }
});

// Sync with Helios
const frame = useVideoFrame(helios);
const currentTime = computed(() => frame.value / helios.fps);

// Audio Analysis
const audioData = useAudioData(buffer, currentTime);

// Resize Handling
const updateSize = () => {
    if (canvasRef.value) {
        canvasRef.value.width = window.innerWidth;
        canvasRef.value.height = window.innerHeight;
    }
};

onMounted(() => {
    window.addEventListener('resize', updateSize);
    updateSize();
});

onUnmounted(() => {
    window.removeEventListener('resize', updateSize);
});

// Draw Loop
watch(audioData, ({ rms, waveform }) => {
    if (!canvasRef.value) return;
    const canvas = canvasRef.value;
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
        const y = (height / 2) + (sample * (height / 4));
        const x = (i / windowSize) * width;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw Time Info
    ctx.fillStyle = '#fff';
    ctx.font = '20px monospace';
    ctx.fillText(`Time: ${currentTime.value.toFixed(2)}s`, 20, 30);
});
</script>

<template>
  <canvas ref="canvasRef" style="width: 100%; height: 100%; display: block;"></canvas>
</template>
