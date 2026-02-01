---
title: "Demo Changelog"
description: "Changelog for the Demo package and examples"
---

# Demo Changelog

## v1.79.0
- **Vue Captions Animation**: Created `examples/vue-captions-animation` demonstrating how to use Helios captions with Vue 3 composition API.

## v1.78.1
- **Enhance Render Verification**: Updated `tests/e2e/verify-render.ts` to verify output video content (duration and non-black frames) using FFmpeg, ensuring silent rendering failures are caught.

## v1.78.0
- **Verify Promo Video**: Confirmed Promo Video example renders correctly, unblocking the demo.

## v1.77.0
- **Update Animation Helpers**: Added `interpolate` and `spring` examples to Vue, Svelte, and Solid examples.

## v1.76.0
- **Diagnostics Example**: Created `examples/diagnostics` to demonstrate `Helios.diagnose()` and provide a runnable environment check.

## v1.75.0
- **Vanilla TypeScript Example**: Created `examples/vanilla-typescript` to demonstrate idiomatic TypeScript usage without frameworks.

## v1.74.0
- **Dynamic Verification Pipeline**: Refactored `verify-client-export.ts` to dynamically discover and test all examples using a generic `dynamic-player.html` fixture.
- **Create Examples Documentation**: Added `examples/README.md` to catalog and describe all available examples.

## v1.71.0
- **Scaffold React Captions Animation**: Created `examples/react-captions-animation` demonstrating `useCaptions` hook for integrating Helios SRT parsing with React.

## v1.70.2
- **Document Client-Side Export**: Added README to `examples/client-export-api` and re-verified functionality.

## v1.70.1
- **Re-verify Client-Side Export**: Confirmed successful build and E2E verification of the client-side export example.

## v1.70.0
- **Dynamic Verification Pipeline**: Refactored build and test scripts to dynamically discover examples, reducing maintenance burden and enabling unified verification via 'verify:e2e'.

## v1.69.1
- **Polish Client-Side Export Example**: Added documentation comments to `examples/client-export-api` and re-verified functionality.

## v1.68.0
- **Update React Animation Helpers**: Updated `examples/react-animation-helpers` to demonstrate `interpolate` and `spring` helper functions. Enhanced `tests/e2e/verify-render.ts` to support filtering via command line arguments.

## v1.67.0
- **Client-Side Export API Example**: Created `examples/client-export-api` demonstrating `ClientSideExporter` usage.

## v1.66.0
- **Solid Canvas Example**: Verified existing implementation of `examples/solid-canvas-animation` matches spec and passes E2E tests.

## v1.65.0
- **Scaffold React Example**: Verified existing implementation of `examples/react-canvas-animation`.

## v1.64.1
- **Verify Podcast Visualizer**: Re-verified `examples/podcast-visualizer` implementation, ensuring multi-track audio mixing, muted attribute handling, and offset timing work correctly in the E2E pipeline.
- **Fixed Core Build Issues**: Fixed TypeScript errors in `packages/core` to enable successful build and verification.

## v1.64.0
- **Implement SolidJS Series Component**: Added `<Series>` component to `examples/solid-animation-helpers` and updated example to demonstrate it.

## v1.63.0
- **Verify Podcast Visualizer**: Verified `examples/podcast-visualizer` implementation, specifically testing multi-track audio mixing, muted attribute handling, and offset timing in the E2E pipeline.

## v1.62.1
- **Verify Dom Render**: Verified that DOM-based compositions render correctly in the E2E pipeline.

## v1.62.0
- **Stress Test Animation**: Created `examples/stress-test-animation/composition.html` with 2500 elements and updated build config.

## v1.61.1
- **Verify Solid Animation Helpers**: Added `examples/solid-animation-helpers` to `tests/e2e/verify-render.ts`. Verified all 47 examples pass.

## v1.61.0
- **Web Component Animation**: Created `examples/web-component-animation` demonstrating Shadow DOM and CSS animation integration.

## v1.60.0
- **Verify Promo Video**: Integrated `examples/promo-video` into verification pipeline and documentation.

## v1.59.1
- **Verify Podcast Visualizer**: Verified `examples/podcast-visualizer` implementation matches spec and passes E2E verification.

## v1.59.0
- **Solid Transitions Example**: Created `examples/solid-transitions` demonstrating how to synchronize CSS animations in SolidJS using `autoSyncAnimations: true` and `animation-delay`. Verified with E2E tests.

## v1.56.0
- **Solid Animation Helpers Example**: Created `examples/solid-animation-helpers` demonstrating idiomatic Sequence component composition in SolidJS.

## v1.55.0
- **Svelte Runes Animation Example**: Created `examples/svelte-runes-animation` demonstrating Svelte 5 Runes (`$state`, `$derived`) integration.

## v1.54.0
- **Text Effects Animation Example**: Created `examples/text-effects-animation` demonstrating Typewriter and Staggered Reveal effects.

## v1.53.1
- **Verify Podcast Visualizer**: Validated `examples/podcast-visualizer` with E2E tests and fixed workspace dependencies in `renderer` and `player`.

