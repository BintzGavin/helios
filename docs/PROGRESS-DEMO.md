## DEMO v1.88.0
- ✅ Completed: React Lottie Animation - Created `examples/react-lottie-animation` demonstrating Lottie integration with React and Helios, using `lottie-web` and `useVideoFrame` hook for frame-precise control.

## DEMO v1.87.1
- ✅ Completed: React Audio Visualization - Created `examples/react-audio-visualization` demonstrating real-time audio analysis (RMS, waveforms) using synthesized `AudioBuffer` and React Hooks.

## DEMO v1.87.0
- ✅ Completed: Fix GSAP Sync - Fixed synchronization issue in `examples/promo-video` using `helios.registerStabilityCheck` and enhanced `tests/e2e/verify-render.ts` with custom duration/brightness checks.

## DEMO v1.86.1
- ✅ Verified: Vanilla Transitions - Verified build and E2E tests for the existing implementation.

## DEMO v1.86.0
- ✅ Completed: Vanilla Transitions - Created `examples/vanilla-transitions` demonstrating sequenced scene transitions using Vanilla JS and the `sequence()` utility.

## DEMO v1.85.1
- ✅ Completed: Update Documentation - Updated `examples/README.md` and `/.sys/llmdocs/context-demo.md` to reflect the current state of examples, including new Captions and Three.js integration examples.

## DEMO v1.85.0
- ✅ Completed: Vanilla Captions Animation - Created `examples/vanilla-captions-animation` demonstrating Helios captions (SRT) support in Vanilla TypeScript, replacing the legacy `examples/captions-animation`.

## DEMO v1.84.0
- ✅ Completed: Solid Captions Animation - Created `examples/solid-captions-animation` demonstrating Helios captions (SRT) support in SolidJS.

## DEMO v1.83.0
- ✅ Completed: Solid Three.js Canvas Animation - Created `examples/solid-threejs-canvas-animation` demonstrating Three.js integration with SolidJS and Helios.

## DEMO v1.82.0
- ✅ Completed: Svelte Three.js Canvas Animation - Created `examples/svelte-threejs-canvas-animation` demonstrating Three.js integration with Svelte and Helios.

## DEMO v1.81.0
- ✅ Completed: Vue Three.js Canvas Animation - Created `examples/vue-threejs-canvas-animation` demonstrating Three.js integration with Vue 3 and Helios.

## DEMO v1.80.0
- ✅ Completed: Svelte Captions Animation - Created `examples/svelte-captions-animation` demonstrating Helios captions (SRT) support in Svelte.

## DEMO v1.79.1
- ✅ Verified: Promo Video GSAP Sync - Confirmed that running the dev server from the project root resolves module resolution issues, allowing the Promo Video example to render correctly with full content.

## DEMO v1.79.0
- ✅ Completed: Vue Captions Animation - Created `examples/vue-captions-animation` demonstrating how to use Helios captions with Vue 3 composition API.

## DEMO v1.78.1
- ✅ Completed: Enhance Render Verification - Updated `tests/e2e/verify-render.ts` to verify output video content (duration and non-black frames) using FFmpeg, ensuring silent rendering failures are caught.

## DEMO v1.78.0
- ✅ Completed: Verify Promo Video - Confirmed Promo Video example renders correctly, unblocking the demo.

## DEMO v1.77.0
- ✅ Completed: Update Animation Helpers - Added `interpolate` and `spring` examples to Vue, Svelte, and Solid examples.

## DEMO v1.76.1
- ✅ Verified: Diagnostics Example - Verified build and structure of `examples/diagnostics`. Note: E2E verification blocked by systemic environment issue.

## DEMO v1.76.0
- ✅ Completed: Diagnostics Example - Created `examples/diagnostics` to demonstrate `Helios.diagnose()` and provide a runnable environment check.

## DEMO v1.75.0
- ✅ Completed: Vanilla TypeScript Example - Created `examples/vanilla-typescript` to demonstrate idiomatic TypeScript usage without frameworks.

## DEMO v1.74.1
- ✅ Completed: Create Examples Documentation - Added `examples/README.md` to catalog and describe all available examples.

