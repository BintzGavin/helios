# 2026-02-19-CLI-scaffold-init-command.md

#### 1. Context & Goal
- **Objective**: Implement the `helios init` command in the CLI.
- **Trigger**: Vision gap - The CLI lacks a project initialization command, which is a prerequisite for the future Component Registry (`helios add`). This re-activates the unexecuted plan `2026-02-04-CLI-scaffold-init-command.md`.
- **Impact**: Enables users to scaffold a `helios.config.json` file, defining where components should be installed.

#### 2. File Inventory
- **Create**: `packages/cli/src/commands/init.ts`
- **Modify**: `packages/cli/src/index.ts`
- **Read-Only**: `packages/cli/package.json`

#### 3. Implementation Spec
- **Architecture**:
  - Use `commander` for command registration.
  - Use `readline` for interactive prompts to avoid introducing new heavy dependencies.
  - Use `chalk` for colored output (verified as existing dependency).
  - Output `helios.config.json` to the current working directory (`process.cwd()`).
- **Pseudo-Code**:
  - `registerInitCommand(program)` function:
    - Register command `init` with option `-y, --yes`.
    - In action handler:
      - Construct path to `helios.config.json`.
      - IF file exists:
        - Log error (red) "Configuration file already exists."
        - Exit process with code 1.
      - Define default configuration:
        ```javascript
        {
          version: '1.0.0',
          directories: {
            components: 'src/components/helios',
            lib: 'src/lib'
          }
        }
        ```
      - IF NOT `--yes` flag:
        - Create `readline` interface.
        - Helper function `ask(question, default)`:
          - Print question with default in parens (gray).
          - Return user input or default.
        - Ask "Where would you like to install components?" (default: `src/components/helios`).
        - Ask "Where is your lib directory?" (default: `src/lib`).
        - Update configuration object.
        - Close `readline`.
      - Write configuration to `helios.config.json` using `JSON.stringify(config, null, 2)`.
      - Log success (green) "Initialized helios.config.json".
- **Public API Changes**: New `helios init` CLI command.
- **Dependencies**: None (uses existing `commander` and `chalk`).

#### 4. Test Plan
- **Verification**:
  - Run `npm run build -w packages/cli`.
  - Create a temporary directory `temp_test`.
  - Run `node ../packages/cli/bin/helios.js init` inside `temp_test`.
  - Verify interactive prompts work.
  - Verify `helios.config.json` is created with input values.
  - Run `node ../packages/cli/bin/helios.js init -y` inside a new temp dir.
  - Verify defaults are used.
  - Run inside a directory with existing config.
  - Verify error message.
- **Success Criteria**: `helios.config.json` is valid JSON and contains the expected `directories` structure.
- **Edge Cases**:
  - User presses Enter for defaults.
  - User enters custom paths.
  - File permissions preventing write.
