# CLI: Implement Components Listing Command

## 1. Context & Goal
- **Objective**: Implement the `helios components` command to list available components in the registry.
- **Trigger**: Vision gap - AGENTS.md and status docs call for a registry listing command ("Component Listing"), but it is missing.
- **Impact**: Enables users to discover installable components (like `timer`) without guessing names, making the `add` command usable and completing the basic registry interface.

## 2. File Inventory
- **Create**: `packages/cli/src/commands/components.ts` (New command implementation)
- **Modify**: `packages/cli/src/index.ts` (Register the new command)
- **Read-Only**: `packages/cli/src/registry/manifest.ts` (Source of component data)

## 3. Implementation Spec
- **Architecture**:
  - The command will be implemented as a standard Commander.js action.
  - It will import the `registry` array directly from the manifest.
  - It will output a formatted list of components to stdout.
- **Pseudo-Code**:
  ```typescript
  // packages/cli/src/commands/components.ts
  import { Command } from 'commander';
  import chalk from 'chalk';
  import { registry } from '../registry/manifest.js';

  export function registerComponentsCommand(program: Command) {
    program
      .command('components')
      .description('List available components')
      .action(() => {
        if (registry.length === 0) {
          console.log(chalk.yellow('No components found in registry.'));
          return;
        }

        console.log(chalk.bold('Available components:'));
        for (const component of registry) {
          console.log(` - ${chalk.cyan(component.name)} ${chalk.gray(`(${component.type})`)}`);
        }
      });
  }
  ```
- **Public API Changes**:
  - Adds `helios components` command.
- **Dependencies**:
  - None.

## 4. Test Plan
- **Verification**:
  - Run `npm run build -w packages/cli`
  - Run `node packages/cli/bin/helios.js components`
- **Success Criteria**:
  - Output displays "Available components:" header.
  - Output lists "timer" (and its type "react").
- **Edge Cases**:
  - Registry is empty (should handle gracefully, though currently populated).