## DEMO v1.74.0
- ✅ Completed: Upgrade Client-Side Export Verification - Refactored `verify-client-export.ts` to dynamically discover and test all examples using a generic `dynamic-player.html` fixture.

## DEMO v1.73.0
- ✅ Completed: Code Walkthrough Example - Created `examples/code-walkthrough` demonstrating syntax highlighting and line focusing for developer content.

## DEMO v1.72.0
- ✅ Completed: Verify Player - Added E2E verification for the `<helios-player>` Web Component.

## DEMO v1.71.0
- ✅ Completed: Scaffold React Captions Animation - Created `examples/react-captions-animation` demonstrating `useCaptions` hook for integrating Helios SRT parsing with React.

## DEMO v1.70.2
- ✅ Completed: Document Client-Side Export - Added README to `examples/client-export-api` explaining BridgeController and ClientSideExporter usage.

## DEMO v1.70.1
- ✅ Completed: Re-verify Client-Side Export - Confirmed successful build and E2E verification of the client-side export example.

## DEMO v1.70.0
- ✅ Completed: Dynamic Verification Pipeline - Refactored build and test scripts to dynamically discover examples, reducing maintenance burden and enabling unified verification via 'verify:e2e'.

## DEMO v1.69.1
- ✅ Completed: Polish Client-Side Export Example - Added documentation comments to `examples/client-export-api` and re-verified functionality.

## DEMO v1.69.0
- ✅ Completed: Verify Client-Side Export - Added E2E verification test `tests/e2e/verify-client-export.ts` and updated build config aliases.

## DEMO v1.68.0
- ✅ Completed: Update React Animation Helpers - Updated `examples/react-animation-helpers` to demonstrate `interpolate` and `spring` helper functions. Enhanced `tests/e2e/verify-render.ts` to support filtering via command line arguments.

## DEMO v1.67.0
- ✅ Completed: Client-Side Export API Example - Created `examples/client-export-api` demonstrating `ClientSideExporter` usage.

## DEMO v1.66.0
- ✅ Completed: Solid Canvas Example - Verified existing implementation of `examples/solid-canvas-animation` matches spec and passes E2E tests.

## DEMO v1.65.0
- ✅ Completed: Scaffold React Example - Verified existing implementation of `examples/react-canvas-animation`.

## DEMO v1.64.1
- ✅ Completed: Verify Podcast Visualizer - Re-verified `examples/podcast-visualizer` implementation, ensuring multi-track audio mixing, muted attribute handling, and offset timing work correctly in the E2E pipeline.
- 🔧 Fixed: Core Build Issues - Fixed TypeScript errors in `packages/core` (missing `currentTime` in tests, `experimental-webgl` casting, `VideoEncoder` check) to enable successful build and verification.

## DEMO v1.64.0
- ✅ Completed: Implement SolidJS Series Component - Added `<Series>` component to `examples/solid-animation-helpers` and updated example to demonstrate it.

## DEMO v1.63.0
- ✅ Completed: Verify Podcast Visualizer - Verified `examples/podcast-visualizer` implementation, specifically testing multi-track audio mixing, muted attribute handling, and offset timing in the E2E pipeline.

## DEMO v1.62.1
- ✅ Completed: Verify Dom Render - Verified that DOM-based compositions render correctly in the E2E pipeline.

## DEMO v1.62.0
- ✅ Completed: Stress Test Animation - Created `examples/stress-test-animation/composition.html` with 2500 elements and updated build config.

## DEMO v1.61.1
- ✅ Completed: Verify Solid Animation Helpers - Added `examples/solid-animation-helpers` to `tests/e2e/verify-render.ts`. Verified all 47 examples pass.

## DEMO v1.61.0
- ✅ Completed: Web Component Animation - Created `examples/web-component-animation` demonstrating Shadow DOM and CSS animation integration.

## DEMO v1.60.0
- ✅ Completed: Verify Promo Video - Integrated `examples/promo-video` into verification pipeline and documentation.

## DEMO v1.59.1
- ✅ Completed: Verify Podcast Visualizer - Verified `examples/podcast-visualizer` implementation matches spec and passes E2E verification.

