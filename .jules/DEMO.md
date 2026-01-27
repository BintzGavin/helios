# Planner's Journal - DEMO

## [v1.28.0] - Signal-Based State Hidden Feature
**Learning:** Similar to Captions, the "Signal-Based State" feature (`signal`, `computed`, `effect`) is fully implemented and exported in `packages/core` but marked as "Planned" or "Architecture Hardening" in the README, with no examples demonstrating it.
**Action:** Created `examples/signals-animation` plan to expose this capability. Future plans should prioritize exposing existing "hidden" core features over building new ones.

## 2025-02-19 - Vue Series Component Gap
**Learning**: The README promises `<Series>` support for sequential layouts, but `examples/vue-animation-helpers` lacked it, forcing manual offsets. The Status file incorrectly claimed React had it, but React was also missing it.
**Action**: Prioritized implementing `<Series>` for Vue to close the gap. Future plans should verify "Completed" status claims against actual file existence.

## 2025-02-18 - Animation Helpers Gap
**Learning:** The README promises "Animation Helpers" (`interpolate`, `spring`) for code-driven animation, but no examples existed to demonstrate them. This was a gap between vision and reality.
**Action:** Scaffolding `examples/animation-helpers` to close this gap and provide a reference implementation.

## 2025-02-18 - Missing Framework Dependencies
**Learning:** The root `package.json` is missing `react`, `react-dom`, and `@vitejs/plugin-react` despite the README promising a React example.
**Action:** Must plan to install these dependencies and configure Vite to support React before scaffolding the example.

## 2025-02-18 - Build Config Exclusion
**Learning:** Scaffolding the React example via `vite.config.js` allows `dev:react` to work, but the root `build:examples` script uses `vite.build-example.config.js` which requires manual entry updates to include the new example.
**Action:** Future plans must include updating `vite.build-example.config.js` when adding new examples to ensure they are part of the CI/build process.

## 2025-01-22 - Vue Composable Pattern
**Learning:** Porting React hooks to Vue composables for Helios integration is straightforward. The pattern of wrapping `helios.subscribe` in `onMounted/onUnmounted` (or just `onUnmounted` if init is synchronous) matches perfectly with `useVideoFrame`.
**Action:** When scaffolding Svelte or other frameworks, look for similar "subscribe/unsubscribe" lifecycle equivalents (e.g., Svelte stores).

## 2026-02-19 - Missing Framework Adapter Packages
**Learning:** The README claims `packages/react`, `packages/vue` etc. exist as adapters, but they do not. Examples currently implement hooks (`useVideoFrame`) locally.
**Action:** When planning examples, must include local hook implementation. Future plans should address creating these packages to centralize logic.

## [v1.8.0] - CdpTimeDriver Incompatibility with DomStrategy
**Learning:** `CdpTimeDriver` (the default time driver in Renderer) causes timeouts with `DomStrategy` (used for `page.screenshot`) in the verification environment. This breaks E2E verification for DOM-based examples.
**Action:** Temporarily use `SeekTimeDriver` for verifying DOM examples, or flag it as a Known Issue. Future work should investigate `CdpTimeDriver` + `page.screenshot` compatibility (possibly virtual time budget exhaustion during screenshot).

## [v1.19.0] - Renderer Verification Failure
**Learning:** E2E verification for DOM-based examples fails with `ReferenceError: __name is not defined` in `DomStrategy.ts`. This is caused by `tsx`/esbuild injecting a helper `__name` into the `prepare` function which is evaluated in the browser context where `__name` is undefined.
**Action:** Reported to Core/Renderer domain. For now, verified changes by temporarily patching `DomStrategy.ts` to polyfill `__name`. Future verifications will fail until this is fixed in Renderer.

## [v1.23.0] - Specificity in Planning
**Learning:** When requesting an Executor to modify configuration files (like `vite.build-example.config.js`), broad instructions ("Add the new example") are rejected. The Planner must provide the specific code snippets (e.g., exact object properties) to be inserted.
**Action:** Always include exact code insertion blocks in "Implementation Spec" when modifying existing files.

## [1.26.1] - Captions Support Discovery
**Learning:** The README claims "Captions/subtitles: Not yet", but `packages/core` has full SRT parsing and state management (`activeCaptions`). This feature is hidden/undocumented.
**Action:** Created `examples/captions-animation` to expose this feature. Future plans should check source code before assuming "Not yet" in README is accurate for Core capabilities.

## [1.28.2] - Input Props Gap
**Learning:** The Core supports `inputProps` and `schema` validation, and the README highlights this as a feature ("Props editor with schema validation" planned). However, no example demonstrated how to use these features, creating a gap for users wanting parametrized compositions.
**Action:** Created `examples/dynamic-props-animation` plan to bridge this gap.

## [1.31.0] - D3 Integration Architecture
**Learning:** Integrating D3.js requires bypassing its internal timer-based transitions (`d3.transition()`) because they drift from Helios's frame clock. The correct pattern is to drive D3 selections directly via `helios.subscribe()`.
**Action:** Created `examples/d3-animation` plan with explicit instructions to use `helios.subscribe` instead of D3 transitions.

## [v1.34.0] - Tailwind Shared Config
**Learning:** Adding Tailwind support requires modifying root `package.json` and adding `postcss.config.js` to the root, which affects the shared build pipeline.
**Action:** Scoped `tailwind.config.js` content strictly to the example directory to prevent side effects on other examples, and accepted the root dependency addition as necessary for "Use What You Know" support.

## [v1.36.0] - File Path Permissions
**Learning:** Writing to absolute paths starting with `/` (e.g. `/.sys/plans/...`) fails with permission denied. Must use relative paths (e.g. `.sys/plans/...`) or `./`.
**Action:** Always use relative paths when creating plan files.

## [v1.37.0] - P5.js Instance Mode Requirement
**Learning:** P5.js normally runs in "Global Mode" which pollutes the window object and conflicts with ES modules. For Helios integration, "Instance Mode" is required to isolate the sketch and strictly control the loop via `p.noLoop()` and `p.redraw()`.
**Action:** The plan explicitly mandates Instance Mode and disabling the internal loop to ensure frame-perfect synchronization with Helios.

## [v1.38.0] - FFmpeg Base64 Strictness in DomStrategy
**Learning:** `DomStrategy` automatically detects `<video>` elements and pipes them to FFmpeg. If using Base64 Data URIs, FFmpeg is strict about the container format (needs `moov` atom) and stream presence (expects audio if configured). A 1x1 pixel video-only Base64 caused verification failure (`moov atom not found` or `stream specifier matches no streams`).
**Action:** Created a valid minimal MP4 with Audio using FFmpeg and used that for `examples/media-element-animation` and `examples/social-media-story`. Future examples using `autoSyncAnimations` must use valid media assets.
