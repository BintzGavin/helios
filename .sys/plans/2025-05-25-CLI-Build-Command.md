# 2025-05-25-CLI-Build-Command.md

#### 1. Context & Goal
- **Objective**: Implement the `helios build` command to create production-ready static builds of Helios projects.
- **Trigger**: "Deployment workflows" is a V2 priority (AGENTS.md), and a standardized build command is the prerequisite for deployment. Currently, users rely on raw `vite build`.
- **Impact**: Unifies the CLI surface (`init` -> `studio` -> `build`), allows Helios to inject build-time optimizations, and prepares artifacts for future `helios deploy` commands.

#### 2. File Inventory
- **Create**: `packages/cli/src/commands/build.ts`
- **Modify**: `packages/cli/src/index.ts`
- **Read-Only**: `packages/cli/src/utils/config.ts`

#### 3. Implementation Spec
- **Architecture**:
  - The command uses `commander` to define `helios build`.
  - It wraps Vite's programmatic `build` API.
  - It respects the user's `vite.config.ts` (auto-resolved by Vite) and `helios.config.json` (for context).
  - It enforces standard output structure (defaulting to `dist/`).
- **Pseudo-Code**:
  ```typescript
  import { Command } from 'commander';
  import { build } from 'vite';
  import path from 'path';

  export function registerBuildCommand(program: Command) {
    program
      .command('build')
      .description('Build the project for production')
      .option('-o, --out-dir <dir>', 'Output directory', 'dist')
      .action(async (options) => {
        try {
            await build({
                root: process.cwd(),
                build: {
                    outDir: options.outDir,
                    emptyOutDir: true
                }
            });
            console.log('Build complete');
        } catch (e) {
            console.error('Build failed', e);
            process.exit(1);
        }
      });
  }
  ```
- **Public API Changes**:
  - New command: `helios build`
  - New option: `--out-dir`
- **Dependencies**:
  - `vite` (already in package.json)

#### 4. Test Plan
- **Verification**:
  - Run `helios build` in a test project.
  - Check that `dist/index.html` exists.
- **Success Criteria**:
  - Command runs successfully.
  - Output directory is populated.
- **Edge Cases**:
  - No `vite.config.ts` (should handle gracefully or rely on Vite's default).
  - Build errors (syntax errors in user code) should exit with code 1.
