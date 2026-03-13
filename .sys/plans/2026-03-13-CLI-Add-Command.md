#### 1. Context & Goal
- **Objective**: Scaffold the `helios add` command to fetch and copy components from the registry.
- **Trigger**: The prompt explicitly states the current CLI only has the `studio.ts` command and the backlog explicitly requires "Implement CLI command to fetch and copy components" (`helios add [component]`).
- **Impact**: Enables users to fetch components from the Shadcn-style component registry directly into their local repository, fulfilling a core V2 architectural requirement.

#### 2. File Inventory
- **Create**:
  - `packages/cli/src/commands/add.ts`: The new command module for `helios add`.
  - `packages/cli/src/commands/__tests__/add.test.ts`: Unit tests for the new `add` command.
- **Modify**:
  - `packages/cli/src/index.ts`: Register the new `add` command.
- **Read-Only**:
  - `docs/BACKLOG.md`: For requirement tracking.
  - `AGENTS.md`: For V2 component registry architectural constraints.

#### 3. Implementation Spec
- **Architecture**: Use Commander.js subcommands to implement `add <component>`. The command should connect to the registry URL, download the component, and copy it to the local user's repository structure.
- **Pseudo-Code**:
  - `packages/cli/src/commands/add.ts`:
    - Export `registerAddCommand(program: Command)`.
    - Define `add <component>` command.
    - Inside the action, log "Fetching [component]..." and simulate or call logic to download the component.
  - `packages/cli/src/index.ts`:
    - Import `registerAddCommand` from `./commands/add.js`.
    - Call `registerAddCommand(program)`.
  - `packages/cli/src/commands/__tests__/add.test.ts`:
    - Write unit tests using Vitest to verify `add` command behavior and options parsing.
- **Public API Changes**: New `helios add` CLI command.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm run test` in `packages/cli`. Verify `npx tsx src/index.ts add button` successfully prints the component fetching process.
- **Success Criteria**: The CLI command `add` is registered, parses arguments correctly, and tests pass.
- **Edge Cases**: Missing component name should show Commander.js help output.