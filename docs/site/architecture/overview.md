---
title: "Architecture Overview"
description: "High-level overview of the Helios Engine architecture."
---

# Architecture Overview

Helios is designed as a modular system for programmatic video creation.

## Core Components

### 1. Core (`@helios-project/core`)
The brain of the operation. It manages:
- **State**: Current frame, time, playing status.
- **Timing**: Driving the animation loop via `TimeDriver` (either `requestAnimationFrame` for preview or `SeekTimeDriver`/`CdpTimeDriver` for rendering).
- **Primitives**: Signals, sequences, and helpers.

### 2. Player (`@helios-project/player`)
The visual interface.
- **Web Component**: `<helios-player>` provides a standard interface.
- **Bridge**: Communicates with the composition (often running in an iframe) to control playback and retrieve frames.
- **Export**: Captures frames from the DOM or Canvas.

### 3. Renderer (`@helios-project/renderer`)
The production engine.
- **Headless Chrome**: Loads the composition in a controlled environment.
- **Frame Capture**: deterministic frame-by-frame advancement and capture.
- **FFmpeg**: Encodes captured frames into a video file.

## The Data Flow

1.  **Composition** initializes `Helios` and binds to a timeline.
2.  **Player/Renderer** takes control of the timeline.
3.  **Loop**:
    - **Driver** sets time.
    - **Helios** updates state.
    - **Composition** reacts (updates DOM/Canvas).
    - **Driver** captures frame (if rendering).
