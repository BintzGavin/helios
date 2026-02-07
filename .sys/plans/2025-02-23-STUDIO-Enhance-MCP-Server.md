# Context & Goal
- **Objective**: Enhance the Helios Studio MCP Server to support Documentation, Assets, and Component Management.
- **Trigger**: The current MCP implementation (`mcp.ts`) is minimal (only compositions and rendering), leaving a gap in "Agent Experience" by preventing agents from accessing documentation, managing assets, or installing components via the protocol.
- **Impact**: Enables "Agent Experience First" by allowing agents to learn (docs), build (components), and manage resources (assets) directly through the Studio's MCP interface. This is critical for making Helios Studio a powerful tool for autonomous agents.

# File Inventory
- **Modify**:
    - `packages/studio/src/server/mcp.ts`: Add resources and tools for documentation, assets, and components. Update `createMcpServer` signature to accept `StudioPluginOptions`.
    - `packages/studio/src/server/plugin.ts`: Pass `options` to `createMcpServer`.
- **Create**:
    - `packages/studio/src/server/mcp.test.ts`: Create a unit test to verify resource and tool registration by mocking `McpServer`.
- **Read-Only**:
    - `packages/studio/src/server/documentation.ts`: Reference for `findDocumentation`.
    - `packages/studio/src/server/discovery.ts`: Reference for `findAssets`.
    - `packages/studio/src/server/plugin.ts`: Reference for `StudioPluginOptions`.

# Implementation Spec
- **Architecture**:
    - The MCP Server logic (`mcp.ts`) will be decoupled from pure function calls and accept `StudioPluginOptions` to access capabilities provided by the CLI/Plugin host (like component management).
    - **Documentation**: Expose `helios://documentation` resource. It will call `findDocumentation` and return the list of documentation sections as a JSON string.
    - **Assets**: Expose `helios://assets` resource. It will call `findAssets` and return the list of assets as a JSON string.
    - **Components**: Expose `helios://components` resource. It will return the list of available components from `options.components` (enriched with installation status via `options.onCheckInstalled` if possible, or just the registry list).
    - **Component Tools**: Register `install_component`, `uninstall_component`, and `update_component` tools. These will invoke the corresponding async callbacks in `options` (`onInstallComponent`, etc). If a callback is missing, the tool should return a helpful error.
- **Pseudo-Code**:
    ```typescript
    // packages/studio/src/server/mcp.ts
    export function createMcpServer(getPort: () => number, options: StudioPluginOptions) {
      // ... existing server setup

      // Documentation Resource
      server.resource("documentation", "helios://documentation", async (uri) => {
        const docs = findDocumentation(process.cwd(), options.skillsRoot);
        return { contents: [{ uri: uri.href, text: JSON.stringify(docs, null, 2) }] };
      });

      // Assets Resource
      server.resource("assets", "helios://assets", async (uri) => {
        const assets = await findAssets(process.cwd());
        return { contents: [{ uri: uri.href, text: JSON.stringify(assets, null, 2) }] };
      });

      // Components Resource
      server.resource("components", "helios://components", async (uri) => {
        const components = options.components || [];
        // Optional: enrich with installed status if needed, but registry list is fine for now
        return { contents: [{ uri: uri.href, text: JSON.stringify(components, null, 2) }] };
      });

      // Install Component Tool
      server.tool("install_component", { name: z.string() }, async (args) => {
        if (!options.onInstallComponent) return { content: [{ type: "text", text: "Feature not available" }], isError: true };
        await options.onInstallComponent(args.name);
        return { content: [{ type: "text", text: `Installed ${args.name}` }] };
      });

      // ... similar for uninstall and update
    }
    ```
- **Public API Changes**:
    - `createMcpServer` signature changes to `(getPort: () => number, options: StudioPluginOptions)`.
- **Dependencies**:
    - Relies on `packages/studio/src/server/documentation.ts`, `discovery.ts`, and `plugin.ts` interfaces.

# Test Plan
- **Verification**:
    - Run `npx vitest packages/studio/src/server/mcp.test.ts`.
- **Success Criteria**:
    - The test should mock `McpServer` and verify that `resource()` is called with the correct names and URIs.
    - The test should verify that `tool()` is called for the component management tools.
    - The test should ensure that `options` are correctly passed and used (e.g., calling `install_component` tool triggers `options.onInstallComponent`).
- **Edge Cases**:
    - `options.components` is undefined (should handle gracefully).
    - `options.onInstallComponent` is undefined (tool should return error).
    - `findDocumentation` returns empty list.
