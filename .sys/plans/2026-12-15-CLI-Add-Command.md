#### 1. Context & Goal
- **Objective**: Implement the `helios add` command to fetch and copy components from the registry.
- **Trigger**: Backlog item "Implement CLI command to fetch and copy components". The issue prompt explicitly mentions the current state is minimal structure (`src/index.ts`, `src/commands/studio.ts`) and that the `add` command needs to be scaffolded for the component registry.
- **Impact**: Enables users to install components locally into their repositories, fulfilling the Shadcn-style registry requirement.

#### 2. File Inventory
- **Create**:
  - `packages/cli/src/commands/add.ts` (Implement the `helios add` command logic)
- **Modify**:
  - `packages/cli/src/index.ts` (Register the new `add` command)
- **Read-Only**:
  - `packages/cli/src/commands/studio.ts` (For reference on command registration pattern)

#### 3. Implementation Spec
- **Architecture**:
  - Use `Commander.js` to create the `add [component]` subcommand.
  - Implement a mock registry fetching logic (e.g., fetch from a remote URL or local registry source).
  - Ensure the component is copied into the user's repository (e.g., `src/components/` or as configured).
  - Users own and modify component code. Registry distributes source, not packages.
- **Pseudo-Code**:
  ```typescript
  // add.ts
  import { Command } from 'commander';
  import fs from 'fs';
  import path from 'path';

  export function registerAddCommand(program: Command) {
    program
      .command('add <component>')
      .description('Add a component to your project')
      .action(async (component) => {
        console.log(`Fetching component ${component} from registry...`);
        // 1. Fetch component definition and files from registry URL
        // 2. Resolve target directory in user project (e.g., src/components)
        // 3. Copy files to target directory
        console.log(`Successfully added ${component}`);
      });
  }
  ```
- **Public API Changes**: No changes to the core or renderer APIs. Adds `add` to the CLI.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `node packages/cli/bin/helios.js add button` to ensure the command executes and outputs the correct fetching messages.
- **Success Criteria**: The CLI correctly registers the `add` command and attempts to fetch/copy the specified component.
- **Edge Cases**: Missing component name argument, registry unavailable, target directory permissions.
