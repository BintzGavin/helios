# 2026-06-22 STUDIO: Implement Markdown URLs

#### 1. Context & Goal
- **Objective**: Implement raw markdown serving for documentation (`/docs/:package.md`) in the Studio server to support AI agent workflows and "AI Integration Parity".
- **Trigger**: The `README.md` lists "Markdown URLs" as a planned feature for V1.x AI Integration Parity, which is currently missing.
- **Impact**: Enables external agents (and users) to consume raw documentation for Core, Renderer, Player, and the current Project directly via the Studio server, facilitating "Read the Manual" capabilities.

#### 2. File Inventory
- **Modify**: `packages/studio/src/server/documentation.ts` (Extract path resolution logic)
- **Modify**: `packages/studio/src/server/plugin.ts` (Add `/docs` middleware)

#### 3. Implementation Spec
- **Architecture**: Add a middleware to the Vite server (Studio API) that intercepts requests to `/docs/*.md`.
- **Logic**:
  - Refactor `packages/studio/src/server/documentation.ts` to export a `resolveDocumentationPath(cwd, pkgName)` function.
    - This function accepts a "package short name" (e.g., `core`, `renderer`, `studio`, `player`, `root`) and returns the absolute path to its `README.md`.
    - It should support both Monorepo (dev) and Node Modules (installed) resolution strategies.
  - In `packages/studio/src/server/plugin.ts`, add a middleware mounted at `/docs`:
    - Parse the URL to extract the package name (e.g., `/docs/core.md` -> `core`).
    - Call `resolveDocumentationPath`.
    - If found, stream the file with `Content-Type: text/plain` (or `text/markdown`).
    - If not found, return 404.
- **Public API Changes**: New HTTP endpoints on Studio server:
  - `GET /docs/core.md`
  - `GET /docs/renderer.md`
  - `GET /docs/player.md`
  - `GET /docs/studio.md`
  - `GET /docs/root.md` (Project README)
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  1. Start Studio: `npx helios studio` (or `npm run dev` in `packages/studio`).
  2. Run `curl -I http://localhost:5173/docs/core.md` and verify `Content-Type: text/markdown` (or plain) and 200 OK.
  3. Verify content matches `packages/core/README.md`.
  4. Test with an invalid package (e.g., `/docs/invalid.md`) -> 404.
- **Success Criteria**: AI Agents can fetch raw markdown documentation from the Studio server.
- **Edge Cases**:
  - Running from `examples/` vs root (resolution logic handles this).
  - Missing READMEs (returns 404).
