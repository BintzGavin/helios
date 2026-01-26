# Planner's Journal - DEMO

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
