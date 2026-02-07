---
title: "Audio Visualization"
description: "Creating audio visualizations on canvas with Helios."
---

# Audio Visualization

This example demonstrates how to create frame-perfect audio visualizations by synthesizing an `AudioBuffer` and analyzing it based on the current frame time.

## Overview

For deterministic rendering, we cannot rely on `AudioContext`'s real-time clock. Instead, we:
1. Decode or generate the audio data into an `AudioBuffer`.
2. In the render loop, calculate the exact sample window corresponding to the current frame.
3. Perform analysis (RMS, FFT) on that window synchronously.

## Code Example

```typescript
import { Helios } from '@helios-project/core';

// 1. Create Audio Buffer
const sampleRate = 44100;
const duration = 5;
const ctx = new AudioContext({ sampleRate });
const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
const data = buffer.getChannelData(0);

// Fill with synthetic data (sine sweep + beats)
for (let i = 0; i < data.length; i++) {
    const t = i / sampleRate;
    data[i] = Math.sin(2 * Math.PI * 440 * t); // Simple 440Hz sine
}

// 2. Setup Helios
const helios = new Helios({ fps: 30, duration });
helios.bindToDocumentTimeline();

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const canvasCtx = canvas.getContext('2d')!;

// 3. Draw Loop
helios.subscribe((state) => {
    const time = state.currentTime;
    const { width, height } = canvas;

    // Clear
    canvasCtx.fillStyle = '#111';
    canvasCtx.fillRect(0, 0, width, height);

    // Calculate Sample Window
    const centerSample = Math.floor(time * sampleRate);
    const windowSize = 1024;
    const startSample = Math.max(0, centerSample - windowSize / 2);
    const endSample = Math.min(data.length, centerSample + windowSize / 2);

    // Analyze: RMS (Root Mean Square) for volume
    let sumSquares = 0;
    for(let i = startSample; i < endSample; i++) {
        sumSquares += data[i] * data[i];
    }
    const rms = Math.sqrt(sumSquares / (endSample - startSample || 1));

    // Draw Visualization
    const radius = 50 + (rms * 200);
    canvasCtx.beginPath();
    canvasCtx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
    canvasCtx.fillStyle = `rgba(255, 50, 50, ${0.5 + rms})`;
    canvasCtx.fill();
});
```

## Benefits

- **Deterministic**: The visualization looks exactly the same every time, frame by frame.
- **Export Ready**: Works perfectly with `@helios-project/renderer` because it doesn't depend on real-time playback.
- **Precise Sync**: Visuals react instantly to audio events without latency.
