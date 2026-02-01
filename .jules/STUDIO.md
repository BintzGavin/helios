## [0.68.0] - Composition Renaming Strategy
**Learning:** Renaming a composition changes its ID (derived from the file path). The API must return the new ID, and the frontend Context must be robust enough to handle the ID change during the update cycle, specifically updating `activeComposition` to point to the new object to prevent stale state.
**Action:** When designing CRUD operations for file-based entities, always account for identity instability (ID changing on rename/move).

## [0.69.0] - Asset Renaming & Identity
**Learning:** Like compositions, renaming an asset changes its ID (file path). This breaks references in compositions unless a refactoring tool is built. For now, the "Manage" capability relies on user awareness of this constraint.
**Action:** Future plans involving asset management must consider reference integrity or warn users about breaking changes.

## [0.69.0] - Audio Visualization Gap
**Learning:** Visualizing audio on the timeline is blocked by `HeliosController` capabilities. Core supports per-track audio state, but doesn't expose timing metadata easily. `getAudioTracks` in Player returns `AudioAsset[]` (including buffers), which is heavy.
**Action:** A dedicated "lightweight" metadata API for audio assets (start time, duration, src) is needed in Player to support efficient timeline visualization.
