# 2026-02-04-CLI-scaffold-init-command.md

#### 1. Context & Goal
- **Objective**: Scaffold the `helios init` command to generate a project configuration file.
- **Trigger**: Vision gap - The CLI lacks a way to initialize a project and define component installation paths, which is a prerequisite for the registry `add` command mandated by `AGENTS.md`.
- **Impact**: Enables the future `helios add` command to know where to place components, moving closer to the "Shadcn-style registry" vision.

#### 2. File Inventory
- **Create**: `packages/cli/src/commands/init.ts` (New command implementation)
- **Modify**: `packages/cli/src/index.ts` (Register the new command)
- **Read-Only**: `packages/cli/package.json`

#### 3. Implementation Spec
- **Architecture**:
  - The command will be registered using `commander` similar to the existing `studio` command.
  - Interactive prompts will be handled using Node.js's native `readline` module to avoid introducing new dependencies like `inquirer` at this stage.
  - The output will be a `helios.config.json` file in the current working directory.
- **Pseudo-Code**:
  - Define `registerInitCommand` function accepting the `program`.
  - Add `init` command with description and `-y` / `--yes` option.
  - in Action:
    - Construct path to `helios.config.json` in `process.cwd()`.
    - IF file exists:
      - Log error and return.
    - Define default configuration (components: 'src/components/helios', lib: 'src/lib').
    - IF NOT `yes` option:
      - Create `readline` interface.
      - Prompt for "Components directory", default to preset.
      - Prompt for "Lib directory", default to preset.
      - Close interface.
    - Create final config object wrapping directories in a schema (e.g., `{ version, directories }`).
    - Write JSON string to file.
    - Log success message.
- **Public API Changes**: Adds `init` command to the CLI.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  - Build the CLI package.
  - Create a temporary test directory.
  - Run the built CLI `init` command in that directory.
  - Verify `helios.config.json` is created.
  - Verify content matches defaults or provided inputs.
- **Success Criteria**: `helios.config.json` is valid JSON and contains the expected paths.
- **Edge Cases**:
  - Running in a directory where `helios.config.json` already exists (should fail gracefully).
  - Running with `--yes` (should skip prompts).
