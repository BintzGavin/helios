#### 1. Context & Goal
- **Objective**: Implement the `helios init` CLI command to scaffold new Helios projects.
- **Trigger**: Documented vision gap in AGENTS.md (CLI is missing Init Command - `helios init` to scaffold new Helios projects).
- **Impact**: Unlocks the ability for users to easily bootstrap a new Helios project with the correct configuration, establishing the necessary folder structure for rendering and component registries.

#### 2. File Inventory
- **Create**: `packages/cli/src/commands/init.ts` (Implements the `init` command logic)
- **Modify**: `packages/cli/src/index.ts` (Registers the new `init` command)
- **Read-Only**: None

#### 3. Implementation Spec
- **Architecture**: Define a Commander.js subcommand for `init`. The command will prompt the user (or accept flags) to scaffold a basic Helios project in the current or specified directory. It will generate a default `helios.config.json` and basic project scaffolding.
- **Pseudo-Code**:
  - Register `init` command.
  - On action execution:
    - Check if the target directory already contains a Helios project.
    - If yes, abort or prompt for overwrite.
    - Create necessary directories (e.g., `src`, `components`).
    - Write a default `helios.config.json` configuring the registry URL and project settings.
    - Output success message instructing the user to run `helios studio`.
- **Public API Changes**: Exports a new `registerInitCommand(program: Command)` function for CLI registration. Exposes `helios init` to end users.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `helios init my-project` in a temporary directory.
- **Success Criteria**: The command successfully creates the project folder, generates `helios.config.json`, and sets up the correct initial scaffolding.
- **Edge Cases**: Target directory is not empty, missing write permissions.
