#### 1. Context & Goal
- **Objective**: Scaffold the `add` command for the component registry.
- **Trigger**: `AGENTS.md` states the CLI should have registry commands, and the backlog explicitly lists "Implement CLI command to fetch and copy components". The current state only has `studio.ts`.
- **Impact**: Unlocks the ability for users to fetch and copy Shadcn-style components directly into their Helios projects.

#### 2. File Inventory
- **Create**: `packages/cli/src/commands/add.ts` (Implementation of the add command)
- **Modify**: `packages/cli/src/index.ts` (Register the new add command with Commander.js)
- **Read-Only**: `AGENTS.md`

#### 3. Implementation Spec
- **Architecture**: Use Commander.js subcommands to implement `helios add [component]`. The command should fetch the component code from the registry URL and copy it into the user's local repository.
- **Pseudo-Code**:
  - Register `add` command.
  - Parse `component` argument.
  - Fetch component code from registry.
  - Write component code to local file system.
- **Public API Changes**: Export `registerAddCommand(program: Command)` from `add.ts`.
- **Dependencies**: The registry manifest format must be defined (already complete).

#### 4. Test Plan
- **Verification**: Run `cd packages/cli && npx ts-node src/index.ts add test-component` to verify the command executes.
- **Success Criteria**: The command should successfully fetch and copy a component, or emit an appropriate error if the registry is unreachable.
- **Edge Cases**: Missing component argument, registry fetch failure, local file write permissions.
