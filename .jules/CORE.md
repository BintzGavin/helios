## [3.3.0] - Protocol Boundaries
**Learning:** I attempted to fix a workspace dependency issue by modifying `packages/player/package.json` and `packages/renderer/package.json`, which violated the protocol of exclusive ownership.
**Action:** In the future, if a change in Core requires updates in other packages, I must document it as a dependency or blocker, or coordinate, but never directly modify files outside my domain.

## [3.3.0] - Documentation Drift
**Learning:** Documentation for AI agents (`SKILL.md`) is a critical part of the "Agent Experience First" vision and can silently drift from the codebase, causing hallucinated usage.
**Action:** Always verify `SKILL.md` examples against source code (`src/`) during the "Gap Identification" phase, treating documentation bugs as high-priority vision gaps.

## [3.5.1] - Preview/Render Parity
**Learning:** `DomDriver` (Preview) logic can silently drift from `Renderer` (FFmpeg) logic if features like audio fades are implemented via different mechanisms (DOM vs FFmpeg filters) without shared logic.
**Action:** When inspecting "Vision: Native Always Wins", verify that "Native" implementation (DOM) actually supports all features exposed by the Renderer to ensure WYSIWYG.
