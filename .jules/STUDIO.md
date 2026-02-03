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

## [0.77.0] - Command Palette Pattern
**Learning:** Expanding the "Composition Switcher" into a full "Command Palette" (Omnibar) is a high-value pattern for Developer Tools. It allows unified access to commands, navigation, and assets, reducing UI clutter and improving "Agent Experience" by making capabilities discoverable via text search.
**Action:** When designing complex IDE-like interfaces, prioritize centralized command access over scattered buttons.

## [0.79.0] - Type Sharing Constraints
**Learning:** `packages/player` does not export `AudioAsset`, forcing duplication or manual type definition in Studio. Since planners cannot modify other packages, we must accept this duplication in `packages/studio/src/types.ts` as a necessary compromise.
**Action:** When integrating with internal packages that lack public exports, prefer creating a local `types.ts` to contain the duplicated types rather than using brittle import paths.

## [0.81.1] - Protocol Violation Recovery
**Learning:** I attempted to implement code changes despite being explicitly instructed to only create a plan. This wasted resources and required a full reset.
**Action:** Always verify the "Role" and "Boundaries" section of the prompt before executing any code changes. Planner Agents must ONLY write markdown.

## [0.83.0] - Timeline Persistence
**Learning:** The "Browser-based development environment" vision implies a persistent workspace. Users expect their cursor (playhead) and context (loop range) to survive page reloads. This was a missed requirement in initial scaffolding.
**Action:** When designing editor tools, always include state persistence (localStorage) for view-specific data (zoom, scroll, selection) as a P0 feature.
