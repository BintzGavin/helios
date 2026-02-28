# 2025-05-18-CLI-Scaffold-Add-Command

#### 1. Context & Goal
- **Objective**: Scaffold the `add` command in the CLI to fetch and install components from a component registry.
- **Trigger**: The V2 vision in `AGENTS.md` mandates a Shadcn-style component registry. The CLI currently only supports `helios studio`. The backlog explicitly lists "Implement CLI command to fetch and copy components" and "Implement registry commands".
- **Impact**: This is the first critical step toward fulfilling the V2 Component Registry vision. It unlocks the ability for users to consume distributed source components within their local repositories.

#### 2. File Inventory
- **Create**: `packages/cli/src/commands/add.ts` - Contains the new `add` Commander.js subcommand and logic to fetch/write files.
- **Modify**: `packages/cli/src/index.ts` - Register the new `add` command with the main CLI program.
- **Read-Only**: `AGENTS.md`, `packages/cli/package.json`.

#### 3. Implementation Spec
- **Architecture**:
  - Use `commander` to define an `add [component]` subcommand.
  - The command will take the component name as an argument.
  - *Initial scaffold:* The command will simulate fetching from a registry URL (e.g., `https://registry.helios.video/components/[component].json`) and copying the files to the user's local directory (e.g., `./src/components/helios/`).
  - Follow the "Shadcn-style" requirement: source files must be copied, not binaries.
- **Pseudo-Code**:
```typescript
// packages/cli/src/commands/add.ts
import { Command } from 'commander';
import fs from 'fs/promises';
import path from 'path';

export function registerAddCommand(program: Command) {
  program
    .command('add <component>')
    .description('Add a component to your project')
    .action(async (componentName) => {
      console.log(`Fetching component: ${componentName}...`);

      // Placeholder for future RegistryClient logic
      // e.g., const registry = new RegistryClient();
      // const componentData = await registry.fetch(componentName);

      // Mock Data for initial scaffold
      const mockComponentData = {
        name: componentName,
        files: [
          { path: `${componentName}.tsx`, content: `export const ${componentName} = () => <div>Hello ${componentName}</div>;` }
        ]
      };

      const targetDir = path.resolve(process.cwd(), 'src/components/helios', componentName);
      await fs.mkdir(targetDir, { recursive: true });

      for (const file of mockComponentData.files) {
         const filePath = path.resolve(targetDir, file.path);
         await fs.writeFile(filePath, file.content, 'utf-8');
         console.log(`Created: ${filePath}`);
      }

      console.log(`Successfully added ${componentName}!`);
    });
}
```

```typescript
// packages/cli/src/index.ts
// ... existing imports
import { registerAddCommand } from './commands/add.js';

// ... inside the setup function where program is configured
registerAddCommand(program);
```

- **Public API Changes**:
  - Exposes a new `helios add <component>` command.
- **Dependencies**:
  - None directly for the scaffold, but future iterations will require a `RegistryClient` or similar abstraction.

#### 4. Test Plan
- **Verification**:
  1. Build the CLI: `cd packages/cli && npm run build`
  2. Run the command in a test directory: `npx helios add test-button`
  3. Verify that the file `src/components/helios/test-button/test-button.tsx` was created with the correct contents.
- **Success Criteria**: The `add` command executes successfully and creates the expected component files in the target directory based on the argument provided.
- **Edge Cases**:
  - Ensure the target directory is created if it doesn't exist.
  - Future edge cases (network failure, component not found) should be noted for when actual registry fetching is implemented.
