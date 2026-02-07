# Status: DEMO Domain

**Version**: 1.128.0

**Posture**: ACTIVELY EXPANDING FOR V2

## Vision
The DEMO domain is responsible for:
1.  **Examples:** Providing clear, idiomatic usage examples for all supported frameworks (React, Vue, Svelte, Vanilla).
2.  **E2E Testing:** Ensuring the rendering pipeline works across all configurations.
3.  **Build Config:** Maintaining the root `vite.config.js` and build scripts to support the examples.

## Blocked Items
- **CLI Registry Components Broken**: The components defined in `packages/cli/src/registry/manifest.ts` use outdated APIs (accessing `helios.config`) which causes runtime errors. The `examples/react-components-demo` has manually fixed versions.

## Active Tasks

## Completed Tasks
- [v1.128.0] ✅ Completed: Standardize Dynamic Props Animation Example - Modernized `examples/dynamic-props-animation` with TypeScript, `package.json`, and proper build config.
- [v1.127.0] ✅ Completed: Standardize React DOM Example - Upgraded `examples/react-dom-animation` to a fully standardized, strictly-typed TypeScript example.
- [v1.126.0] ✅ Completed: Standardize Procedural Generation Example - Modernized `examples/procedural-generation` with TypeScript, `package.json`, and proper build config.
- [v1.125.0] ✅ Completed: Standardize Text Effects Example - Modernized `examples/text-effects-animation` with TypeScript, `package.json`, and proper build config.
- [v1.124.0] ✅ Completed: Standardize Variable Font Animation - Modernized `examples/variable-font-animation` with TypeScript, `package.json`, and build config.
- [v1.123.0] ✅ Completed: Standardize Lottie Animation Example - Modernized `examples/lottie-animation` with TypeScript, `package.json`, and proper build config.
- [v1.122.0] ✅ Completed: Standardize WAAPI Animation Example - Modernized `examples/waapi-animation` with TypeScript, `package.json`, and proper build config.
- [v1.121.0] ✅ Completed: Standardize Motion One Example - Modernized `examples/motion-one-animation` with TypeScript, `package.json`, and proper build config.
- [v1.120.0] ✅ Completed: Standardize GSAP Animation Example - Modernized `examples/gsap-animation` with TypeScript, `package.json`, and proper build config.
- [v1.119.0] ✅ Completed: Standardize Pixi Canvas Example - Modernized `examples/pixi-canvas-animation` with TypeScript, `package.json`, and proper build config.
- [v1.118.0] ✅ Completed: Standardize Simple Animation Example - Modernized `examples/simple-animation` with TypeScript, `package.json`, and proper build config.
- [v1.117.0] ✅ Completed: Standardize P5 Canvas Example - Modernized `examples/p5-canvas-animation` with TypeScript, `package.json`, and proper build config.
- [v1.116.0] ✅ Completed: Standardize React Three Fiber Example - Modernized `examples/react-three-fiber` with TypeScript, `package.json`, and proper build config.
- [v1.115.0] ✅ Completed: Standardize Three.js Canvas Example - Modernized `examples/threejs-canvas-animation` with TypeScript, `package.json`, and proper build config.
- [v1.114.0] ✅ Completed: Solid Chart.js Animation - Created `examples/solid-chartjs-animation` demonstrating Chart.js integration with SolidJS and Helios.
- [v1.113.0] ✅ Completed: Svelte Chart.js Animation - Created `examples/svelte-chartjs-animation` demonstrating Chart.js integration with Svelte 5 and Helios.
- [v1.112.0] ✅ Completed: Vue Chart.js Animation - Created `examples/vue-chartjs-animation` demonstrating Chart.js integration with Vue 3 and Helios.
- [v1.111.0] ✅ Completed: Solid D3 Animation - Created `examples/solid-d3-animation` demonstrating D3.js integration with SolidJS driven by Helios frame clock.
- [v1.110.0] ✅ Completed: React Chart.js Animation - Created `examples/react-chartjs-animation` demonstrating integration with Chart.js using synchronous updates in React.
- [v1.109.0] ✅ Completed: Solid DOM Animation - Created `examples/solid-dom-animation` demonstrating SolidJS integration for DOM-based animations using `createHeliosSignal` and `autoSyncAnimations`.
- [v1.108.0] ✅ Completed: Svelte D3 Animation - Created `examples/svelte-d3-animation` demonstrating D3.js integration with Svelte 5 and Helios.
- [v1.107.0] ✅ Completed: React D3 Animation - Created `examples/react-d3-animation` demonstrating D3.js integration with React.
- [v1.106.0] ✅ Completed: React CSS Animation - Created/Verified `examples/react-css-animation` demonstrating CSS animation sync with `autoSyncAnimations: true`.
- [v1.105.0] ✅ Completed: Vue D3 Animation - Created `examples/vue-d3-animation` demonstrating D3.js integration with Vue 3.
- [v1.104.1] ✅ Verified: Fix Root Build - Verified that root `npm install` and `npm run build:examples` work correctly, confirming that dependency mismatches are resolved.
- [v1.104.0] ✅ Completed: React Components Demo - Created `examples/react-components-demo` to verify and demonstrate registry components (`Timer`, `ProgressBar`, `Watermark`). Note: Discovered and patched broken API usage in the registry components locally.
- [v1.103.0] ✅ Completed: Solid Pixi Animation - Created `examples/solid-pixi-animation` demonstrating integration with PixiJS v8 and SolidJS.
- [v1.102.0] ✅ Completed: Update Client Export Verification - Updated `tests/e2e/verify-client-export.ts` to include recent audio visualization and PixiJS examples in canvas overrides.
- [v1.101.0] ✅ Completed: Svelte Pixi Animation - Created `examples/svelte-pixi-animation` demonstrating integration with PixiJS v8 and Svelte 5.
- [v1.100.0] ✅ Completed: Vue Pixi Animation - Created `examples/vue-pixi-animation` demonstrating integration with PixiJS v8 and Vue 3.
- [v1.99.0] ✅ Completed: Solid Lottie Animation - Created `examples/solid-lottie-animation` demonstrating integration with `lottie-web` in SolidJS.
- [v1.98.0] ✅ Completed: React Pixi Animation - Created `examples/react-pixi-animation` demonstrating integration with PixiJS v8 and React.
- [v1.97.0] ✅ Completed: Svelte Lottie Animation - Created `examples/svelte-lottie-animation` demonstrating integration with `lottie-web` in Svelte 5.
- [v1.96.0] ✅ Completed: Solid Audio Visualization - Created `examples/solid-audio-visualization` demonstrating real-time audio analysis (RMS, waveforms) using synthesized `AudioBuffer` and SolidJS.
- [v1.95.0] ✅ Completed: Vue Lottie Animation - Created `examples/vue-lottie-animation` demonstrating integration with `lottie-web` in Vue 3 driven by Helios timeline.
- [v1.94.0] ✅ Completed: Vue Lottie Animation - Created `examples/vue-lottie-animation` demonstrating integration with `lottie-web` in Vue 3 driven by Helios timeline.
- [v1.93.0] ✅ Completed: React Lottie Animation - Created `examples/react-lottie-animation` demonstrating integration with `lottie-web` in React driven by Helios timeline.
- [v1.92.0] ✅ Completed: Svelte Audio Visualization - Created `examples/svelte-audio-visualization` demonstrating real-time audio analysis (RMS, waveforms) using synthesized `AudioBuffer` and Svelte derived stores.
- [v1.91.0] ✅ Completed: Lottie Animation - Created `examples/lottie-animation` demonstrating integration with `lottie-web` driven by Helios timeline.
- [v1.90.0] ✅ Completed: Vue Audio Visualization - Created `examples/vue-audio-visualization` demonstrating real-time audio analysis (RMS, waveforms) using synthesized `AudioBuffer` and Vue 3.
- [v1.89.0] ✅ Completed: Refactor Podcast Visualizer - Refactored `examples/podcast-visualizer` to use `AudioContext` for real-time analysis, replacing simulated animations.
- [v1.88.0] ✅ Completed: Verify Excalidraw Example - Verified build and rendering of `examples/excalidraw-animation` and added to documentation.
- [v1.87.1] ✅ Completed: React Audio Visualization - Created `examples/react-audio-visualization` demonstrating real-time audio analysis (RMS, waveforms) using synthesized `AudioBuffer` and React Hooks.
- [v1.87.0] ✅ Completed: Fix GSAP Sync - Fixed synchronization issue in `examples/promo-video` using `helios.registerStabilityCheck` and enhanced `tests/e2e/verify-render.ts` with custom duration/brightness checks. Confirmed E2E pass with YMAX=192.
- [v1.86.1] ✅ Verified: Vanilla Transitions - Verified build and E2E tests for the existing implementation to ensure stability.
- [v1.86.0] ✅ Completed: Vanilla Transitions - Created `examples/vanilla-transitions` demonstrating sequenced scene transitions using Vanilla JS and the `sequence()` utility.
- [v1.85.1] ✅ Completed: Update Documentation - Updated `examples/README.md` and `/.sys/llmdocs/context-demo.md` to reflect the current state of examples, including new Captions and Three.js integration examples.
- [v1.85.0] ✅ Completed: Vanilla Captions Animation - Created `examples/vanilla-captions-animation` demonstrating Helios captions (SRT) support in Vanilla TypeScript, replacing the legacy `examples/captions-animation`.
- [v1.84.0] ✅ Completed: Solid Captions Animation - Created `examples/solid-captions-animation` demonstrating Helios captions (SRT) support in SolidJS.
- [v1.83.0] ✅ Completed: Solid Three.js Canvas Animation - Created `examples/solid-threejs-canvas-animation` demonstrating Three.js integration with SolidJS and Helios.
- [v1.82.0] ✅ Completed: Svelte Three.js Canvas Animation - Created `examples/svelte-threejs-canvas-animation` demonstrating Three.js integration with Svelte and Helios.
- [v1.81.0] ✅ Completed: Vue Three.js Canvas Animation - Created `examples/vue-threejs-canvas-animation` demonstrating Three.js integration with Vue 3 and Helios.
- [v1.80.0] ✅ Completed: Svelte Captions Animation - Created `examples/svelte-captions-animation` demonstrating Helios captions (SRT) support in Svelte.
- [v1.79.1] ✅ Verified: Promo Video GSAP Sync - Confirmed that running the dev server from the project root resolves module resolution issues, allowing the Promo Video example to render correctly with full content.
- [v1.79.0] ✅ Completed: Vue Captions Animation - Created `examples/vue-captions-animation` demonstrating how to use Helios captions with Vue 3 composition API.
- [v1.78.1] ✅ Completed: Enhance Render Verification - Updated `tests/e2e/verify-render.ts` to verify output video content (duration and non-black frames) using FFmpeg, ensuring silent rendering failures are caught.
- [v1.78.0] ✅ Completed: Verify Promo Video - Confirmed Promo Video example renders correctly, unblocking the demo.
- [v1.77.0] ✅ Completed: Update Animation Helpers - Added `interpolate` and `spring` examples to Vue, Svelte, and Solid examples.
- [v1.76.1] ✅ Verified: Diagnostics Example - Verified build and structure of `examples/diagnostics`. Note: E2E verification blocked by systemic environment issue.
- [v1.76.0] ✅ Completed: Diagnostics Example - Created `examples/diagnostics` to demonstrate `Helios.diagnose()` and provide a runnable environment check.
- [v1.75.0] ✅ Completed: Vanilla TypeScript Example - Created `examples/vanilla-typescript` to demonstrate idiomatic TypeScript usage without frameworks.
- [v1.74.1] ✅ Completed: Create Examples Documentation - Added `examples/README.md` to catalog and describe all available examples.
- [v1.74.0] ✅ Completed: Upgrade Client-Side Export Verification - Refactored `verify-client-export.ts` to dynamically discover and test all examples using a generic `dynamic-player.html` fixture.
- [v1.73.0] ✅ Completed: Code Walkthrough Example - Created `examples/code-walkthrough` demonstrating syntax highlighting and line focusing for developer content.
- [v1.72.0] ✅ Completed: Verify Player - Added E2E verification for the `<helios-player>` Web Component.
- [v1.71.0] ✅ Completed: Scaffold React Captions Animation - Created `examples/react-captions-animation` demonstrating `useCaptions` hook for integrating Helios SRT parsing with React.
- [v1.70.2] ✅ Completed: Document Client-Side Export - Added README to `examples/client-export-api` explaining BridgeController and ClientSideExporter usage.
- [v1.70.1] ✅ Completed: Re-verify Client-Side Export - Confirmed successful build and E2E verification of the client-side export example.
- [v1.70.0] ✅ Completed: Dynamic Verification Pipeline - Refactored build and test scripts to dynamically discover examples, reducing maintenance burden and enabling unified verification via 'verify:e2e'.
- [v1.69.1] ✅ Completed: Polish Client-Side Export Example - Added documentation comments to `examples/client-export-api` and re-verified functionality.
- [v1.69.0] ✅ Completed: Verify Client-Side Export - Added E2E verification test `tests/e2e/verify-client-export.ts` and updated build config aliases.
- [v1.68.0] ✅ Completed: Update React Animation Helpers - Added interpolate and spring examples.
- [v1.67.0] ✅ Completed: Client-Side Export API Example - Created `examples/client-export-api` demonstrating `ClientSideExporter` usage.
- [v1.66.0] ✅ Completed: Solid Canvas Example - Verified existing implementation matches spec.
- [v1.65.0] ✅ Completed: Scaffold React Example - Verified existing implementation.
- [v1.64.1] ✅ Completed: Verify Podcast Visualizer - Re-verified multi-track audio mixing and offset timing in the E2E pipeline.
- [v1.64.0] ✅ Completed: Implement SolidJS Series Component - Added Series component and updated SolidJS helpers example.
- [v1.63.0] ✅ Completed: Verify Podcast Visualizer - Verified multi-track audio mixing, muted attribute, and offset timing in the E2E pipeline.
- [v1.62.1] ✅ Completed: Verify Dom Render - Verified that DOM-based compositions render correctly in the E2E pipeline.
- [v1.62.0] ✅ Completed: Stress Test Animation - Created example with 2500 elements.
- [2026-01-30] Created plan for `stress-test-animation` example to validate performance claims.
- [2026-01-30] Initialized domain status and journal.
