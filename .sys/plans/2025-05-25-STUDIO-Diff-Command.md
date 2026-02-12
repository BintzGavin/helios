# CLI Diff Command

#### 1. Context & Goal
- **Objective**: Implement a `helios diff` CLI command to compare local component changes against the registry version.
- **Trigger**: Vision gap identified in "Vision Gaps to Hunt For" - users need a way to inspect changes before updating components.
- **Impact**: Improves developer experience by preventing accidental overwrites and allowing users to audit upstream changes.

#### 2. File Inventory
- **Create**: `packages/cli/src/commands/diff.ts` (Implements `diff` command logic)
- **Modify**: `packages/cli/src/index.ts` (Registers the command)
- **Modify**: `packages/cli/package.json` (Adds `diff` and `@types/diff` dependencies)

#### 3. Implementation Spec
- **Architecture**:
  - The command uses `RegistryClient` to fetch the component definition (including file content) without writing to disk.
  - It reads the corresponding local files from the configured `components` directory.
  - It uses the `diff` library (specifically `createTwoFilesPatch`) to generate a unified diff.
  - Output is colored using `chalk` (green for additions, red for deletions).
- **Pseudo-Code**:
  ```typescript
  import { createTwoFilesPatch } from 'diff';
  import { RegistryClient } from '../registry/client';
  import { loadConfig } from '../utils/config';
  import chalk from 'chalk';
  import fs from 'fs';
  import path from 'path';

  export function registerDiffCommand(program) {
    program.command('diff <component>')
      .description('Show differences between local component and registry version')
      .action(async (componentName) => {
        const config = loadConfig();
        if (!config) process.exit(1);

        const client = new RegistryClient(config.registry);
        // Find component using client.findComponent (which fetches remote definition)
        const remoteComponent = await client.findComponent(componentName);
        if (!remoteComponent) {
           console.error(`Component ${componentName} not found in registry.`);
           process.exit(1);
        }

        let hasChanges = false;
        const componentDir = path.resolve(process.cwd(), config.directories.components);

        for (const file of remoteComponent.files) {
          const localPath = path.join(componentDir, file.name);

          if (!fs.existsSync(localPath)) {
            console.log(chalk.yellow(`File ${file.name} only exists in registry (new file).`));
            hasChanges = true;
            continue;
          }

          const localContent = fs.readFileSync(localPath, 'utf-8');
          // Normalize line endings if necessary
          const patch = createTwoFilesPatch(
            file.name,
            file.name,
            localContent,
            file.content,
            'Local',
            'Registry'
          );

          // If patch is empty or just header, no changes.
          // createTwoFilesPatch returns a string that includes header.
          // We can check if it contains any chunks (@@ ... @@)
          if (patch.includes('@@')) {
            hasChanges = true;
            console.log(patch);
            // Ideally, we'd colorize the patch output line by line:
            // lines starting with '+' -> green
            // lines starting with '-' -> red
            // lines starting with '@' -> cyan
          }
        }

        if (!hasChanges) {
          console.log(chalk.green('No changes found. Local component matches registry.'));
        }
      });
  }
  ```
- **Dependencies**:
  - `diff` (npm package) - Use strict version compatible with ESM if needed.
  - `@types/diff` (dev dependency)

#### 4. Test Plan
- **Verification**:
  - Run `npx helios diff <component>` on a modified component -> Expect colored diff output showing specific line changes.
  - Run `npx helios diff <component>` on an unmodified component -> Expect "No changes found".
  - Run `npx helios diff <non-existent-component>` -> Expect error "Component not found".
  - Run `npx helios diff <component>` where local file is missing -> Expect "File only exists in registry".
- **Success Criteria**:
  - Command executes successfully.
  - Output clearly identifies differences between local and remote versions.
