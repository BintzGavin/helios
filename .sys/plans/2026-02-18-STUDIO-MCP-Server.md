# STUDIO: Implement MCP Server Integration

#### 1. Context & Goal
- **Objective**: Implement a Model Context Protocol (MCP) server within the Helios Studio backend.
- **Trigger**: The Vision explicitly plans for an "MCP Server (`@helios-engine/mcp`)" to enable AI agent integration (Cursor, Claude), but it is currently unimplemented (Vision Gap).
- **Impact**: Unlocks "Agent Experience First" principle by allowing external AI agents to programmatically discover compositions, create new projects, and trigger renders without using the GUI.

#### 2. File Inventory
- **Create**:
  - `packages/studio/src/server/mcp.ts`: The MCP server implementation using `@modelcontextprotocol/sdk`.
  - `packages/studio/scripts/verify-mcp.ts`: A verification script to test the MCP connection.
- **Modify**:
  - `packages/studio/package.json`: Add `@modelcontextprotocol/sdk` dependency.
  - `packages/studio/vite-plugin-studio-api.ts`: Integrate the MCP server into the Vite dev server via new `/mcp/sse` and `/mcp/messages` endpoints.
- **Read-Only**:
  - `packages/studio/src/server/discovery.ts`: To reuse composition discovery logic.
  - `packages/studio/src/server/render-manager.ts`: To reuse render job logic.

#### 3. Implementation Spec
- **Architecture**:
  - Use `McpServer` class from `@modelcontextprotocol/sdk`.
  - Implement an SSE (Server-Sent Events) transport layer mounted on the Vite server middleware.
  - This allows the running Studio instance (`npx helios studio`) to serve both the Human UI and the Agent API simultaneously on the same port.

- **Public API Changes**:
  - New HTTP GET endpoint: `/mcp/sse` (EventStream).
  - New HTTP POST endpoint: `/mcp/messages` (JSON-RPC).

- **MCP Resources**:
  - `helios://compositions`: Returns a JSON list of available compositions (ID, Name, Metadata) using `findCompositions`.

- **MCP Tools**:
  - `render_composition`: Triggers a render job via `startRender`.
    - Arguments: `compositionId` (string), `format` (mp4/webm), `width?` (number), `height?` (number).
  - `create_composition`: Creates a new composition via `createComposition`.
    - Arguments: `name` (string), `template` (string).

- **Dependencies**:
  - `@modelcontextprotocol/sdk` must be installed in `packages/studio`.

#### 4. Test Plan
- **Verification**:
  - Run `npx helios studio` to start the server.
  - Run `npx tsx packages/studio/scripts/verify-mcp.ts`.
  - The verification script should:
    1. Connect to `http://localhost:5173/mcp/sse`.
    2. Perform the MCP handshake.
    3. List tools and resources.
    4. Validate that `helios://compositions` is available.
- **Success Criteria**:
  - Verification script exits with code 0.
  - Studio logs show MCP connection established.
- **Edge Cases**:
  - Studio not running (script should fail gracefully).
  - Multiple concurrent MCP clients (SSE should handle this).
