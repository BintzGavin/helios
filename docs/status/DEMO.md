# Status: DEMO (Executor)
**Version**: 1.28.0

## Vision
To provide comprehensive, idiomatic examples for every major framework (React, Vue, Svelte, Vanilla) and robust end-to-end testing to ensure the Helios engine delivers on its "Use What You Know" promise.

## Current State
- **Vanilla JS (Canvas)**: ✅ `examples/simple-canvas-animation` exists and works.
- **Vanilla JS (DOM)**: ✅ `examples/simple-animation` exists and works.
- **GSAP**: ✅ `examples/gsap-animation` exists and works.
- **Framer Motion**: ✅ `examples/framer-motion-animation` exists and works.
- **Lottie**: ✅ `examples/lottie-animation` exists and works.
- **Motion One**: ✅ `examples/motion-one-animation` exists and works.
- **Captions**: ✅ `examples/captions-animation` exists and works (Demonstrates built-in SRT captions).
- **Signals**: ✅ `examples/signals-animation` exists and works (Demonstrates `signal`, `computed`, `effect`).
- **Animation Helpers**: ✅ `examples/animation-helpers` exists and works (Demonstrates `interpolate`, `spring`, `sequence`, `series`).
- **React (Canvas)**: ✅ `examples/react-canvas-animation` exists and works.
- **React (DOM)**: ✅ `examples/react-dom-animation` exists and works.
- **React (Helpers)**: ✅ `examples/react-animation-helpers` exists and works (Demonstrates `<Sequence>`, `<Series>`).
- **Vue (Canvas)**: ✅ `examples/vue-canvas-animation` exists and works.
- **Vue (DOM)**: ✅ `examples/vue-dom-animation` exists and works.
- **Vue (Helpers)**: ✅ `examples/vue-animation-helpers` exists and works (Demonstrates `<Sequence>`, `<Series>`).
- **Svelte**: ✅ `examples/svelte-canvas-animation` exists and works.
- **Svelte (Helpers)**: ✅ `examples/svelte-animation-helpers` exists and works (Demonstrates `<Sequence>`, `<Series>`).
- **Three.js**: ✅ `examples/threejs-canvas-animation` exists and works.
- **Pixi.js**: ✅ `examples/pixi-canvas-animation` exists and works.
- **E2E Tests**: ✅ Verified all existing examples via `tests/e2e/verify-render.ts`.

## Backlog
- [x] Scaffold Captions Animation Example (`examples/captions-animation`)
- [x] Scaffold Svelte Animation Helpers (`examples/svelte-animation-helpers`)
- [x] Scaffold Animation Helpers Example (`examples/animation-helpers`)
- [x] Scaffold Three.js Example (`examples/threejs-canvas-animation`)
- [x] Scaffold Pixi.js Example (`examples/pixi-canvas-animation`)
- [x] Scaffold React Example (`examples/react-canvas-animation`)
- [x] Scaffold Vue Example (`examples/vue-canvas-animation`)
- [x] Scaffold Vue DOM Example (`examples/vue-dom-animation`)
- [x] Scaffold Svelte Example
- [x] Verify E2E tests for examples
- [x] Verify DOM rendering example
- [x] Scaffold Framer Motion Example
- [x] Scaffold Lottie Animation Example
- [x] Scaffold Motion One Example
- [x] Scaffold Signals Animation Example

## Known Issues
None.

## Log
- [v1.28.0] ✅ Completed: Scaffold Signals Animation Example - Created `examples/signals-animation` demonstrating fine-grained reactivity using core signals.
- [v1.28.0] 📋 Planned: Scaffold Signals Animation Example - Created spec file `/.sys/plans/2025-02-20-DEMO-SignalsAnimation.md` to guide implementation of high-performance signal-based animation.
- [v1.27.0] ✅ Completed: Scaffold Captions Animation Example - Created `examples/captions-animation` demonstrating built-in SRT caption support.
- [v1.26.1] 📋 Planned: Scaffold Captions Animation Example - Created spec file `/.sys/plans/2025-02-19-DEMO-CaptionsAnimation.md` to guide implementation of built-in SRT caption support.
- [v1.26.0] ✅ Completed: Scaffold Motion One Example - Created `examples/motion-one-animation` demonstrating integration with `motion` library via `autoSyncAnimations: true`.
- [v1.25.0] ✅ Completed: Verify React Series Component - Verified implementation of `<Series>` component in `examples/react-animation-helpers` and confirmed E2E tests pass using `ts-node`.
- [v1.24.0] 📋 Planned: Scaffold Motion One Example - Created spec file `/.sys/plans/2026-01-26-DEMO-MotionOne.md` to guide integration with `motion` library.
- [v1.23.0] ✅ Completed: Scaffold Lottie Animation Example - Created `examples/lottie-animation` demonstrating integration with `lottie-web` via time-based seeking.
- [v1.22.0] ✅ Completed: Scaffold Framer Motion Example - Created `examples/framer-motion-animation` demonstrating integration with `framer-motion` via `useMotionValue` and manual time syncing.
- [v1.21.0] ✅ Completed: GSAP Example - Created `examples/gsap-animation` demonstrating integration with GSAP timelines.
- [v1.20.0] ✅ Completed: Refactor Simple Animation - Updated `examples/simple-animation` to use native CSS `@keyframes` and `autoSyncAnimations: true` instead of JS-driven CSS variables.
- [v1.19.0] ✅ Completed: Implement Svelte Series Component - Added `<Series>` component to `examples/svelte-animation-helpers` and updated example to use it.
- [v1.18.0] ✅ Completed: Implement React Series Component - Implemented `<Series>` component in `examples/react-animation-helpers` and verified with E2E tests.
- [v1.17.0] ✅ Completed: Implement Vue Series Component - Added `<Series>` component to `examples/vue-animation-helpers` and updated example to demonstrate it.
- [v1.16.0] ✅ Completed: Implement React Series Component - Added `<Series>` component to `examples/react-animation-helpers` and updated example to demonstrate it.
- [v1.15.0] ✅ Completed: Enable E2E verification for DOM examples - Uncommented DOM test cases in `verify-render.ts`, verified all 14 examples pass (using `SeekTimeDriver` for DOM), and fixed a bug in Pixi example.
- [v1.14.0] ✅ Completed: Scaffold Vue Animation Helpers - Created `examples/vue-animation-helpers` with `<Sequence>` component and Provide/Inject timing.
- [v1.13.0] ✅ Completed: Verify Svelte Animation Helpers - Verified `examples/svelte-animation-helpers` and enabled E2E test.
- [v1.12.0] ✅ Completed: Update Animation Helpers - Updated `examples/animation-helpers` to demonstrate `sequence` and `series` core functions.
- [v1.11.0] ✅ Completed: Scaffold React Animation Helpers - Created `examples/react-animation-helpers` with `<Sequence>` component and Context-based timing.
- [v1.10.0] ✅ Completed: Scaffold Svelte DOM Example - Created `examples/svelte-dom-animation` and verified with E2E (commented out).
- [v2.0.0] 📋 Planned: Scaffold Svelte DOM Example - Created spec file `/.sys/plans/2025-02-19-DEMO-SvelteDOM.md` to guide implementation.
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
