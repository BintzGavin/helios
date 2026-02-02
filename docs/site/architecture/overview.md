---
title: "Architecture Overview"
description: "High-level overview of the Helios Engine architecture."
---

# Architecture Overview

Helios is designed as a modular system for programmatic video creation.

## Core Components

### 1. Core (`@helios-project/core`)
The brain of the operation. It manages:
- **State**: Current frame, time, playing status, audio tracks, and captions.
- **Timing**: Driving the animation loop via `TimeDriver` (either `requestAnimationFrame` for preview or `SeekTimeDriver`/`CdpTimeDriver` for rendering).
- **Primitives**: Signals (reactive state), sequences, and animation helpers.
- **Diagnostics**: Environment capability checks (WebCodecs, WAAPI).

### 2. Player (`@helios-project/player`)
The visual interface.
- **Web Component**: `<helios-player>` provides a standard, customizable interface.
- **Bridge**: Communicates with the composition (often running in an iframe) to control playback and retrieve frames.
- **Export**: Captures frames directly from the browser (DOM or Canvas) for quick client-side previews.

### 3. Renderer (`@helios-project/renderer`)
The production engine.
- **Headless Chrome**: Loads the composition in a controlled, isolated environment.
- **Frame Capture**: Enforces deterministic frame-by-frame advancement and capture.
- **FFmpeg**: Encodes captured frames into high-quality video files (H.264, VP9, AV1).

## The Data Flow

1.  **Composition** initializes `Helios` and binds to a timeline.
2.  **Player/Renderer** takes control of the timeline (via Bridge or Direct access).
3.  **Loop**:
    - **Driver** sets the time (e.g. `document.timeline.currentTime`).
    - **Helios** updates its internal reactive state (signals).
    - **Composition** reacts (updates DOM, Canvas, or Three.js scene).
    - **Driver** waits for stability (fonts, images, seek).
    - **Driver** captures the frame (if rendering).
