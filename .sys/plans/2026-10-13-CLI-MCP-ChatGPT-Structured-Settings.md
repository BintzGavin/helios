#### 1. Context & Goal
- **Objective**: Implement ChatGPT structured settings (`openai/settings` read/update tools) for the Helios MCP server to allow configuring default size, fps, preset, and output folder.
- **Trigger**: Vision gap in `docs/BACKLOG.md` (Phase 2 — Local MCP server and in-conversation view: "CLI: ChatGPT structured settings (`openai/settings` read/update tools): default size, fps, preset, output folder.").
- **Impact**: Unlocks persistent user configuration for rendering and preview tasks directly within the ChatGPT interface, aligning the plugin with modern host capabilities and making video generation more ergonomically sound.

#### 2. File Inventory
- **Create**:
  - `packages/cli/src/mcp/settings.ts` (Handles reading and writing the settings file)
- **Modify**:
  - `packages/cli/src/mcp/server.ts` (Register `read_settings` and `update_settings` tools with `openai/settings` meta)
- **Read-Only**:
  - `docs/BACKLOG.md`
  - `packages/cli/src/mcp/prompts.ts`

#### 3. Implementation Spec
- **Architecture**:
  - Add two new MCP tools in `packages/cli/src/mcp/server.ts`: `read_settings` and `update_settings`.
  - These tools will include ChatGPT extension metadata (`openai/settings`: `read` and `update`).
  - Settings will include `width`, `height`, `fps`, `preset`, and `outputFolder`.
  - The settings themselves will be stored in a `.helios/mcp-settings.json` file inside the project root to persist across sessions.
  - The tools will read from and write to this JSON file.
- **Pseudo-Code**:
  - `packages/cli/src/mcp/settings.ts`:
    - Define a Zod schema for settings: `width: z.number()`, `height: z.number()`, `fps: z.number()`, `preset: z.string()`, `outputFolder: z.string()`.
    - Provide `getSettings(root)` and `updateSettings(root, newSettings)` functions.
  - `packages/cli/src/mcp/server.ts`:
    - Call `server.registerTool('read_settings', ...)` with `openai/settings: 'read'` metadata.
    - Call `server.registerTool('update_settings', ...)` with `openai/settings: 'update'` metadata.
    - Modify `render_video` and `preview_video` tools to pull defaults from `getSettings()` if the arguments are not explicitly provided.
- **Public API Changes**:
  - MCP Server will expose two new tools (`read_settings`, `update_settings`).
- **Dependencies**:
  - None.

#### 4. Test Plan
- **Verification**: `npm run test -w packages/cli`
- **Success Criteria**: The `read_settings` and `update_settings` tools are registered, and they correctly read/write a configuration file within the workspace. `render_video` and `preview_video` fallback to these settings when arguments are absent.
- **Edge Cases**: Missing settings file (should return defaults), invalid settings file (should recover gracefully).