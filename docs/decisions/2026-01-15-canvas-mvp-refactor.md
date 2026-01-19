# Design Note: Canvas MVP Architecture Refinement

## Context
Currently, the "Canvas MVP" works by having a renderer (Node + Playwright) drive `document.timeline.currentTime` and capture frames. The example composition polls `document.timeline` directly. The `Helios` core class exists but is unused.

## Problem
The `Helios` class is intended to be the "Headless Logic Engine". Bypassing it means we aren't testing our core architecture. The renderer should ideally interact with `Helios` or at least `Helios` should be aware of the timeline state.

## Goal
Make `Helios` the source of truth for the composition's state, even when driven by the external renderer via `document.timeline`.

## Approach
1.  **Update `Helios` Class**: Add a mode or method to sync with `document.timeline`.
    - `helios.autoSyncWithDocumentTimeline()`: When called, `Helios` will start a loop (or use events if available, but loop is safer for now) to update its internal `currentFrame` based on `document.timeline.currentTime`.
    - Alternatively, since `Helios` manages `currentFrame`, maybe `Helios` should *set* `document.timeline.currentTime`?
    - **Decision**: The Renderer controls the "Master Clock". In the browser context, `document.timeline` is a good proxy for that Master Clock. `Helios` should *observe* `document.timeline` when in "render mode" or "player mode", but `Helios` also has `play()`/`pause()` which *drives* the clock.
    - **Unified Logic**:
        - If `Helios` is "playing" (interactive mode), it increments time and *sets* `document.timeline.currentTime` (to sync WAAPI).
        - If `Helios` is being "driven" (render mode), it *reads* `document.timeline.currentTime`?
        - Actually, the README says "the engine... sets the timeline's current time programmatically". This refers to the *Renderer*.
        - So when the Renderer runs, `document.timeline` is being set externally. `Helios` should reflect this.
        - `Helios` should probably just wrap `document.timeline` if it exists.

2.  **Proposed `Helios` Update**:
    - Add `bindToDocumentTimeline()` method.
    - When bound, `Helios` reads `document.timeline.currentTime` on every animation frame and updates its state, notifying subscribers.
    - This allows user code to just subscribe to `Helios` and be agnostic to *who* is driving the time (Renderer, or Helios internal loop).

## Scope for Today
1.  Modify `packages/core/src/index.ts` to add `bindToDocumentTimeline()`.
2.  Refactor `examples/simple-canvas-animation` to use `Helios`.
3.  Ensure `npm run render:canvas-example` still produces a valid video.
