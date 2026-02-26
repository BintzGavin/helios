# 2026-10-28-STUDIO-Enhance-MCP-Server.md

#### 1. Context & Goal
- **Objective**: Enhance the Studio MCP Server to support `inputProps` in `render_composition` and `defaultProps` in `create_composition`.
- **Trigger**: "Agent Experience First" principle requiring composable primitives for LLM-driven workflows. Currently, agents cannot parameterize renders or set default props during creation.
- **Impact**: Enables AI agents to generate video variations (e.g., changing text/images via props) and configure new compositions more completely.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/studio/src/server/mcp.ts` (Update tool schemas and handlers)
- **Modify**: `packages/studio/src/server/mcp.test.ts` (Add unit tests for new props)
- **Read-Only**: `packages/studio/src/server/discovery.ts`, `packages/studio/src/server/render-manager.ts`

#### 3. Implementation Spec
- **Architecture**: Update the Zod schemas in `createMcpServer` to accept optional property records and pass them to the underlying service functions.
- **Pseudo-Code**:
  ```typescript
  // In create_composition tool
  schema: {
    // ... existing fields
    defaultProps: z.record(z.any()).optional()
  }
  handler: (args) => {
    // ...
    const options = {
      // ...
      defaultProps: args.defaultProps
    };
    createComposition(..., options);
  }

  // In render_composition tool
  schema: {
    // ... existing fields
    inputProps: z.record(z.any()).optional(),
    videoBitrate: z.string().optional(),
    videoCodec: z.string().optional()
  }
  handler: (args) => {
    // ...
    startRender({
      // ...
      inputProps: args.inputProps,
      videoBitrate: args.videoBitrate,
      videoCodec: args.videoCodec
    }, port);
  }
  ```
- **Public API Changes**: No changes to Studio HTTP API, only MCP tool definitions (which are internal to the agent connection).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run unit tests for MCP server.
  - `npm test packages/studio/src/server/mcp.test.ts`
- **Success Criteria**: Tests pass and verify that `defaultProps` and `inputProps` are correctly passed to the mocked `createComposition` and `startRender` functions.
- **Edge Cases**: Verify behavior when props are omitted (should work as before). Verify `videoBitrate` passing.
