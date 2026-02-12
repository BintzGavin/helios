# Plan: Implement CLI Diff Command

## 1. Context & Goal
- **Objective**: Implement the `helios diff <component>` command to compare the local version of a component against the latest version in the registry.
- **Trigger**: The V2 Vision ("Shadcn-style component registry") implies users own and modify component code. A `diff` tool is essential for managing these modifications and deciding when/how to update.
- **Impact**: Enables safe component updates by allowing users to inspect upstream changes before overwriting their local work. This closes a gap between the vision of user-owned code and the current reality of "blind updates".
- **Prerequisites Verified**: `helios init`, `helios add`, and `RegistryClient` are fully implemented in the current codebase (v0.24.0), providing the necessary foundation.

## 2. File Inventory
- **Create**:
  - `packages/cli/src/commands/diff.ts`: Implementation of the diff command logic.
- **Modify**:
  - `packages/cli/src/index.ts`: Register the new `diff` command.
  - `packages/cli/package.json`: Add `diff` (jsdiff) dependency and `@types/diff` devDependency.
- **Read-Only**:
  - `packages/cli/src/registry/client.ts`: To understand how to fetch component definitions.
  - `packages/cli/src/utils/config.ts`: To resolve component directories.

## 3. Implementation Spec
- **Architecture**:
  - The command will be a sub-command: `helios diff <component>`.
  - It will load `helios.config.json` via `loadConfig()` to find the local component directory.
  - It will instantiate `RegistryClient` (using the configured registry URL) to fetch the remote component definition.
  - It will iterate through the files defined in the remote component manifest:
    - Construct the local file path using `config.directories.components` + file name.
    - If the local file exists, it will read it.
    - It will compare the local content (Left) with the remote content (Right) using `diff.createTwoFilesPatch`.
    - It will print a colored diff to `stdout`.
    - If the local file is missing, it will report it as "New in Registry".
    - If the remote file is missing (unlikely given we iterate remote), it won't show up here, but maybe we should check for local files not in remote? No, usually we care about updates to existing tracked files.
- **Pseudo-Code**:
  ```typescript
  import { Command } from 'commander';
  import { createTwoFilesPatch } from 'diff';
  import fs from 'fs';
  import path from 'path';
  import chalk from 'chalk';
  import { loadConfig } from '../utils/config.js';
  import { RegistryClient } from '../registry/client.js';

  export function registerDiffCommand(program: Command) {
    program
      .command('diff <component>')
      .description('Compare local component with registry version')
      .action(async (componentName) => {
        const config = loadConfig();
        if (!config) {
          console.error(chalk.red('No helios.config.json found.'));
          process.exit(1);
        }

        const client = new RegistryClient(config.registry);
        const remoteComponent = await client.findComponent(componentName, config.framework);

        if (!remoteComponent) {
          console.error(chalk.red(`Component "${componentName}" not found in registry.`));
          process.exit(1);
        }

        const localBaseDir = path.resolve(process.cwd(), config.directories.components);
        let hasDiff = false;

        for (const file of remoteComponent.files) {
          const localPath = path.join(localBaseDir, file.name);

          if (fs.existsSync(localPath)) {
            const localContent = fs.readFileSync(localPath, 'utf-8');
            const remoteContent = file.content;

            if (localContent.trim() !== remoteContent.trim()) {
               const patch = createTwoFilesPatch(
                 file.name,
                 file.name,
                 localContent,
                 remoteContent,
                 'Local',
                 'Registry'
               );
               console.log(patch); // TODO: Colorize this output if needed, or rely on terminal
               hasDiff = true;
            }
          } else {
            console.log(chalk.green(`New file: ${file.name} (only in registry)`));
            hasDiff = true;
          }
        }

        if (!hasDiff) {
          console.log(chalk.gray('No differences found.'));
        }
      });
  }
  ```
- **Dependencies**:
  - `diff` (npm package) for generating diffs.
  - `chalk` (already installed) for coloring.

## 4. Test Plan
- **Verification**:
  1. Initialize a new project: `helios init` (Command exists and generates config).
  2. Add a component: `helios add button` (Command exists and downloads component).
  3. Modify `src/components/helios/button.tsx` (e.g., add `// local change`).
  4. Run `helios diff button`.
- **Success Criteria**:
  - The command outputs a unified diff showing the added comment as a difference between "Local" and "Registry".
  - If no changes, it prints "No differences found."
- **Edge Cases**:
  - Component not installed locally (should warn or just show all as "New").
  - Component not found in registry (should error).
