---
title: "Media Element Animation"
description: "Synchronizing native <video> and <audio> elements with Helios."
---

# Media Element Animation

This example demonstrates how to synchronize native HTML `<video>` and `<audio>` elements with the Helios timeline using the `DomDriver`.

## Overview

Helios can automatically synchronize media elements by setting `autoSyncAnimations: true`. This enables the `DomDriver`, which detects `<video>` and `<audio>` tags and keeps their `currentTime`, `playbackRate`, and `volume` in sync with the Helios state.

## Code Example

```typescript
import { Helios } from '@helios-project/core';

// 1. Setup HTML
document.body.innerHTML = `
  <video id="my-video" src="video.mp4" muted></video>
  <audio id="my-audio" src="audio.mp3"></audio>
`;

// 2. Initialize Helios
const helios = new Helios({
  duration: 10,
  fps: 30,
  // This is the key: enables DomDriver to sync media elements
  autoSyncAnimations: true
});

// 3. Bind to Timeline (for Preview/Render)
helios.bindToDocumentTimeline();
```

## Key Features

- **Automatic Discovery**: The `DomDriver` automatically finds all media elements in the DOM.
- **Seek Synchronization**: Scrubbing the timeline updates the `currentTime` of all media elements.
- **Playback Rate**: Changing the playback speed (e.g. 0.5x, 2x) updates the media `playbackRate`.
- **Looping**: Elements with the `loop` attribute are handled correctly, wrapping their time calculations.

## Rendering

When rendering with `@helios-project/renderer` in `dom` mode, the `SeekTimeDriver` performs the same synchronization, ensuring frame-perfect output.
