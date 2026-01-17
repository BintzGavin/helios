# Design: Diagnostics Tool

**Date**: 2025-01-16
**Status**: Proposed

## Problem Statement
Helios relies on a complex environment involving Node.js, FFmpeg, Playwright (Headless Chrome), and potentially GPU acceleration. Users may face opaque errors if any of these components are missing or misconfigured.

## Context
The README explicitly mentions:
> To combat the common friction of environment configuration, the library will include a built-in diagnostic tool (`helios.diagnose()`) that programmatically checks `chrome://gpu` to verify that hardware acceleration is active.

## Options Considered
1. **Simple Script**: A standalone script that runs checks and logs to console.
2. **Library Function**: A function exported from `packages/renderer` that can be called programmatically.
3. **CLI Command**: A `helios diagnose` command.

## Chosen Approach
We will implement a **Library Function** in `packages/renderer` that is also exposed via a simple npm script (`npm run diagnose`).

The `diagnose()` function will:
1. Check if `@ffmpeg-installer/ffmpeg` returns a valid path.
2. Check if `playwright` can launch a browser.
3. (Stretch) Navigate to `chrome://gpu` and dump the status to check for hardware acceleration.

This fits Helios principles by improving developer experience and providing clear feedback.

## Scope for Today
- Implement `diagnose` function in `packages/renderer/src/diagnose.ts`.
- Add `diagnose` script to `package.json`.
- Verify it correctly identifies the environment.
