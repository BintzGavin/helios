# Plan: Implement `helios list` Command

#### 1. Context & Goal
- **Objective**: Implement `helios list` to display the list of installed components in the current project.
- **Trigger**: "Tracking Installed Components" [0.10.0] enabled recording components in `helios.config.json`, but there is no CLI command to view this inventory.
- **Impact**: Enables users to verify installed components and serves as a prerequisite for future `helios update` workflows.

#### 2. File Inventory
- **Create**: `packages/cli/src/commands/list.ts`
- **Modify**: `packages/cli/src/index.ts`
- **Read-Only**: `packages/cli/src/utils/config.ts`

#### 3. Implementation Spec
- **Architecture**:
    - Create a new Commander.js command `list`.
    - Use `loadConfig` to read `helios.config.json`.
    - Check if `config.components` exists and is non-empty.
    - Output the list of components to stdout using `console.log`.
    - Handle cases where config is missing or list is empty.
- **Pseudo-Code**:
    ```typescript
    registerListCommand(program) {
      program.command('list')
        .description('List installed components')
        .action(() => {
          config = loadConfig()
          if (!config) error("Run init first")
          if (!config.components || empty) warn("No components installed")
          print("Installed components:")
          for c in config.components: print(c)
        })
    }
    ```
- **Public API Changes**: New `helios list` command exposed to users.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
    - Run `helios list` in a directory without `helios.config.json` -> Expect error.
    - Run `helios list` in a directory with empty components -> Expect "No components found".
    - Manually edit `helios.config.json` to include `["button", "card"]`.
    - Run `helios list` -> Expect "button", "card" to be listed.
- **Success Criteria**: Output matches the contents of `helios.config.json`.
