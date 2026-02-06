# 2026-10-06-CLI-Update-Command.md

#### 1. Context & Goal
- **Objective**: Implement `helios update <component>` to allow users to update or re-install components from the registry.
- **Trigger**: "Registry Lifecycle Gap" - Users currently cannot easily reset a component to its original state or pull upstream updates without manually deleting files.
- **Impact**: completes the CRUD lifecycle for components (Create=Add, Read=List, Update=Update, Delete=Remove), aligning with the "Shadcn-style" registry vision where users own the code but can also refresh it.

#### 2. File Inventory
- **Create**: `packages/cli/src/commands/update.ts` (New command implementation)
- **Modify**: `packages/cli/src/index.ts` (Register the new command)
- **Modify**: `packages/cli/src/utils/install.ts` (Add `overwrite` option to `installComponent` function)
- **Read-Only**: `packages/cli/src/utils/config.ts` (To load/save config)

#### 3. Implementation Spec
- **Architecture**:
    - The `update` command effectively acts as a "force re-install".
    - It leverages the existing `installComponent` logic but bypasses the "skip if exists" check.
    - It enforces a safety check: the component MUST be present in `helios.config.json` (meaning it was previously installed).
- **Public API Changes**:
    - New CLI command: `helios update <component> [options]`
        - Options: `-y, --yes` (Skip confirmation prompt), `--no-install` (Skip dependency installation)
    - `installComponent` signature update:
        - Accepts `options: { install: boolean, overwrite?: boolean }`
- **Pseudo-Code**:
    - **installComponent**:
        - ...
        - Loop through files:
            - If file exists AND `!options.overwrite`:
                - Warn and skip
            - Else:
                - Write file (overwrite)
    - **update command**:
        - Load config.
        - Check if `component` is in `config.components`.
            - If NO: Error "Component not found in project. Use 'add' to install new components."
        - If `!options.yes`:
            - Prompt "This will overwrite changes in '${component}'. Continue? (y/N)"
            - If not 'y': Abort.
        - Call `installComponent(..., { overwrite: true, install: options.install })`.

#### 4. Test Plan
- **Verification**:
    1.  **Setup**: Initialize a project (`helios init`) and add a component (`helios add button`).
    2.  **Modify**: Change the content of `src/components/helios/Button.tsx`.
    3.  **Update**: Run `helios update button`.
        -   Expect prompt.
        -   Confirm 'y'.
    4.  **Verify**: Check that `src/components/helios/Button.tsx` is restored to the registry version.
    5.  **Edge Case**: Run `helios update non-existent-component`.
        -   Expect error message "Component not found".
    6.  **Edge Case**: Run `helios update button -y`.
        -   Expect no prompt and successful overwrite.
    7.  **Regression**: Run `helios add button`.
        -   Expect warning "File already exists" and NO overwrite (since `add` calls `installComponent` without `overwrite: true`).
- **Success Criteria**: The command successfully restores/updates component files and installs dependencies (unless skipped), completing the lifecycle loop.
- **Pre-Commit**: Complete pre commit steps to make sure proper testing, verifications, reviews and reflections are done.
