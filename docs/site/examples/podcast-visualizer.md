---
title: "Podcast Visualizer"
description: "Audio mixing and visualization with Helios"
---

# Podcast Visualizer

This example demonstrates how to create a podcast visualizer with multiple audio tracks, demonstrating the `DomDriver`'s ability to handle audio offset, looping, and muting.

## Key Concepts

- **Audio Offset**: Using `data-helios-offset` to start audio tracks at specific times.
- **Audio Loops**: Using the standard `loop` attribute.
- **Muting**: Using the standard `muted` attribute.
- **Auto Sync**: Using `autoSyncAnimations: true` to sync CSS animations with the timeline.

## Implementation

The example uses standard HTML `<audio>` elements. Helios's `DomDriver` automatically discovers these elements and synchronizes them during preview and rendering.

```html
<!-- Track 1: Music (Looping, Offset 0) -->
<audio id="music-track" src="..." loop data-helios-offset="0"></audio>

<!-- Track 2: Voice (Starts at 2s) -->
<audio id="voice-track" src="..." data-helios-offset="2"></audio>

<!-- Track 3: Muted -->
<audio id="muted-track" src="..." muted loop></audio>
```

In the script, we simply initialize Helios:

```javascript
import { Helios } from '@helios-project/core';

const helios = new Helios({
  duration: 5,
  fps: 30,
  autoSyncAnimations: true // Syncs CSS animations
});

helios.bindToDocumentTimeline();
```

We can also drive visual elements based on time:

```javascript
helios.subscribe((state) => {
  // Voice Indicator Logic: Visible after 2 seconds
  if (state.currentTime >= 2) {
    voiceVisual.style.opacity = 1;
  } else {
    voiceVisual.style.opacity = 0;
  }
});
```

## Note on Offsets

The `data-helios-offset` attribute is crucial for the Renderer to mix audio correctly. In the browser preview (`DomDriver`), offsets are approximated by checking `currentTime`, but precise mixing happens during the FFmpeg render process.
