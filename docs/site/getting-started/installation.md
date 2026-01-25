---
title: "Installation"
description: "How to install Helios Engine packages."
---

# Installation

Helios Engine is modular. You only install what you need.

## Core Package

The `@helios-project/core` package contains the engine logic, timing drivers, and animation helpers. This is required for any composition.

```bash
npm install @helios-project/core
```

## Player Package

The `@helios-project/player` package provides the `<helios-player>` web component for embedding your compositions in a web page with playback controls.

```bash
npm install @helios-project/player
```

## Renderer Package

The `@helios-project/renderer` package is a Node.js library for rendering your compositions to video files (MP4, etc.) using Headless Chrome and FFmpeg.

```bash
npm install @helios-project/renderer
```

## Requirements

- **Node.js**: v18 or higher recommended.
- **FFmpeg**: Required for the Renderer package to encode video and audio.
- **Chrome/Chromium**: Required for the Renderer (usually installed automatically by Puppeteer/Playwright, or you can point to a local installation).
