---
title: "Player Changelog"
description: "Changelog for the Player package"
---

# Player Changelog

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
