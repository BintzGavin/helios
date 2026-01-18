# Design Note: Canvas MVP Verification and Diagnostics

**Date:** 2026-01-15
**Status:** Proposed

## Problem
The current codebase contains a `Renderer` class and a `simple-canvas-animation` example, but it is unverified in the current execution environment. Furthermore, the README mentions a `helios.diagnose()` tool for checking FFmpeg and GPU status, which does not exist. The current renderer implementation uses `canvas.toDataURL()` via Playwright, which is a "v0" approach compared to the planned WebCodecs path.

## Context
- **Goal:** Establish a working baseline for the Canvas MVP.
- **Current Architecture:** Playwright launches a page -> Scripts drive `document.timeline.currentTime` -> `canvas.toDataURL` -> Pipe to FFmpeg stdin -> MP4 output.

## Options Considered
1.  **Implement WebCodecs immediately:** Too risky for a single day; requires significant complex bridge code.
2.  **Verify current path and add diagnostics:** Validates the existing code, improves DX, and lays the groundwork for stability.

## Chosen Approach
We will verifying the current "Canvas via Playwright" path. This involves:
1.  Running the existing render script.
2.  Implementing the missing `diagnose` utility to check for FFmpeg binaries and Playwright browser installation.
3.  Updating the `Renderer` to be more robust (better error messages).

## Acceptance Criteria
- [ ] `npm run render:canvas-example` produces a valid `.mp4` file in `output/`.
- [ ] `npm run diagnose` (new script) reports the status of FFmpeg and Playwright.
- [ ] Documentation is updated to reflect how to run the example.