## DEMO v1.59.0
- ✅ Completed: Solid Transitions Example - Created `examples/solid-transitions` demonstrating how to synchronize CSS animations in SolidJS using `autoSyncAnimations: true` and `animation-delay`. Verified with E2E tests.

## DEMO v1.56.0
- ✅ Completed: Solid Animation Helpers Example - Created `examples/solid-animation-helpers` demonstrating idiomatic Sequence component composition in SolidJS.

## DEMO v1.55.0
- ✅ Completed: Svelte Runes Animation Example - Created `examples/svelte-runes-animation` demonstrating Svelte 5 Runes (`$state`, `$derived`) integration.

## DEMO v1.54.0
- ✅ Completed: Text Effects Animation Example - Created `examples/text-effects-animation` demonstrating Typewriter and Staggered Reveal effects.

## DEMO v1.53.1
- ✅ Completed: Verify Podcast Visualizer - Validated `examples/podcast-visualizer` with E2E tests and fixed workspace dependencies in `renderer` and `player`.

## DEMO v1.53.0
- ✅ Completed: Verify Solid DOM Example - Added Solid DOM to verification registry and verified it passes.

## DEMO v1.52.0
- ✅ Completed: Map Animation Example - Created `examples/map-animation` demonstrating Leaflet integration.

## DEMO v1.51.0
- ✅ Completed: Solid DOM Example - Created `examples/solid-dom-animation` demonstrating integration with SolidJS signals for DOM updates.

## DEMO v1.50.0
- ✅ Completed: Podcast Visualizer - Created `examples/podcast-visualizer` demonstrating multi-track audio mixing and sync verification.

## DEMO v1.13.0
- ✅ Completed: Verify Svelte Animation Helpers - Verified `examples/svelte-animation-helpers` and enabled E2E test.

## DEMO v1.12.0
- ✅ Completed: Update Animation Helpers - Updated `examples/animation-helpers` to demonstrate `sequence` and `series` core functions.

## DEMO v1.11.0
- ✅ Completed: Scaffold React Animation Helpers - Created `examples/react-animation-helpers` with `<Sequence>` component and Context-based timing.

## DEMO v1.15.0
- ✅ Completed: Enable E2E verification for DOM examples - Verified all 14 examples pass, fixed Pixi bug.

## DEMO v1.16.0
- ✅ Completed: Implement React Series Component - Added `<Series>` component to `examples/react-animation-helpers` and updated example to demonstrate it.

## DEMO v1.17.0
- ✅ Completed: Implement Vue Series Component - Added `<Series>` component to `examples/vue-animation-helpers` and updated example to demonstrate it.

## DEMO v1.18.0
- ✅ Completed: Implement React Series Component - Implemented `<Series>` component in `examples/react-animation-helpers` and verified with E2E tests.

## DEMO v1.19.0
- ✅ Completed: Implement Svelte Series Component - Added `<Series>` component to `examples/svelte-animation-helpers` and updated example to use it.

## DEMO v1.20.0
- ✅ Completed: Refactor Simple Animation - Updated `examples/simple-animation` to use native CSS `@keyframes` and `autoSyncAnimations: true`.

## DEMO v1.21.0
- ✅ Completed: GSAP Example - Created `examples/gsap-animation` demonstrating integration with GSAP timelines.

## DEMO v1.22.0
- ✅ Completed: Scaffold Framer Motion Example - Created `examples/framer-motion-animation` demonstrating integration with `framer-motion` via `useMotionValue` and manual time syncing.

## DEMO v1.23.0
- ✅ Completed: Scaffold Lottie Animation Example - Created `examples/lottie-animation` demonstrating integration with `lottie-web` via time-based seeking.

## DEMO v1.25.0
- ✅ Completed: Verify React Series Component - Verified implementation of `<Series>` component in `examples/react-animation-helpers` and confirmed E2E tests pass using `ts-node`.

## DEMO v1.26.0
- ✅ Completed: Scaffold Motion One Example - Created examples/motion-one-animation demonstrating integration with motion library via autoSyncAnimations: true.

## DEMO v1.27.0
- ✅ Completed: Scaffold Captions Animation Example - Created `examples/captions-animation` demonstrating built-in SRT caption support.

