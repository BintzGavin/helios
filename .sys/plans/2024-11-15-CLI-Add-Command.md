#### 1. Context & Goal
- **Objective**: Implement the `helios add` command to fetch and copy components from the registry.
- **Trigger**: Vision gap identified in AGENTS.md specifying the CLI must support fetching components, and a specific backlog item to "Implement CLI command to fetch and copy components".
- **Impact**: Enables users to add Shadcn-style components from the registry into their local repository, establishing the component economy.

#### 2. File Inventory
- **Create**: `packages/cli/src/commands/add.ts` - Contains the Commander.js setup and logic for fetching and copying components.
- **Modify**: `packages/cli/src/index.ts` - Register the new `add` command.
- **Read-Only**: `AGENTS.md` (to understand V2 registry goals), `packages/cli/src/registry/client.ts` (if exists, to understand registry fetching logic).

#### 3. Implementation Spec
- **Architecture**: Using Commander.js subcommands, create an `add` command that takes a component name, fetches its source from the registry, and writes it to the local project.
- **Pseudo-Code**:
  - Export a `registerAddCommand(program: Command)` function.
  - Register `program.command('add <component>')` with a description "Add a component to your project".
  - Add an option `--no-install` to skip dependency installation.
  - In the command action:
    - Load the local `helios.config.json` to get the registry URL.
    - Initialize the `RegistryClient`.
    - Call a utility function (e.g. `installComponent`) with the target directory, component name, and options.
    - Handle and log errors cleanly.
- **Public API Changes**: Export `registerAddCommand` in `packages/cli/src/commands/add.ts`.
- **Dependencies**: Requires `RegistryClient` to fetch components.

#### 4. Test Plan
- **Verification**: Run `node packages/cli/bin/helios add button` (or `npx tsx packages/cli/src/index.ts add button`) in a test project directory.
- **Success Criteria**: The CLI successfully contacts the registry, downloads the "button" component, and writes it to the local components directory.
- **Edge Cases**:
  - Component not found.
  - Network error.
