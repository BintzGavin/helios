#### 1. Context & Goal
- **Objective**: Implement the `helios components` command to browse available registry components.
- **Trigger**: `AGENTS.md` and `docs/BACKLOG.md` indicate the CLI must support project scaffolding ("Component Listing - helios components to browse available registry components"), but the current state only has `helios studio`.
- **Impact**: This unlocks the ability for users to browse available components in the registry.

#### 2. File Inventory
- **Create**: `packages/cli/src/commands/components.ts` (Contains the action logic for the components command).
- **Modify**: `packages/cli/src/index.ts` (Import and register the components command).
- **Read-Only**: `AGENTS.md`, `docs/BACKLOG.md`.

#### 3. Implementation Spec
- **Architecture**: Create a new Commander.js subcommand for `components` that queries the registry to list available components.
- **Pseudo-Code**:
  - In `packages/cli/src/commands/components.ts`:
    - Export a `registerComponentsCommand(program: Command)` function.
    - Define `.command('components')` with description 'List available components in the registry'.
    - In the action handler, query the mock registry to retrieve a list of components.
    - Format and print the list of components to the console.
  - In `packages/cli/src/index.ts`:
    - Import `registerComponentsCommand` from `./commands/components.js`.
    - Call `registerComponentsCommand(program)` before `program.parse(process.argv)`.
- **Public API Changes**: Adds `helios components` command.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `node packages/cli/dist/index.js components`.
- **Success Criteria**: The list of available components is printed to the console.
- **Edge Cases**: Network failure during registry fetch should gracefully exit with an error message.