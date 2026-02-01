## [0.68.0] - Composition Renaming Strategy
**Learning:** Renaming a composition changes its ID (derived from the file path). The API must return the new ID, and the frontend Context must be robust enough to handle the ID change during the update cycle, specifically updating `activeComposition` to point to the new object to prevent stale state.
**Action:** When designing CRUD operations for file-based entities, always account for identity instability (ID changing on rename/move).

## [0.69.0] - Asset Renaming & Identity
**Learning:** Like compositions, renaming an asset changes its ID (file path). This breaks references in compositions unless a refactoring tool is built. For now, the "Manage" capability relies on user awareness of this constraint.
**Action:** Future plans involving asset management must consider reference integrity or warn users about breaking changes.

## [0.69.0] - Audio Visualization Gap
**Learning:** Visualizing audio on the timeline is blocked by `HeliosController` capabilities. Core supports per-track audio state, but doesn't expose timing metadata easily. `getAudioTracks` in Player returns `AudioAsset[]` (including buffers), which is heavy.
**Action:** A dedicated "lightweight" metadata API for audio assets (start time, duration, src) is needed in Player to support efficient timeline visualization.

## [0.69.1] - CLI HMR Architecture
**Learning:** The previous CLI implementation used `vite preview`, which serves a static production build and does not support Hot Module Replacement (HMR). This broke the "Hot Reloading" vision for end users. To support HMR in a distributed tool, the CLI must invoke a custom `vite.createServer` instance that treats the User's Project as the root (for HMR) while serving the pre-built Studio UI as a static overlay.
**Action:** When building developer tools that require HMR, do not rely on `vite preview`. Use the Vite JavaScript API to construct a hybrid server.

## [0.72.0] - Dependency Version Skew
**Learning:** `packages/renderer` depended on strict `3.9.0` of Core, while Core was `3.9.1`, causing `npm install` to fail. Also, `examples/agent-promo-3d` has a broken import path `../../packages/core` instead of `../../../packages/core`.
**Action:** Always verify workspace dependencies and example paths before starting implementation.
