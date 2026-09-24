#### 1. Context & Goal
- **Objective**: Scaffold the `helios add` command to fetch and copy components from the registry.
- **Trigger**: The AGENTS.md document and docs/BACKLOG.md specify the need for registry commands, and the current reality only has the `studio` command.
- **Impact**: This unlocks the ability for users to copy registry components into their repositories, a core requirement for the V2 component economy.

#### 2. File Inventory
- **Create**:
  - `packages/cli/src/commands/add.ts`: The Commander.js subcommand for `add`.
- **Modify**:
  - `packages/cli/src/index.ts`: Register the `add` command with the main program.
- **Read-Only**:
  - `packages/cli/src/commands/studio.ts`: Reference for existing command structure.

#### 3. Implementation Spec
- **Architecture**: Create a Commander.js subcommand `add [component]` that accepts a component name. Initially, it will log the intention to fetch the component from a registry URL.
- **Pseudo-Code**:
  - Define `registerAddCommand(program)` function.
  - Call `program.command('add <component>')`.
  - Add action handler that logs the component name being added.
- **Public API Changes**:
  - Export `registerAddCommand` from `packages/cli/src/commands/add.ts`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `helios add button` and verify component copied
- **Success Criteria**: Tests pass and the CLI outputs a message indicating it is adding the "button" component.
- **Edge Cases**: Missing component name argument should show Commander.js help/error.
