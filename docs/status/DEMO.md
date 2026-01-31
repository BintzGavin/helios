# Status: DEMO Domain

**Version**: 1.74.0

## Vision
The DEMO domain is responsible for:
1.  **Examples:** Providing clear, idiomatic usage examples for all supported frameworks (React, Vue, Svelte, Vanilla).
2.  **E2E Testing:** Ensuring the rendering pipeline works across all configurations.
3.  **Build Config:** Maintaining the root `vite.config.js` and build scripts to support the examples.

## Blocked Items
- None

## Active Tasks
- None

## Completed Tasks
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
