# Status: DEMO (Planner)
**Version**: 1.4.0

## Vision
To provide comprehensive, idiomatic examples for every major framework (React, Vue, Svelte, Vanilla) and robust end-to-end testing to ensure the Helios engine delivers on its "Use What You Know" promise.

## Current State
- **Vanilla JS (Canvas)**: ✅ `examples/simple-canvas-animation` exists and works.
- **Vanilla JS (DOM)**: ✅ `examples/simple-animation` exists and works.
- **React**: ✅ `examples/react-canvas-animation` exists and works.
- **Vue**: ✅ `examples/vue-canvas-animation` exists and works.
- **Svelte**: ✅ `examples/svelte-canvas-animation` exists and works.
- **Three.js**: ❌ Missing (Planned).
- **E2E Tests**: ✅ Verified all existing examples via `tests/e2e/verify-render.ts`.

## Backlog
- [ ] Scaffold Three.js Example (`examples/threejs-canvas-animation`)
- [x] Scaffold React Example (`examples/react-canvas-animation`)
- [x] Scaffold Vue Example (`examples/vue-canvas-animation`)
- [x] Scaffold Svelte Example
- [x] Verify E2E tests for examples
- [x] Verify DOM rendering example

## Log
- [v1.4.0] 📋 Planned: Scaffold Three.js Example - Created spec file `/.sys/plans/2025-02-14-DEMO-ThreeJS.md` to guide implementation of the missing Three.js example.
- [v1.3.0] ✅ Completed: Verify DOM Render - Updated `tests/e2e/verify-render.ts` to include the DOM rendering test case and verified it passes.
- [v1.2.0] ✅ Completed: Expand E2E Tests - Refactored `tests/e2e/verify-render.ts` to verify all 4 examples (Canvas, React, Vue, Svelte).
- [v1.1.0] ✅ Completed: Scaffold Svelte Example - Created `examples/svelte-canvas-animation` and verification script.
- [2026-01-22] ✅ Completed: Verify Vue Example - Verified build and render of `examples/vue-canvas-animation`. Created `tests/e2e/verify-render.ts` for verification.
