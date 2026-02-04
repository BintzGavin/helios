---
name: example-react-audio-visualization
description: Create frame-accurate audio visualizations in React by slicing audio buffers based on the current timeline frame.
---

# React Audio Visualization

This pattern demonstrates how to create deterministic, frame-accurate audio visualizations. Instead of using a realtime `AnalyserNode` (which is non-deterministic and hard to sync), we load the entire audio buffer and "slice" it based on the current timeline position.

## Quick Start

### 1. The Hook (`useAudioData`)

Create a hook that extracts RMS (volume) and Waveform data from an AudioBuffer at a specific time.

```javascript
// hooks/useAudioData.js
import { useMemo } from 'react';

export function useAudioData(buffer, currentTime, windowSize = 1024) {
  return useMemo(() => {
    if (!buffer) return { rms: 0, waveform: [] };

    const data = buffer.getChannelData(0); // Left channel
    const sampleRate = buffer.sampleRate;

    // Calculate the sample index for the current time
    const centerSample = Math.floor(currentTime * sampleRate);

    // Define the window around the current time
    const startSample = Math.max(0, centerSample - windowSize / 2);
    const endSample = Math.min(data.length, centerSample + windowSize / 2);

    let sumSquares = 0;
    const waveform = [];

    for (let i = startSample; i < endSample; i++) {
      const sample = data[i];
      sumSquares += sample * sample;
      waveform.push(sample);
    }

    const rms = Math.sqrt(sumSquares / (endSample - startSample || 1));

    return { rms, waveform };
  }, [buffer, currentTime, windowSize]);
}
```

### 2. The Component

Use the hook in your component, driving `currentTime` from Helios.

```jsx
import React, { useEffect, useState, useRef } from 'react';
import { Helios } from '@helios-project/core';
import { useAudioData } from './hooks/useAudioData';

const helios = new Helios({ duration: 10, fps: 30 });

export default function AudioViz() {
  const [buffer, setBuffer] = useState(null);
  const [frame, setFrame] = useState(0);
  const canvasRef = useRef(null);

  // 1. Load Audio
  useEffect(() => {
    fetch('/audio.mp3')
      .then(res => res.arrayBuffer())
      .then(ab => new AudioContext().decodeAudioData(ab))
      .then(setBuffer);
  }, []);

  // 2. Sync with Helios
  useEffect(() => {
    return helios.subscribe(state => setFrame(state.currentFrame));
  }, []);

  // 3. Get Data for Current Frame
  const currentTime = frame / helios.fps;
  const { rms, waveform } = useAudioData(buffer, currentTime);

  // 4. Render to Canvas
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvasRef.current;
    ctx.clearRect(0, 0, width, height);

    // Draw Volume Circle
    const radius = 50 + (rms * 200);
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'red';
    ctx.fill();

    // Draw Waveform
    ctx.beginPath();
    ctx.strokeStyle = 'white';
    waveform.forEach((sample, i) => {
      const x = (i / waveform.length) * width;
      const y = (height / 2) + (sample * 100);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

  }, [rms, waveform]);

  return <canvas ref={canvasRef} width={800} height={600} />;
}
```

## Key Concepts

### Deterministic Rendering
By calculating `rms` from the buffer based on `currentTime`, every frame is mathematically guaranteed to be the same every time you render. This is crucial for video export.

### Window Size
The `windowSize` (e.g., 1024 samples) determines how much audio "history" and "future" you visualize around the current frame.
- **Larger Window:** Smoother, slower reaction.
- **Smaller Window:** Twitchier, faster reaction.

### React `useMemo`
Using `useMemo` ensures we only recalculate audio data when the frame changes, avoiding unnecessary work during re-renders caused by other props.
