# 2025-02-21-CLI-Diff-Command.md

## 1. Context & Goal
- **Objective**: Implement `helios diff` command to compare local component code with the registry version.
- **Trigger**: Vision gap - "Users own and modify component code". Currently, users have no easy way to identify upstream changes or verify their local modifications against the registry. `helios update` blindly overwrites local changes, making maintenance risky.
- **Impact**: Enhances the "Shadcn-style" workflow by allowing safe updates and code audits. Aligns with the "Product Surface Priority" of the CLI.

## 2. File Inventory
- **Create**: `packages/cli/src/commands/diff.ts` (New command implementation)
- **Create**: `packages/cli/src/utils/diff.ts` (Diff utility functions)
- **Modify**: `packages/cli/src/index.ts` (Register new command)
- **Modify**: `packages/cli/package.json` (Add `diff` package dependency)

## 3. Implementation Spec
- **Architecture**:
  - The `diff` command will load the project configuration to identify installed components.
  - It will use `RegistryClient` (or `defaultClient`) to fetch the latest component definition from the registry.
  - It will read the local files corresponding to the component.
  - It will use the `diff` library (e.g., `npm diff`) to generate line-by-line differences between local and remote content.
  - It will print color-coded diffs to stdout.

- **Pseudo-Code**:
  ```typescript
  // packages/cli/src/commands/diff.ts
  import { Command } from 'commander';
  import { createTwoFilesPatch } from 'diff';
  import { defaultClient } from '../registry/client';
  import { loadConfig } from '../utils/config';
  import fs from 'fs';
  import path from 'path';
  import chalk from 'chalk';

  export function registerDiffCommand(program: Command) {
    program
      .command('diff <component>')
      .description('Compare local component code with registry version')
      .action(async (componentName) => {
        const config = loadConfig();
        if (!config) exit('No config found');

        const component = await defaultClient.findComponent(componentName, config.framework);
        if (!component) exit('Component not found in registry');

        const componentDir = path.resolve(process.cwd(), config.directories.components);

        let hasChanges = false;
        for (const file of component.files) {
           const localPath = path.join(componentDir, file.name);

           if (!fs.existsSync(localPath)) {
              console.log(chalk.red(`Missing local file: ${file.name}`));
              hasChanges = true;
              continue;
           }

           const localContent = fs.readFileSync(localPath, 'utf-8');
           const remoteContent = file.content;

           if (localContent !== remoteContent) {
              const patch = createTwoFilesPatch(file.name, file.name, localContent, remoteContent, 'Local', 'Registry');
              console.log(patch);
              hasChanges = true;
           }
        }

        if (!hasChanges) {
           console.log(chalk.green('No changes found. Local component matches registry.'));
        }
      });
  }
  ```

- **Public API Changes**:
  - New CLI command `helios diff <component>`.
  - New dependency `diff` in `packages/cli/package.json`.

- **Dependencies**:
  - Requires `diff` package (install via `npm install diff @types/diff`).

## 4. Test Plan
- **Verification**:
  1.  Install a component (e.g. `helios add button`).
  2.  Modify the local `Button.tsx` (add a comment or change a line).
  3.  Run `helios diff button`.
  4.  Expect output to show the difference (e.g. `+ // comment`).
  5.  Run `helios diff button` on an unmodified file. Expect "No changes" or empty output.
  6.  Run `helios diff non-existent-component`. Expect error.
- **Success Criteria**:
  - Command correctly identifies changed files.
  - Output uses standard diff format.
  - Handles missing local files (should show as "deleted" or "missing").
  - Handles missing registry components (error).

## 5. Pre Commit
- Complete pre commit steps to ensure proper testing, verifications, reviews and reflections are done.
