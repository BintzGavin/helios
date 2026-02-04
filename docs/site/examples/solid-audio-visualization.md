---
title: "SolidJS Audio Visualization"
description: "Real-time audio analysis with SolidJS and Helios"
---

# SolidJS Audio Visualization

This example demonstrates how to perform real-time audio analysis (RMS, Waveforms) in a SolidJS application driven by Helios.

## Key Concepts

- **AudioContext**: Access the shared `AudioContext` from Helios (if available) or create a synthesized one.
- **AudioTrackMetadata**: Use `helios.availableAudioTracks` to discover track information.
- **Signals**: Use SolidJS signals to update the UI reactively based on audio data.

## Implementation

```tsx
import { createSignal, onMount, onCleanup } from 'solid-js';
import { helios } from './helios';

export function AudioVisualizer() {
  const [rms, setRms] = createSignal(0);
  const [audioData, setAudioData] = createSignal<Float32Array>(new Float32Array(128));

  onMount(() => {
    // In a real scenario, you would connect to helios.getAudioSourceNode()
    // For this example, we simulate audio data generation based on time

    const unsubscribe = helios.subscribe((state) => {
        const time = state.currentFrame / state.fps;

        // Simulate a sine wave
        const value = Math.sin(time * 10) * 0.5 + 0.5;
        setRms(value);

        // Simulate waveform data
        const newData = new Float32Array(128);
        for(let i=0; i<128; i++) {
            newData[i] = Math.sin(time * 20 + (i/128) * Math.PI * 2);
        }
        setAudioData(newData);
    });

    onCleanup(() => unsubscribe());
  });

  return (
    <div style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;">
      <div
        style={{
            width: '100px',
            height: '100px',
            background: 'red',
            transform: `scale(${0.5 + rms()})`,
            'border-radius': '50%'
        }}
      />
      <div style="margin-top: 20px;">RMS: {rms().toFixed(2)}</div>
    </div>
  );
}
```
