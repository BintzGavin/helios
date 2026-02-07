# Plan: Implement `helios mcp` Command

## 1. Context & Goal
- **Objective**: Implement a `helios mcp` command in the CLI to launch the Model Context Protocol (MCP) server in `stdio` mode.
- **Trigger**: The current MCP integration (`packages/studio/src/server/mcp.ts`) is only accessible via the Studio's HTTP server (SSE), which requires the Studio to be running and manually configured in agents. Local agents (like Claude Desktop) expect a CLI command using `stdio` transport.
- **Impact**: Enables "Agent Integration" vision by allowing local AI agents to autonomously inspect, create, and render compositions using `npx helios mcp`.

## 2. File Inventory
- **Create**:
  - `packages/cli/src/commands/mcp.ts`: The new CLI command implementation.
- **Modify**:
  - `packages/studio/vite.config.cli.ts`: Fix output filename to match `package.json` (`plugin.js` instead of `index.js`).
  - `packages/studio/package.json`: Add `zod` dependency.
  - `packages/studio/src/server/plugin.ts`: Export `createMcpServer` for CLI usage.
  - `packages/cli/package.json`: Add `@modelcontextprotocol/sdk` dependency.
  - `packages/cli/src/index.ts`: Register the new `mcp` command.
- **Read-Only**:
  - `packages/studio/src/server/mcp.ts`: The existing MCP server factory.
  - `packages/studio/src/server/render-manager.ts`: Render logic used by the MCP server.

## 3. Implementation Spec
- **Architecture**:
  - The `helios mcp` command will start a **headless, silent Vite server** (using `studioApiPlugin` logic) to serve the project files and providing a render backend.
  - It will then instantiate a new `McpServer` (reusing `createMcpServer` logic) and connect it to `process.stdin`/`process.stdout` using `StdioServerTransport`.
  - `console.log` will be intercepted/suppressed to prevent corrupting the JSON-RPC stream on stdout.
- **Public API Changes**:
  - `packages/studio/cli`: Named export `createMcpServer` added.
  - CLI: New `helios mcp` command.
- **Dependencies**:
  - `packages/studio`: `zod` (runtime), `@modelcontextprotocol/sdk` (peer/external).
  - `packages/cli`: `@modelcontextprotocol/sdk`.

## 4. Test Plan
- **Verification**:
  1. Build `packages/studio` to ensure the fix in `vite.config.cli.ts` works and creates `plugin.js`.
  2. Build `packages/cli`.
  3. Run `node packages/cli/bin/helios.js mcp` and verify it starts without error (it should hang waiting for stdin).
  4. Verify `helios --help` lists the `mcp` command.
- **Success Criteria**:
  - The command starts and keeps the process alive.
  - No extraneous logs on stdout.
- **Edge Cases**:
  - Port conflicts (Vite server should find an available port automatically).
  - Missing project dependencies (handled by Vite/Studio logic).
