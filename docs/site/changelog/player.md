---
title: "Player Changelog"
description: "Changelog for the Player package"
---

# Player Changelog

## v0.26.1
- **Poster Visibility**: Refined logic to prioritize poster visibility over "Loading/Connecting" status overlay during initialization.

## v0.26.0
- **Bridge Error Propagation**: Implemented global error handling in `bridge.ts` and `HeliosController`.

## v0.25.2
- **Polish Burn-In Captions**: Added text shadow to exported captions to match player UI styling and improved code hygiene by preventing canvas state leaks.

## v0.23.0
- **Implement Input Props**: Implemented `input-props` attribute/property on `<helios-player>` to pass dynamic data to the composition controller.

## v0.22.0
- **Export Burn-In Captions**: Implemented caption rendering (burn-in) for client-side export using intermediate OffscreenCanvas.

## v0.21.0
- **Video Inlining**: Implemented `inlineVideos` to capture `<video>` elements as images during client-side export, ensuring visual fidelity.

## v0.20.0
- **Client Side Audio Volume**: Updated exporter to respect `volume` and `muted` attributes of audio elements during client-side export.

## v0.19.0
- **Implement Standard Media API**: Implemented standard media properties (currentTime, duration, etc.) and events (play, pause, timeupdate) for improved interoperability.

## v0.18.0
- **WebM Export**: Implemented `export-format` attribute to support WebM (VP9/Opus) video export alongside MP4.

## v0.17.1
- **Touch Support**: Added touch event listeners to the scrubber to support smooth seeking on mobile devices.

## v0.17.0
- **Implement Captions**: Added caption rendering overlay and "CC" toggle button to `<helios-player>`, leveraging `activeCaptions` from core state.

## v0.16.0
- **Volume Controls**: Implemented volume slider and mute button in UI, updated controllers and bridge protocol.

## v0.15.0
- **Export UX**: Implemented Error Overlay with "Dismiss" action for client-side export failures, providing visibility into errors like unsupported codecs.

## v0.14.0
- **Accessibility Improvements**: Implemented ARIA labels and roles for controls, including dynamic updates for play state and scrubber time.

## v0.13.0
- **Frame-by-Frame Controls**: Implemented `.`/`,` for single-frame stepping and updated Arrow keys to default to 1 frame (10 with Shift).

## v0.12.0
- **Scrubber UX**: Implemented improved scrubber interaction (pause on scrub, anti-jitter) to ensure smooth seeking without fighting the update loop.

## v0.11.1
- **Dom Canvas Capture**: Implemented `inlineCanvases` to replace `<canvas>` elements with data-URI images during DOM export, ensuring mixed content is preserved.

## v0.11.0
- **Lock UI During Export**: Disabled playback controls and keyboard shortcuts during client-side export to ensure data integrity.

## v0.10.1
- **Bridge Documentation**: Added README.md and improved connection error message to guide users towards `connectToParent`.

## v0.10.0
- **CSS Asset Inlining**: Implemented parsing and inlining of assets (images, fonts) referenced in CSS via `url()` as Data URIs for robust DOM export.

## v0.9.0
- **Client-Side Image Inlining**: Implemented fetching and inlining of `<img>` and `background-image` sources as Data URIs for robust DOM export.

## v0.8.1
- **Scaffold Tests (Update)**: Added tests for invalid VideoEncoder configurations and verified test suite.

## v0.8.0
- **Client Side Audio**: Implemented audio capture, mixing (OfflineAudioContext), and encoding (AAC) for client-side export.

## v0.7.0
- **Enable External Stylesheets**: Updated DOM capture to fetch and inline external CSS (`<link rel="stylesheet">`) for high-fidelity exports.

## v0.6.0
- **Keyboard & Fullscreen Support**: Implemented standard keyboard shortcuts (Space, F, Arrows) and Fullscreen UI/logic.

## v0.5.2
- **Scaffold Tests**: Added unit test suite for controllers and exporter using Vitest.

## v0.5.1
- **Standard Attributes**: Implemented `autoplay`, `loop`, and `controls` attributes. Synced version and artifacts.

## v0.5.0
- **Dynamic Sizing**: Implemented `observedAttributes` for `src`, `width`, and `height` to allow dynamic player updates.

## v0.4.0
- **Robust DOM Export**: Implemented XMLSerializer/SVG-based DOM capture for high-fidelity export in Direct and Bridge modes.

## v0.3.3
- **Sync player state with engine state**: Updated Bridge Protocol to include initial state in handshake.

## v0.3.2
- **Variable Speed**: Added `setPlaybackRate` to `HeliosController` and Speed Selector UI to `<helios-player>`.

## v0.3.1
- **Loading UI**: Verified implementation of loading and error state overlays.

## v0.3.0
- **Export Config**: Added `export-mode` and `canvas-selector` attributes for explicit export control.

## v0.2.0
- **Refactor Player Export**: Extracted `ClientSideExporter`, added cancellation support, and modularized controllers.
