# Engineering Log

## 2025-01-16

### Observations
- Repository structure is a monorepo with `core`, `renderer`, and `player`.
- `README.md` is comprehensive and outlines clear architecture and roadmap.
- `packages/renderer` implements a basic Playwright-based capture loop (Path 1 technology but targeting canvas output). It uses `toDataURL` which is not the high-performance WebCodecs path planned for the future, but it works.
- `packages/player` implements a client-side `VideoEncoder` path (Path 2) for preview export.
- `npm run render:canvas-example` works after installing dependencies and Playwright browsers.

### Today's focus
- **Diagnostics and Developer Experience**: Establishing a baseline for environment verification and project tracking.

### Changes
- Created `docs/PROGRESS.md` (this file).
- Created `docs/BACKLOG.md` to track milestones.
- Created `docs/decisions/2025-01-16-diagnostics-tool.md`.
- Implemented `packages/renderer/src/diagnose.ts` to check FFmpeg and Playwright environment.
- Added `npm run diagnose` script.

### Next up
- Implement the "WebCodecs" rendering path in the server-side renderer to match the architecture vision.
- Move rendering from `file://` to a local dev server to support module imports in compositions.
