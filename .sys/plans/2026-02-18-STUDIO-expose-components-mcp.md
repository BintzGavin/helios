# Plan: Expose Component Management in Studio MCP Server

## 1. Context & Goal
- **Objective**: Enable AI agents to discover, install, update, and remove Helios components (e.g., `Watermark`, `ProgressBar`) via the Model Context Protocol (MCP) server embedded in Studio.
- **Trigger**: The Vision ("Agent Experience First") requires agents to have full control over the development environment, but the current MCP implementation only supports composition management, leaving a gap for component operations.
- **Impact**: AI agents (using Cursor, Claude, etc.) connecting to the Studio MCP server will be able to autonomously scaffold and maintain project components, fulfilling the "Self-Driving" promise.

## 2. File Inventory
- **Modify**: `packages/studio/src/server/mcp.ts` (Update `createMcpServer` signature and add tools/resources)
- **Modify**: `packages/studio/src/server/plugin.ts` (Pass `StudioPluginOptions` to `createMcpServer`)
- **Read-Only**: `packages/cli/src/commands/studio.ts` (Reference for callback implementations)

## 3. Implementation Spec
- **Architecture**: Extend the existing `McpServer` instance in `mcp.ts` to include new resources and tools that wrap the callbacks provided by `StudioPluginOptions`.
- **Pseudo-Code**:
  1.  Update `createMcpServer` function signature to accept `options?: StudioPluginOptions`.
  2.  Inside `createMcpServer`:
      - If `options.components` is provided:
          - Register `helios://components` resource handler.
          - Handler returns JSON string of `options.components`, checking `options.onCheckInstalled` if available.
      - If `options.onInstallComponent` is provided:
          - Register `install_component` tool handler.
          - Handler calls `options.onInstallComponent(name)`.
      - If `options.onRemoveComponent` is provided:
          - Register `uninstall_component` tool handler.
          - Handler calls `options.onRemoveComponent(name)`.
      - If `options.onUpdateComponent` is provided:
          - Register `update_component` tool handler.
          - Handler calls `options.onUpdateComponent(name)`.
  3.  Update `configureMiddlewares` in `plugin.ts`:
      - Pass the existing `options` object to `createMcpServer` call.
- **Public API Changes**:
  - `createMcpServer` signature changes from `(getPort: () => number)` to `(getPort: () => number, options?: StudioPluginOptions)`.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
  - Run `npm run build` in `packages/studio` to ensure type safety.
  - Create a temporary verification script `packages/studio/scripts/verify-mcp-components.ts` that imports `createMcpServer` and mocks `StudioPluginOptions` to verify tools are registered and callbacks are invoked.
  - Run the verification script: `npx tsx packages/studio/scripts/verify-mcp-components.ts`
- **Success Criteria**:
  - The verification script confirms `helios://components` returns data.
  - The verification script confirms `install_component` tool calls the mock callback.
- **Edge Cases**:
  - Handle cases where `options` or callbacks are undefined (omit registration).
  - Handle cases where callback throws an error (return MCP error).
