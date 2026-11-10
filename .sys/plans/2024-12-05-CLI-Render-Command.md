#### 1. Context & Goal
- **Objective**: Create the `helios render` CLI command.
- **Trigger**: The prompt specifies that the CLI is missing the render command as a vision gap from `AGENTS.md`.
- **Impact**: Enables local and distributed rendering from the command line, fulfilling a core V2 requirement.

#### 2. File Inventory
- **Create**: `.sys/plans/2024-12-05-CLI-Render-Command.md` (this file)
- **Modify**: `packages/cli/src/commands/render.ts` (Implement the render command logic)
- **Modify**: `packages/cli/src/index.ts` (Register the render command)
- **Read-Only**: `packages/cli/src/commands/studio.ts`, `AGENTS.md`

#### 3. Implementation Spec
- **Architecture**: Use Commander.js to define a `render` subcommand. It should accept arguments for the composition path and output options.
- **Pseudo-Code**:
  ```typescript
  // In packages/cli/src/commands/render.ts
  export const renderCommand = new Command('render')
    .description('Render a composition')
    .argument('<composition>', 'Path to the composition file')
    .option('-o, --output <path>', 'Output path')
    .action(async (composition, options) => {
      // 1. Validate composition path
      // 2. Initialize renderer (local or distributed)
      // 3. Execute rendering process
      // 4. Handle output and logging
    });
  ```
- **Public API Changes**: Adds `helios render` command.
- **Dependencies**: Requires existing `@helios-project/renderer` or `@helios-project/cli/renderer` infrastructure.

#### 4. Test Plan
- **Verification**: Run `helios render ./examples/simple/composition.html -o ./output.mp4`.
- **Success Criteria**: The command should execute successfully, output progress logs, and produce a valid `output.mp4` file.
- **Edge Cases**: Missing composition path, invalid output path, rendering failures, user cancellation.
