---
name: audio-visualization
description: How to create audio-reactive visualizations in Helios. Covers deterministic frame-synchronous analysis (for rendering) and real-time metering (for player UI).
---

# Audio Visualization Workflow

Creating audio-reactive visuals in Helios requires choosing the right strategy based on your deployment target.

## Strategies

| Strategy | Best For | Pros | Cons |
|----------|----------|------|------|
| **Deterministic Buffer** | **Rendering** & Playback | Frame-perfect, offline-compatible, works in headless mode. | Requires manual signal processing logic. |
| **Player Metering** | **Player UI** | Easy to implement, zero signal processing code. | Only works in real-time player, not for burned-in visuals. |
| **Web Audio API** | Interactive Art | Access to full Web Audio graph. | May not sync perfectly during offline frame-by-frame rendering. |

## 1. Deterministic Buffer Analysis (Recommended)

This is the "Helios Way" for generating video content. By decoding the audio into a buffer and manually slicing it based on the current frame time, you ensure that every frame is mathematically identical regardless of rendering speed (real-time or 1fps headless).

### Concept
1. **Load Audio**: Fetch and decode the audio file into an `AudioBuffer`.
2. **Slice**: In your render loop, calculate the sample window corresponding to `state.currentTime`.
3. **Analyze**: Calculate RMS (volume) or perform FFT (frequency) on that slice.
4. **Draw**: Map the values to visual properties (scale, color, path).

### Code Pattern (Vanilla JS / Canvas)

```javascript
import { Helios } from '@helios-project/core';

// 1. Setup Audio Buffer
// Note: In production, load this asynchronously and use helios.registerStabilityCheck()
const ctx = new (window.AudioContext || window.webkitAudioContext)();
let audioBuffer = null;
let audioData = null;

fetch('/music.mp3')
  .then(res => res.arrayBuffer())
  .then(buf => ctx.decodeAudioData(buf))
  .then(decoded => {
    audioBuffer = decoded;
    audioData = decoded.getChannelData(0); // Left channel
  });

const helios = new Helios({ fps: 30, duration: 10 });

// 2. Visualization Logic
function draw(frame) {
  if (!audioData) return;

  const time = frame / helios.fps;
  const sampleRate = audioBuffer.sampleRate;

  // Calculate Window
  const centerSample = Math.floor(time * sampleRate);
  const windowSize = 1024; // Samples to analyze
  const start = Math.max(0, centerSample - windowSize / 2);
  const end = Math.min(audioData.length, centerSample + windowSize / 2);

  // Analyze: Root Mean Square (RMS) for Volume
  let sumSquares = 0;
  for(let i = start; i < end; i++) {
    sumSquares += audioData[i] * audioData[i];
  }
  const rms = Math.sqrt(sumSquares / (end - start || 1));

  // Draw
  const canvas = document.querySelector('canvas');
  const ctx = canvas.getContext('2d');

  // Scale circle by volume
  const radius = 50 + (rms * 200);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2, radius, 0, Math.PI * 2);
  ctx.fill();
}

helios.subscribe(state => draw(state.currentFrame));
```

## 2. Player Audio Metering (UI Only)

Use this method if you just want to show a volume meter in the **Player interface** (outside the canvas/video itself), or if you are building a custom player skin.

### Concept
The `HeliosController` (and thus `<helios-player>`) can emit `audiometering` events containing real-time volume levels for each track.

### Code Pattern

```javascript
const player = document.querySelector('helios-player');

// 1. Enable Metering
player.startAudioMetering();

// 2. Listen for Events
player.addEventListener('audiometering', (event) => {
  const levels = event.detail; // { [trackId]: { volume: 0.5, peak: 0.8 }, ... }

  // Update UI
  const masterVolume = levels['master']?.volume || 0;
  document.getElementById('meter').style.width = `${masterVolume * 100}%`;
});

// 3. Clean up
// player.stopAudioMetering();
```

## 3. Web Audio API Access (Advanced)

If you need advanced nodes (e.g. `AnalyserNode` for frequency data) and are comfortable managing sync issues or only target real-time playback.

```javascript
// Access the AudioContext used by the driver
const ctx = await helios.getAudioContext();

// Access a specific track's source node
const source = await helios.getAudioSourceNode('myTrack');

if (ctx && source) {
  const analyser = ctx.createAnalyser();
  source.connect(analyser);
  // ... standard Web Audio API logic ...
}
```
**Warning:** This approach relies on the `TimeDriver` implementation. The default `DomDriver` supports it, but headless rendering strategies might differ in timing precision compared to the deterministic buffer method.

## Common Issues

### "My visualization is silent/flat during render"
- **Cause:** You might be using `AnalyserNode` in a way that doesn't run during offline rendering ticks, or the headless browser doesn't support Web Audio output.
- **Fix:** Switch to **Strategy 1 (Deterministic Buffer)**. By processing the raw buffer data yourself, you guarantee data availability regardless of audio hardware.

### "Audio not loading"
- **Fix:** Ensure you are waiting for audio to decode. Use `helios.registerStabilityCheck()` to tell the Renderer to wait for your `fetch()` and `decodeAudioData()` to complete before capturing frames.
