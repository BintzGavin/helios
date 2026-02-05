#### 1. Context & Goal
- **Objective**: Update the CLI to track which components are installed by recording them in `helios.config.json`.
- **Trigger**: Currently, `helios add` installs files but leaves no record of what was installed, making future updates or auditing impossible (Gap in "Registry Management").
- **Impact**: Enables future features like `helios update` and `helios list --installed`, aligning with the "Shadcn-style registry" vision.

#### 2. File Inventory
- **Modify**: `packages/cli/src/utils/config.ts` (Add `components` to interface, add `saveConfig` function)
- **Modify**: `packages/cli/src/utils/install.ts` (Update config after installation)
- **Modify**: `packages/cli/src/commands/init.ts` (Initialize with empty components list)

#### 3. Implementation Spec
- **Architecture**:
    - Extend `HeliosConfig` interface to include `components: string[]`.
    - Implement `saveConfig` to write JSON back to disk (preserving format if possible, or just `JSON.stringify(..., null, 2)`).
    - In `installComponent`:
        - Load config.
        - Perform installation.
        - If successful, push `componentName` to `config.components` (checking for duplicates).
        - Call `saveConfig`.
- **Public API Changes**:
    - `helios.config.json` will now have a `components` property.
    - `saveConfig` utility exported from `utils/config.ts`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
    1.  Run `helios init` in a temp dir. Verify `helios.config.json` has `components: []`.
    2.  Run `helios add timer`.
    3.  Check `helios.config.json`. It should contain `"components": ["timer"]`.
    4.  Run `helios add timer` again. It should not duplicate the entry.
- **Success Criteria**: Config file accurately reflects installed components after add operations.
