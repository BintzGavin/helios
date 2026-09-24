#### 1. Context & Goal
- **Objective**: Implement the `helios add` command to fetch and install components from the registry.
- **Trigger**: Backlog item and AGENTS.md V2 CLI direction (Registry Commands - `helios add [component]`).
- **Impact**: This unlocks the core V2 capability of a component registry, allowing users to scaffold Shadcn-style components directly into their codebase, enabling them to modify and own the component code.

#### 2. File Inventory
- **Create**: `packages/cli/src/commands/add.ts` (Implementation of the `add` subcommand)
- **Modify**: `packages/cli/src/index.ts` (Register the new `add` command)
- **Read-Only**: `packages/cli/src/utils/config.js` (To retrieve user registry settings), `packages/cli/src/registry/client.js` (To fetch the component), `packages/cli/src/utils/install.js` (To install the component)

#### 3. Implementation Spec
- **Architecture**: Using Commander.js to define the `add <component>` subcommand. The command will read the Helios project configuration, instantiate a `RegistryClient`, and delegate to a utility function (`installComponent`) to perform the actual downloading and copying of component source files into the user's project, optionally skipping npm dependency installation if `--no-install` is provided.
- **Pseudo-Code**:
  1. Define command `add <component>`.
  2. Add option `--no-install` to allow skipping dependency installs.
  3. Action handler runs:
     a. Load project config via `getConfigOrThrow()`.
     b. Initialize `RegistryClient` with config registry URL.
     c. Call `installComponent()` with the component name, target directory, and client.
     d. Catch any errors, log them in red via `chalk`, and exit(1).
- **Public API Changes**: Exports a new `registerAddCommand(program: Command)` function to be used by the main CLI entry point.
- **Dependencies**: Implementation of `RegistryClient` and `installComponent` utilities must be stable.

#### 4. Test Plan
- **Verification**: Run `helios add button` in a test workspace.
- **Success Criteria**: The `button` component's source files are copied into the appropriate directory in the user's repository, and any required npm dependencies are installed (unless `--no-install` was used).
- **Edge Cases**:
  - The requested component does not exist in the registry (should display an appropriate error).
  - The command is run outside of a valid Helios project.
  - Network failure during registry fetch.
  - Existing component files conflict with the incoming files.
