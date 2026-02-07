# CLI: Implement Example Init Command

## 1. Context & Goal
- **Objective**: Enable users to initialize a new Helios project by fetching an example from the official repository.
- **Trigger**: Vision gap "Examples are first-class product surfaces" and "Create examples demonstrating distributed rendering workflows". Currently, users must clone the entire monorepo to access examples.
- **Impact**: Removes friction for users adopting advanced patterns (like distributed rendering) and standardizes how examples are consumed.

## 2. File Inventory
- **Create**: `packages/cli/src/utils/example-loader.ts` (Handles fetching and transformation logic)
- **Modify**: `packages/cli/src/commands/init.ts` (Add `--example` flag and integration)
- **Modify**: `packages/cli/package.json` (Add `giget` dependency)
- **Read-Only**: `examples/` (Reference for structure)

## 3. Implementation Spec
- **Architecture**:
  - Add `giget` (from unjs) to handle downloading specific subdirectories from GitHub.
  - Extend `init` command with `--example <name>` option.
  - If `--example` is provided:
    1.  Fetch `github:BintzGavin/helios/examples/<name>#main` to the current directory.
    2.  Perform "Ejection":
        - Rewrite imports: `../../../packages/*` -> `@helios-project/*`.
        - Ensure `package.json` exists and add `@helios-project/*` dependencies if missing.
        - Ensure `vite.config.ts` is standard (remove monorepo-specific aliases if any).
  - If `--example` is NOT provided, fallback to existing scaffolding logic.

- **Pseudo-Code**:
  ```typescript
  // packages/cli/src/commands/init.ts
  program
    .command('init')
    .option('--example <name>', 'Initialize from an example')
    // ... existing options

  action(async (options) => {
    if (options.example) {
      await loadExample(options.example, process.cwd());
      return;
    }
    // ... existing logic
  });
  ```

  ```typescript
  // packages/cli/src/utils/example-loader.ts
  import { downloadTemplate } from 'giget';

  export async function loadExample(name: string, dir: string) {
    // 1. Download
    await downloadTemplate(`github:BintzGavin/helios/examples/${name}#main`, {
      dir,
      force: true // Handle with care, maybe prompt first?
    });

    // 2. Transform files (rewrite imports)
    // 3. Update package.json
  }
  ```

- **Public API Changes**:
  - New CLI Option: `helios init --example <name>`

- **Dependencies**:
  - `giget`: For fetching templates.

## 4. Test Plan
- **Verification**:
  1.  Run `npm install giget` in `packages/cli` (simulated, since we modify package.json in implementation).
  2.  Run `npm run build` in `packages/cli` to compile the new changes.
  3.  Create a temporary testing directory (`mkdir temp_test_init`).
  4.  Execute the local CLI using `node ../packages/cli/bin/helios.js init --example simple-animation` inside `temp_test_init`.
  5.  Verify files are present (`composition.html`, `package.json`, etc.).
  6.  Verify `package.json` dependencies include `@helios-project/core`.
  7.  Verify imports in `src/*.ts` (if any) are rewritten to `@helios-project/*`.
- **Success Criteria**: The example is downloaded and transformed into a standalone project.
- **Edge Cases**:
  - Example does not exist (handle 404 from giget).
  - Network failure.
  - Directory not empty (prompt or fail).

## 5. Pre-Commit Steps
- Complete pre commit steps to make sure proper testing, verifications, reviews and reflections are done.