## v1.53.0
- **Verify Solid DOM Example**: Added Solid DOM to verification registry and verified it passes.

## v1.52.0
- **Map Animation Example**: Created `examples/map-animation` demonstrating Leaflet integration.

## v1.51.0
- **Solid DOM Example**: Created `examples/solid-dom-animation` demonstrating integration with SolidJS signals for DOM updates.

## v1.50.0
- **Podcast Visualizer**: Created `examples/podcast-visualizer` demonstrating multi-track audio mixing and sync verification.

## v1.49.1
- **Solid Canvas Documentation**: Added README for SolidJS example and verified E2E tests.

## v1.49.0
- **Solid Canvas Example**: Created `examples/solid-canvas-animation` demonstrating integration with SolidJS and `createHeliosSignal` adapter.

## v1.48.0
- **React Styled Components Example**: Created `examples/react-styled-components` demonstrating integration with `styled-components` via `autoSyncAnimations` and refactored all examples to use source imports.

## v1.47.0
- **Variable Font Animation Example**: Created `examples/variable-font-animation` demonstrating how to synchronize CSS Variable Font animations using `autoSyncAnimations` with proper seeking support.

## v1.46.0
- **Vue Transitions Example**: Created `examples/vue-transitions` demonstrating how to synchronize standard CSS animations in Vue using `autoSyncAnimations` and `animation-delay` with proper seeking support.

## v1.44.0
- **Scaffold React Three Fiber Example**: Created `examples/react-three-fiber` demonstrating integration with `@react-three/fiber` using `frameloop="never"` and manual state advancement.

## v1.43.0
- **Create React Transitions Example**: Created `examples/react-transitions` demonstrating how to synchronize CSS animations with Helios timeline using `autoSyncAnimations` and `animation-delay`.

## v1.37.0
- **Scaffold P5.js Example**: Created `examples/p5-canvas-animation` demonstrating integration with P5.js in Instance Mode.

## v1.36.0
- **Scaffold WAAPI Animation Example**: Created `examples/waapi-animation` demonstrating standard Web Animations API integration with `autoSyncAnimations`.

## v1.35.0
- **Scaffold Tailwind CSS Example**: Created `examples/tailwind-animation` demonstrating Tailwind v3 integration with proper scoping and build configuration.

## v1.33.0
- **Scaffold D3 Animation Example**: Created `examples/d3-animation` demonstrating data visualization with D3.js and frame-based updates.

## v1.31.0
- **Scaffold Media Element Example**: Created `examples/media-element-animation` demonstrating `DomDriver` synchronization of native `<video>` and `<audio>` elements.

## v1.30.0
- **Scaffold Dynamic Props Example**: Created `examples/dynamic-props-animation` demonstrating `inputProps` and `schema` validation with a React frontend.

## v1.29.0
- **Scaffold React CSS Animation Example**: Created `examples/react-css-animation` demonstrating standard CSS animations with `autoSyncAnimations: true`.

## v1.28.0
- **Scaffold Signals Animation Example**: Created `examples/signals-animation` demonstrating fine-grained reactivity using core signals.

## v1.27.0
- **Scaffold Captions Animation Example**: Created `examples/captions-animation` demonstrating built-in SRT caption support.

## v1.26.0
- **Scaffold Motion One Example**: Created `examples/motion-one-animation` demonstrating integration with motion library via `autoSyncAnimations: true`.

## v1.23.0
- **Scaffold Lottie Animation Example**: Created `examples/lottie-animation` demonstrating integration with `lottie-web` via time-based seeking.

## v1.22.0
- **Scaffold Framer Motion Example**: Created `examples/framer-motion-animation` demonstrating integration with `framer-motion` via `useMotionValue` and manual time syncing.

## v1.21.0
- **GSAP Example**: Created `examples/gsap-animation` demonstrating integration with GSAP timelines.

## v1.20.0
- **Refactor Simple Animation**: Updated `examples/simple-animation` to use native CSS `@keyframes` and `autoSyncAnimations: true`.

## v1.19.0
- **Implement Svelte Series Component**: Added `<Series>` component to `examples/svelte-animation-helpers` and updated example to use it.

## v1.18.0
- **Implement React Series Component**: Implemented `<Series>` component in `examples/react-animation-helpers` and verified with E2E tests.

## v1.17.0
- **Implement Vue Series Component**: Added `<Series>` component to `examples/vue-animation-helpers` and updated example to demonstrate it.

## v1.16.0
- **Implement React Series Component**: Added `<Series>` component to `examples/react-animation-helpers` and updated example to demonstrate it.

## v1.15.0
- **Enable E2E verification for DOM examples**: Verified all 14 examples pass, fixed Pixi bug.

## v1.13.0
- **Verify Svelte Animation Helpers**: Verified `examples/svelte-animation-helpers` and enabled E2E test.

## v1.12.0
- **Update Animation Helpers**: Updated `examples/animation-helpers` to demonstrate `sequence` and `series` core functions.

## v1.11.0
- **Scaffold React Animation Helpers**: Created `examples/react-animation-helpers` with `<Sequence>` component and Context-based timing.
