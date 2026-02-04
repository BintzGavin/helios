# 2026-08-20-CLI-Add-Command-Scaffold.md

#### 1. Context & Goal
- **Objective**: Scaffold the `helios add` command and centralize configuration logic.
- **Trigger**: AGENTS.md requires a Shadcn-style registry interface; `helios add` is the entry point.
- **Impact**: Enables future implementation of component fetching and installation.

#### 2. File Inventory
- **Create**: `packages/cli/src/utils/config.ts` (Config loading and types)
- **Create**: `packages/cli/src/commands/add.ts` (The add command)
- **Modify**: `packages/cli/src/index.ts` (Register the command)
- **Modify**: `packages/cli/src/commands/init.ts` (Refactor to use shared config types)

#### 3. Implementation Spec
- **Architecture**:
  - Centralize `HeliosConfig` type and defaults in `utils/config.ts`.
  - `init` command writes this config.
  - `add` command reads this config using `loadConfig`.
  - `add` command will be a scaffold for now (logs only, no network calls).

- **Pseudo-Code**:
  - `packages/cli/src/utils/config.ts`:
    - Define and export `HeliosConfig` interface.
    - Define and export `DEFAULT_CONFIG` object.
    - Export `loadConfig()`:
      - Reads `helios.config.json` from `process.cwd()`.
      - Returns `HeliosConfig` or `null` if file missing.
      - Throws error if JSON is invalid.

  - `packages/cli/src/commands/init.ts`:
    - Import `DEFAULT_CONFIG` from `../utils/config.js`.
    - Use `DEFAULT_CONFIG` for defaults instead of local object.

  - `packages/cli/src/commands/add.ts`:
    - Export function `registerAddCommand(program: Command)`.
    - Inside `registerAddCommand`:
      - Define command `add <component>`.
      - Description: "Add a component to your project".
      - Action:
        - Call `loadConfig()`.
        - If result is null:
          - Console error "Configuration file not found. Run 'helios init' first."
          - Exit process with 1.
        - Console log `chalk.green('Adding ${component}...')`.
        - (Stub) Future: Fetch from registry and write to `config.directories.components`.

  - `packages/cli/src/index.ts`:
    - Import `registerAddCommand` from `./commands/add.js`.
    - Call `registerAddCommand(program)` before `program.parse`.

- **Public API Changes**:
  - New CLI command: `helios add [component]`

#### 4. Test Plan
- **Verification**:
  1. Navigate to `packages/cli`.
  2. Run `npm run build`.
  3. Create a temporary test directory.
  4. Run `node ../bin/helios.js add button` -> Expect Error (No config).
  5. Run `node ../bin/helios.js init -y` -> Expect Success.
  6. Run `node ../bin/helios.js add button` -> Expect "Adding button...".
- **Success Criteria**:
  - `helios add` exists and respects config presence.
  - `helios init` still works using shared defaults.
- **Edge Cases**:
  - Corrupt `helios.config.json` (should handle JSON parse error gracefully in `loadConfig` or propagate it).
