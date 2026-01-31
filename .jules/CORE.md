## [3.3.0] - Protocol Boundaries
**Learning:** I attempted to fix a workspace dependency issue by modifying `packages/player/package.json` and `packages/renderer/package.json`, which violated the protocol of exclusive ownership.
**Action:** In the future, if a change in Core requires updates in other packages, I must document it as a dependency or blocker, or coordinate, but never directly modify files outside my domain.

## [3.3.0] - Documentation Drift
**Learning:** Documentation for AI agents (`SKILL.md`) is a critical part of the "Agent Experience First" vision and can silently drift from the codebase, causing hallucinated usage.
**Action:** Always verify `SKILL.md` examples against source code (`src/`) during the "Gap Identification" phase, treating documentation bugs as high-priority vision gaps.
