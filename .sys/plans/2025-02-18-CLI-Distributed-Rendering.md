# 2025-02-18-CLI-Distributed-Rendering

## 1. Context & Goal
- **Objective:** Enable distributed rendering workflows by exposing frame-range controls in the CLI `render` command.
- **Trigger:** `AGENTS.md` explicitly requires distributed rendering support ("Local only rendering is insufficient for V2 goals") and identifies it as a V2 priority.
- **Impact:** Allows CI/CD pipelines and cloud workers to render small slices of a composition in parallel, unlocking scalable video generation.

## 2. File Inventory
- **Modify:** `packages/cli/src/commands/render.ts` (Add CLI flags and pass to Renderer)
- **Read-Only:** `packages/renderer/src/Renderer.ts` (Reference for API options)

## 3. Implementation Spec
- **Architecture:**
  - Extend the existing `commander` definition in `render.ts` with `--start-frame` and `--frame-count` options.
  - Parse these options as integers.
  - Pass them to the `Renderer` constructor options (`startFrame`, `frameCount`).
- **Pseudo-Code:**
  ```typescript
  // In registerRenderCommand:
  program.command('render <input>')
    // ... existing options
    .option('--start-frame <number>', 'Frame to start rendering from', '0')
    .option('--frame-count <number>', 'Number of frames to render')
    .action(async (input, options) => {
       // ...
       const renderer = new Renderer({
          // ...
          startFrame: options.startFrame ? parseInt(options.startFrame, 10) : undefined,
          frameCount: options.frameCount ? parseInt(options.frameCount, 10) : undefined
       });
       // ...
    })
  ```
- **Public API Changes:**
  - `helios render` accepts `--start-frame <n>`
  - `helios render` accepts `--frame-count <n>`
- **Dependencies:**
  - Requires `@helios-project/renderer` (already present).

## 4. Test Plan
- **Verification:**
  1. Build the CLI: `npm run build -w packages/cli`
  2. Create a test render command: `node packages/cli/bin/helios.js render examples/basic/index.html --start-frame 0 --frame-count 10 --output test_partial.mp4`
  3. Verify console output confirms "Starting capture for 10 frames..."
- **Success Criteria:**
  - The renderer initializes with correct frame range.
  - No regression in default full-render behavior.
- **Edge Cases:**
  - `startFrame` larger than duration (Renderer should handle or error).
  - `frameCount` 0 (should probably handle gracefully or error).
  - Negative values (parseInt handles, logic should probably validate).
