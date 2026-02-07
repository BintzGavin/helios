import { Helios } from '@helios-project/core';

// 1. Setup Audio Buffer synchronously
const sampleRate = 44100;
const duration = 10;
// Handle webkitAudioContext for TypeScript
const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
const ctx = new AudioContextClass({ sampleRate });
const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
const data = buffer.getChannelData(0);

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

// 2. Setup Canvas
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const canvasCtx = canvas.getContext('2d')!;

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// 3. Setup Helios
const helios = new Helios({
    fps: 30,
    duration: duration
});

helios.bindToDocumentTimeline();
(window as any).helios = helios;

// 4. Draw Loop
function draw(frame: number) {
    const time = frame / helios.fps.value;
    const { width, height } = canvas;

    // Clear
    canvasCtx.fillStyle = '#111';
    canvasCtx.fillRect(0, 0, width, height);

    // Calculate Sample Window
    const centerSample = Math.floor(time * sampleRate);
    const windowSize = 1024; // Samples to visualize
    const startSample = Math.max(0, centerSample - windowSize / 2);
    const endSample = Math.min(data.length, centerSample + windowSize / 2);

    // Analyze: RMS
    let sumSquares = 0;
    for(let i = startSample; i < endSample; i++) {
        sumSquares += data[i] * data[i];
    }
    const rms = Math.sqrt(sumSquares / (endSample - startSample || 1));

    // Draw Pulsating Circle (Volume)
    const radius = 50 + (rms * 300);
    canvasCtx.beginPath();
    canvasCtx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
    canvasCtx.fillStyle = `rgba(255, 50, 50, ${0.5 + rms})`;
    canvasCtx.fill();

    // Draw Waveform
    canvasCtx.beginPath();
    canvasCtx.strokeStyle = '#00ffcc';
    canvasCtx.lineWidth = 2;

    for (let i = 0; i < windowSize; i++) {
        const idx = startSample + i;
        if (idx >= data.length) break;

        const sample = data[idx];
        // Map sample (-1 to 1) to y (height to 0)
        // Center is height/2.
        const y = (height / 2) + (sample * (height / 4));
        const x = (i / windowSize) * width;

        if (i === 0) canvasCtx.moveTo(x, y);
        else canvasCtx.lineTo(x, y);
    }
    canvasCtx.stroke();

    // Draw Time Info
    canvasCtx.fillStyle = '#fff';
    canvasCtx.font = '20px monospace';
    canvasCtx.fillText(`Time: ${time.toFixed(2)}s`, 20, 30);
}

helios.subscribe((state: { currentFrame: number }) => draw(state.currentFrame));
