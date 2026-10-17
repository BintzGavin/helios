#### 1. Context & Goal
- **Objective**: Implement the `helios add` command to fetch and copy components from the registry.
- **Trigger**: Vision gap identified in AGENTS.md where CLI needs registry commands, and docs/BACKLOG.md specifically asks to "Implement CLI command to fetch and copy components".
- **Impact**: Unlocks the Shadcn-style component distribution model, allowing users to consume and modify registry components locally.

#### 2. File Inventory
- **Create**: `packages/cli/src/commands/add.ts` (Command implementation to fetch and copy components)
- **Modify**: `packages/cli/src/index.ts` (Register the new `add` command)
- **Read-Only**: `packages/cli/src/commands/studio.ts` (To understand existing Commander.js patterns)

#### 3. Implementation Spec
- **Architecture**: Using Commander.js subcommands, fetch component source from the registry URL, parse its dependencies, and write the file(s) into the user's local components directory.
- **Pseudo-Code**:
  - Define `add` command with Commander.js accepting a `[component]` argument.
  - On action, fetch the component manifest from the configured registry.
  - Handle 404s with a helpful error message.
  - Read user's local project configuration to determine the target directory.
  - Write the component source code to the destination path.
  - Output success message.
- **Public API Changes**: Exports a new CLI command. No programmatic API exports required.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `helios add button` and verify the component source code is copied into the local repository.
- **Success Criteria**: A success message is printed and the file exists in the expected local path.
- **Edge Cases**:
  - Component not found in registry (should fail gracefully).
  - Target file already exists (should prompt to overwrite or fail).
  - Network failure during fetch.
