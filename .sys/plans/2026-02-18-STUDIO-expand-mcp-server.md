# 2026-02-18-STUDIO-expand-mcp-server

## 1. Context & Goal
- **Objective**: Expand the Studio's MCP (Model Context Protocol) Server to include `get_documentation` and `list_assets` tools.
- **Trigger**: "Agent Experience First" vision gap. The current MCP server lacks context (docs/assets) required for agents to work autonomously.
- **Impact**: Allows AI agents connecting via MCP to access documentation/skills and available assets, significantly improving their ability to generate valid compositions.

## 2. File Inventory
- **Modify**: `packages/studio/src/server/mcp.ts` (Add tools, update signature)
- **Modify**: `packages/studio/src/server/plugin.ts` (Pass `skillsRoot` to `createMcpServer`)
- **Create**: `packages/studio/src/server/mcp.test.ts` (Unit tests for new tools)
- **Read-Only**: `packages/studio/src/server/documentation.ts`, `packages/studio/src/server/discovery.ts`

## 3. Implementation Spec
- **Architecture**:
  - Update `createMcpServer` to accept `skillsRoot?: string`.
  - Pass `skillsRoot` from `plugin.ts` to `createMcpServer`.
  - Register `get_documentation` tool:
    - Inputs: `query` (string, optional), `package` (enum, optional).
    - Logic: Call `findDocumentation(process.cwd(), skillsRoot)`. Filter by package if provided. If query provided, perform keyword search (simple string includes). Return formatted markdown.
  - Register `list_assets` tool:
    - Inputs: `type` (string, optional).
    - Logic: Call `findAssets(process.cwd())`. Filter by type if provided. Return JSON list.
- **Pseudo-Code**:
  ```typescript
  // packages/studio/src/server/mcp.ts
  export function createMcpServer(getPort: () => number, skillsRoot?: string) {
    // ...
    server.tool("get_documentation", { ... }, async (args) => {
      const docs = findDocumentation(process.cwd(), skillsRoot);
      // Filter and return
    });
    server.tool("list_assets", { ... }, async (args) => {
      const assets = await findAssets(process.cwd());
      // Filter and return
    });
  }
  ```
- **Public API Changes**: `createMcpServer` signature changes.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: Run `npx vitest packages/studio/src/server/mcp.test.ts`.
- **Success Criteria**:
  - `get_documentation` returns content from `SKILL.md` (mocked or real).
  - `list_assets` returns asset list.
- **Edge Cases**:
  - `skillsRoot` is undefined.
  - Documentation not found.
  - No assets found.
