---
name: example-podcast-visualizer
description: Workflow for creating a podcast visualizer with multi-track audio mixing and DOM-based synchronization. Use when building audio-reactive compositions.
---

# Podcast Visualizer Workflow

This workflow demonstrates how to build a podcast visualizer that mixes multiple audio tracks (e.g., background music, voiceover) and drives visualizations based on timing.

## Quick Start

```html
<!-- Background Music (Loops, Starts at 0s) -->
<audio src="music.mp3" loop data-helios-offset="0"></audio>

<!-- Voiceover (Starts at 2s) -->
<audio src="voice.wav" data-helios-offset="2"></audio>

<!-- Muted Track (For analysis only) -->
<audio src="sfx.wav" muted></audio>
```

```typescript
const helios = new Helios({
  duration: 60,
  fps: 30,
  autoSyncAnimations: true // Required for DOM audio sync
});

// React to time
helios.subscribe((state) => {
  const time = state.currentFrame / state.fps;
  if (time >= 2) {
    showVoiceVisualizer();
  }
});
```

## Key Patterns

### 1. DOM-Based Audio Mixing
The Helios Renderer (in `dom` mode) automatically discovers `<audio>` and `<video>` elements in your DOM and mixes them into the final video.

- **Discovery:** Any element present in the DOM is eligible.
- **Attributes:**
  - `src`: The audio source.
  - `loop`: If present, the audio loops.
  - `muted`: If present, the audio is excluded from the mix (useful for logic-only tracks).
  - `volume`: Not supported as an attribute for mixing yet (defaults to 1.0). Use Renderer `audioTracks` option if precise volume control is needed, or bake it in.

### 2. Timing Control
Control when audio starts playing relative to the timeline using `data-helios-offset`.

```html
<!-- Starts playing at T=5 seconds -->
<audio src="intro.mp3" data-helios-offset="5"></audio>
```

- **Positive Offset (`5`):** Delays start by 5 seconds.
- **Negative Offset (`-5`):** Starts playing immediately, but from the 5-second mark of the audio file (Seek).

### 3. Visual Synchronization
Use `helios.subscribe` to drive visual elements based on `currentFrame`. Since audio is handled by the browser/Renderer, you just need to ensure your visuals match the expected timing.

```typescript
helios.subscribe(({ currentFrame, fps }) => {
  const time = currentFrame / fps;

  // Simple time-based trigger
  if (time > 10 && time < 20) {
    // Animate visualizer
  }
});
```

## Common Issues

### Browser Preview Sync
In the browser (Studio/Player), `data-helios-offset` is **NOT** automatically applied by the standard `<audio>` element. The `DomDriver` attempts to sync it, but precise start/stop behavior for offsets might vary compared to the frame-perfect Renderer.

**Workaround:** For perfect preview sync, you may need custom logic to `play()/pause()` audio elements in your `subscribe` loop, or rely on the Renderer verification.

### Audio Format
Ensure your audio formats (MP3, WAV, AAC) are supported by the browser and FFmpeg.

## Reference
- Example: `examples/podcast-visualizer/`
- Renderer: `packages/renderer/src/strategies/DomStrategy.ts`
