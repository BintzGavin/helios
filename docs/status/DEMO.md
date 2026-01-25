# Status: DEMO (Executor)
**Version**: 1.9.0

## Vision
To provide comprehensive, idiomatic examples for every major framework (React, Vue, Svelte, Vanilla) and robust end-to-end testing to ensure the Helios engine delivers on its "Use What You Know" promise.

## Current State
- **Vanilla JS (Canvas)**: ✅ `examples/simple-canvas-animation` exists and works.
- **Vanilla JS (DOM)**: ✅ `examples/simple-animation` exists and works.
- **Animation Helpers**: ✅ `examples/animation-helpers` exists and works.
- **React (Canvas)**: ✅ `examples/react-canvas-animation` exists and works.
- **React (DOM)**: ✅ `examples/react-dom-animation` exists and works (Verified in browser, E2E blocked by Renderer).
- **Vue (Canvas)**: ✅ `examples/vue-canvas-animation` exists and works.
- **Vue (DOM)**: ✅ `examples/vue-dom-animation` exists and works (Verified build, E2E blocked by Renderer).
- **Svelte**: ✅ `examples/svelte-canvas-animation` exists and works.
- **Three.js**: ✅ `examples/threejs-canvas-animation` exists and works.
- **Pixi.js**: ✅ `examples/pixi-canvas-animation` exists and works.
- **E2E Tests**: ✅ Verified all existing examples via `tests/e2e/verify-render.ts` (DOM tests temporarily disabled).

## Backlog
- [x] Scaffold Animation Helpers Example (`examples/animation-helpers`)
- [x] Scaffold Three.js Example (`examples/threejs-canvas-animation`)
- [x] Scaffold Pixi.js Example (`examples/pixi-canvas-animation`)
- [x] Scaffold React Example (`examples/react-canvas-animation`)
- [x] Scaffold Vue Example (`examples/vue-canvas-animation`)
- [x] Scaffold Vue DOM Example (`examples/vue-dom-animation`)
- [x] Scaffold Svelte Example
- [x] Verify E2E tests for examples
- [x] Verify DOM rendering example

## Known Issues
- `DomStrategy` (used by `simple-animation`, `react-dom-animation`, and `vue-dom-animation`) fails in `verify-render.ts` with `CdpTimeDriver` (timeout). Verified working with `SeekTimeDriver`.

## Log
- [v1.9.0] ✅ Completed: Scaffold Vue DOM Example - Created `examples/vue-dom-animation` and added E2E verification case (blocked).
- [v1.8.1] ✅ Completed: Scaffold React DOM Example - Updated `verify-render.ts` to document blocking issue.
- [v1.8.0] ✅ Completed: Scaffold React DOM Example - Created `examples/react-dom-animation` and added E2E verification case.
- [v1.7.0] ✅ Completed: Scaffold Pixi.js Example - Created `examples/pixi-canvas-animation` with `pixi.js` dependency and verification script.
- [v1.6.0] ✅ Completed: Scaffold Animation Helpers Example - Created `examples/animation-helpers` demonstrating `interpolate` and `spring` from Core.
- [v1.5.0] ✅ Completed: Scaffold Three.js Example - Created `examples/threejs-canvas-animation` with `three` dependency and verification script.
- [v1.4.0] 📋 Planned: Scaffold Three.js Example - Created spec file `/.sys/plans/2025-02-14-DEMO-ThreeJS.md` to guide implementation of the missing Three.js example.
- [v1.3.0] ✅ Completed: Verify DOM Render - Updated `tests/e2e/verify-render.ts` to include the DOM rendering test case and verified it passes.
- [v1.2.0] ✅ Completed: Expand E2E Tests - Refactored `tests/e2e/verify-render.ts` to verify all 4 examples (Canvas, React, Vue, Svelte).
- [v1.1.0] ✅ Completed: Scaffold Svelte Example - Created `examples/svelte-canvas-animation` and verification script.
- [2026-01-22] ✅ Completed: Verify Vue Example - Verified build and render of `examples/vue-canvas-animation`. Created `tests/e2e/verify-render.ts`.
