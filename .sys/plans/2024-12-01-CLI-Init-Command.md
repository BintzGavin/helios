#### 1. Context & Goal
- **Objective**: Implement the `helios init` command to scaffold new Helios projects.
- **Trigger**: The V2 vision and `docs/BACKLOG.md` indicate a requirement for an `init` command to scaffold new projects, which is currently missing according to the prompt description.
- **Impact**: Provides a foundational developer experience improvement, allowing new users to immediately bootstrap a correct Helios project structure without manual configuration.

#### 2. File Inventory
- **Create**: `packages/cli/src/commands/init.ts` (Handles the `init` command logic)
- **Modify**: `packages/cli/src/index.ts` (Register the new `init` command)
- **Read-Only**: `AGENTS.md`, `packages/cli/src/commands/studio.ts` (For architectural patterns)

#### 3. Implementation Spec
- **Architecture**: Use Commander.js for the `init` subcommand. The command will use prompts (e.g., via `inquirer` or similar if available, or basic CLI arguments) to configure the new project (framework choice, typescript vs js). It will write a `helios.config.json` and basic project scaffold to the target directory.
- **Pseudo-Code**:
  - Register `init [dir]` command via Commander.js.
  - Check if the target directory is empty or prompt for confirmation.
  - Write default `helios.config.json` defining the registry URL, framework, and paths.
  - Optionally accept `--example` to bootstrap from an existing template (using tools like `giget` as referenced in status logs).
  - Install dependencies using the detected package manager.
  - Print success message and next steps.
- **Public API Changes**: Exports a `registerInitCommand(program: Command)` function that mounts the command.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npx tsx packages/cli/src/index.ts init my-test-project --example react` in a temporary directory.
- **Success Criteria**: A new directory `my-test-project` is created containing a valid `helios.config.json` and React template files, and a success message is displayed.
- **Edge Cases**: Target directory already exists and is not empty, network failure during template fetch, missing package manager.