## DEMO v1.28.0
- ✅ Completed: Scaffold Signals Animation Example - Created `examples/signals-animation` demonstrating fine-grained reactivity using core signals.

## DEMO v1.29.0
- ✅ Completed: Scaffold React CSS Animation Example - Created `examples/react-css-animation` demonstrating standard CSS animations with `autoSyncAnimations: true`.

## DEMO v1.30.0
- ✅ Completed: Scaffold Dynamic Props Example - Created `examples/dynamic-props-animation` demonstrating `inputProps` and `schema` validation with a React frontend.

## DEMO v1.31.0
- ✅ Completed: Scaffold Media Element Example - Created `examples/media-element-animation` demonstrating `DomDriver` synchronization of native `<video>` and `<audio>` elements.

## DEMO v1.35.0
- ✅ Completed: Scaffold Tailwind CSS Example - Created `examples/tailwind-animation` demonstrating Tailwind v3 integration with proper scoping and build configuration.

## DEMO v1.36.0
- ✅ Completed: Scaffold WAAPI Animation Example - Created `examples/waapi-animation` demonstrating standard Web Animations API integration with `autoSyncAnimations`.

## DEMO v1.37.0
- ✅ Completed: Scaffold P5.js Example - Created `examples/p5-canvas-animation` demonstrating integration with P5.js in Instance Mode.

## DEMO v1.38.0
- 📋 Planned: Scaffold Audio Visualization Example - Created spec file.

## DEMO v1.39.0
- ✅ Completed: Scaffold Audio Visualization Example - Created `examples/audio-visualization` demonstrating synchronous audio generation and visualization using Canvas.

## DEMO v1.40.0
- ✅ Completed: Scaffold Procedural Generation Example - Created `examples/procedural-generation` demonstrating deterministic `random` and `interpolateColors` utilities.

## DEMO v1.41.0
- ✅ Completed: Scaffold Chart.js Animation Example - Created `examples/chartjs-animation` demonstrating integration with Chart.js using synchronous updates.

## DEMO v1.42.0
- ✅ Completed: Document Social Media Story Example - Documented `examples/social-media-story` demonstrating React integration with `autoSyncAnimations` and component composition.

## DEMO v1.44.0
- ✅ Completed: Scaffold React Three Fiber Example - Created `examples/react-three-fiber` demonstrating integration with `@react-three/fiber` using `frameloop="never"` and manual state advancement.

## DEMO v1.45.0
- ✅ Completed: Svelte Transitions Example - Created `examples/svelte-transitions` demonstrating how to synchronize standard CSS animations in Svelte using `autoSyncAnimations` and `animation-delay` with proper seeking support.

## DEMO v1.46.0
- ✅ Completed: Vue Transitions Example - Created `examples/vue-transitions` demonstrating how to synchronize standard CSS animations in Vue using `autoSyncAnimations` and `animation-delay` with proper seeking support.

## DEMO v1.47.0
- ✅ Completed: Variable Font Animation Example - Created `examples/variable-font-animation` demonstrating how to synchronize CSS Variable Font animations using `autoSyncAnimations` with proper seeking support.

## DEMO v1.48.0
- ✅ Completed: React Styled Components Example - Created `examples/react-styled-components` demonstrating integration with `styled-components` via `autoSyncAnimations` and refactored all examples to use source imports.

## DEMO v1.49.1
- ✅ Completed: Solid Canvas Documentation - Added README for SolidJS example and verified E2E tests.

## DEMO v1.49.0
- ✅ Completed: Solid Canvas Example - Created `examples/solid-canvas-animation` demonstrating integration with SolidJS and `createHeliosSignal` adapter.

## DEMO v1.57.0
- ✅ Completed: Verify Podcast Visualizer - Found and fixed a bug in `examples/podcast-visualizer` (incorrect usage of `state.currentTime`) and re-verified visual correctness with a custom script.

## DEMO v1.58.0
- ✅ Completed: Refine Podcast Visualizer - Updated audio source to a 440Hz sine wave to enable audible verification of mixing logic.

### DEMO v1.69.0
- ✅ Completed: Verify Client-Side Export - Added E2E verification test `tests/e2e/verify-client-export.ts` and updated build config aliases.
