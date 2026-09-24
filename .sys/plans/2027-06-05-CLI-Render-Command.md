#### 1. Context & Goal
- **Objective**: Implement the `helios render` command to trigger local or distributed rendering.
- **Trigger**: Vision gap - CLI lacks the required rendering capabilities specified in AGENTS.md.
- **Impact**: Unlocks the ability for users to render compositions directly from the CLI.

#### 2. File Inventory
- **Create**: `packages/cli/src/commands/render.ts`
- **Modify**: `packages/cli/src/index.ts` (to register the command)
- **Read-Only**: None

#### 3. Implementation Spec
- **Architecture**: Use Commander.js to define a `render <input>` command. Parse options like `--output`, `--fps`, `--duration`, `--concurrency`, `--width`, and `--height`. Import the orchestrator from `@helios-project/renderer` and execute the render process. Add `--emit-job` to output a JSON job spec instead of rendering locally.
- **Pseudo-Code**:
  - Define `registerRenderCommand(program)`.
  - Add `render` command with options.
  - Action callback: Parse inputs, map options to options.
  - If `--emit-job`: call the orchestrator's plan method and write to JSON file.
  - Else: call the orchestrator's render method and await completion.
- **Public API Changes**: Exports `registerRenderCommand`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `helios render target/composition.html --duration 1`
- **Success Criteria**: An `output.mp4` file is generated without errors.
- **Edge Cases**: Missing input files, invalid FPS/duration, and error handling for orchestrator failures.
