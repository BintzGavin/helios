# 2025-02-18-STUDIO-Expand-MCP-Server.md

#### 1. Context & Goal
- **Objective**: Expand the Helios Studio MCP server to expose project assets, installed components, and agent skills as first-class resources.
- **Trigger**: "Agent Experience First" principle and README gap (MCP Server listed as "Planned" vs "Available"). Current implementation lacks visibility into project context.
- **Impact**: Enables AI agents to autonomously discover available assets, use installed components, and access skill documentation, significantly improving their ability to work on Helios projects without user intervention.

#### 2. File Inventory
- **Modify**:
  - `packages/studio/package.json`: Add `zod` to `dependencies` (fix missing dependency).
  - `packages/studio/src/server/discovery.ts`: Add `findComponents` function.
  - `packages/studio/src/server/documentation.ts`: Add `listSkills` and `getSkillContent` functions.
  - `packages/studio/src/server/mcp.ts`: Update `createMcpServer` signature and register new resources.
  - `packages/studio/src/server/plugin.ts`: Pass `options` to `createMcpServer`.
- **Read-Only**:
  - `packages/studio/src/server/templates/types.ts`: For type reference.

#### 3. Implementation Spec
- **Architecture**:
  - The MCP server (running via SSE in Studio) will expose new Read-Only Resources (`helios://...`) that abstract the file system and configuration.
  - It will leverage existing discovery logic and new helpers to fetch data.
- **Pseudo-Code**:
  - **`packages/studio/package.json`**:
    - Add `"zod": "^3.22.4"` (or matching version used elsewhere) to `dependencies`.
  - **`discovery.ts`**:
    - `findComponents(rootDir)`:
      - Read `helios.config.json` in `rootDir`.
      - Return `components` array from config, or empty array if missing.
  - **`documentation.ts`**:
    - `listSkills(cwd)`:
      - Scan `.agents/skills/helios` for subdirectories/files.
      - Return list of skill names (e.g., `['core', 'studio']`).
    - `getSkillContent(cwd, pkg)`:
      - Resolve path to `.agents/skills/helios/${pkg}/SKILL.md`.
      - Return file content string or null if not found.
  - **`mcp.ts`**:
    - Update `createMcpServer(getPort, options?)`.
    - `server.resource("assets", "helios://assets", ...)` -> calls `findAssets`.
    - `server.resource("components", "helios://components", ...)` -> calls `findComponents` (fallback to `options.components` if provided).
    - `server.resource("skills", "helios://skills", ...)` -> calls `listSkills`.
    - `server.resource("skill", "helios://skills/{name}", ...)` -> calls `getSkillContent`.
  - **`plugin.ts`**:
    - In `configureMiddlewares`, pass `options` to `createMcpServer`.
- **Public API Changes**:
  - Internal MCP resources added. No changes to HTTP API.
- **Dependencies**:
  - `zod` added to `packages/studio`.

#### 4. Test Plan
- **Verification**:
  1. Run `npm run build` in `packages/studio` to verify `zod` dependency fixes build/type check.
  2. Create a unit test `packages/studio/src/server/mcp.test.ts` that:
     - Mocks `findAssets`, `findComponents`, `listSkills`, `getSkillContent`.
     - Instantiates `createMcpServer`.
     - Verifies resources are registered.
     - (Optional) Simulates a resource read request if MCP SDK supports it easily in tests.
  3. Run `npx vitest packages/studio/src/server/mcp.test.ts` to confirm.
- **Success Criteria**:
  - Build passes.
  - Tests pass.
  - `zod` is in `package.json`.
- **Edge Cases**:
  - `helios.config.json` missing (should return empty components).
  - `.agents/skills` missing (should return empty skills).
  - Asset scanning fails (should handle gracefully).
