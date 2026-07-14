#### 1. Context & Goal
- **Objective**: Improve unit test coverage for the `mcp.ts` (Model Context Protocol server) file to reach 100%.
- **Trigger**: The coverage report for `src/server/mcp.ts` shows 67.34% coverage, leaving multiple branches uncovered (specifically lines `...157,174,183-188,197-202`).
- **Impact**: Ensures that error handlers, `uninstall_component`, and `update_component` features of the MCP server handle missing options correctly and propagate errors.

#### 2. File Inventory
- **Modify**: `packages/studio/src/server/mcp.test.ts` (Add tests for missing tool error handlers and uninstall/update methods)
- **Read-Only**: `packages/studio/src/server/mcp.ts`

#### 3. Implementation Spec
- **Architecture**: Append new test blocks to the existing `vitest` file `mcp.test.ts`.
- **Pseudo-Code**:
  - `render_composition` error handling: Mock `startRender` to throw an error and verify `result.isError` is true and text matches.
  - `install_component` error handling: Ensure that if `onInstallComponent` throws, the MCP tool returns a `.isError = true` formatted response.
  - `uninstall_component`: Add success path (mocking `options.onRemoveComponent`), error on missing options, and error on thrown rejection.
  - `update_component`: Add success path (mocking `options.onUpdateComponent`), error on missing options, and error on thrown rejection.

#### 4. Test Plan
- **Verification**: `npm run test -w packages/studio -- --coverage src/server/mcp.test.ts`
- **Success Criteria**: 100% test coverage for `mcp.ts` with lines reported covered.
- **Edge Cases**: Ensure `result.isError` is true for exceptions in all tool handlers.
