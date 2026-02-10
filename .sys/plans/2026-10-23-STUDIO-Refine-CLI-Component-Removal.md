# 1. Context & Goal
- **Objective**: Refine the `helios remove` CLI command to delete component files by default (with confirmation), ensuring a clean uninstall process and preventing file clutter.
- **Trigger**: Currently, `helios remove` only updates `helios.config.json` but leaves component files on disk. This inconsistency between configuration and filesystem confuses users and AI agents.
- **Impact**: Improves Developer Experience (DX) and Agent Experience (AX) by ensuring the filesystem reflects the configuration state.

# 2. File Inventory
- **Modify**: `packages/cli/src/commands/remove.ts` (Implement file identification, confirmation logic, and CLI options)
- **Read-Only**: `packages/cli/src/utils/uninstall.ts`, `packages/cli/src/registry/client.ts`, `packages/cli/src/utils/config.ts`

# 3. Implementation Spec
- **Architecture**: Update the `remove` command to interactively confirm file deletion using the `prompts` library. Add flags for non-interactive usage (`--yes`) and preserving files (`--keep-files`).
- **Pseudo-Code (in `remove.ts`)**:
  1.  Import `prompts` (from 'prompts'), `loadConfig` (from '../utils/config.js'), `defaultClient` (from '../registry/client.js'), `path`, `fs`.
  2.  Update command definition:
      - Add `.option('-y, --yes', 'Skip confirmation')`
      - Add `.option('--keep-files', 'Keep component files on disk')`
  3.  In `action(componentName, options)`:
      - If `--keep-files` is present:
          - Call `uninstallComponent(process.cwd(), componentName, { removeFiles: false })`.
          - Exit.
      - Load config: `const config = loadConfig(process.cwd())`.
      - If component not in `config.components`, throw error (or let `uninstallComponent` handle it).
      - Find definition: `const def = await defaultClient.findComponent(componentName, config.framework)`.
      - If definition found:
          - Resolve `componentsDir = path.resolve(process.cwd(), config.directories.components)`.
          - List `existingFiles` by iterating `def.files` and checking `fs.existsSync(path.join(componentsDir, file.name))`.
          - If `existingFiles.length > 0` AND `options.yes` is undefined:
              - Console log the files to be deleted.
              - Prompt: `const response = await prompts({ type: 'confirm', name: 'value', message: 'Delete these files?', initial: false })`.
              - If `!response.value`:
                  - Log "Cancelled".
                  - Exit (do not call uninstallComponent).
      - Call `uninstallComponent(process.cwd(), componentName, { removeFiles: true })`.
- **Public API Changes**:
  - CLI: `helios remove <component>` prompts for file deletion.
  - CLI: Added `-y, --yes` flag to skip confirmation.
  - CLI: Added `--keep-files` flag to skip file deletion.
- **Dependencies**: `prompts` (verified in `packages/cli/package.json`).

# 4. Test Plan
- **Verification**:
  1.  `npx helios add timer` (setup).
  2.  `npx helios remove timer` -> Answer No -> Verify files exist.
  3.  `npx helios remove timer --yes` -> Verify files deleted.
  4.  `npx helios add timer` (restore).
  5.  `npx helios remove timer --keep-files` -> Verify files exist but config updated.
- **Success Criteria**: Files deleted only on confirmation or `--yes`. Config always updated (unless cancelled).
