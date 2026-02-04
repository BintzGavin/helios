# 📋 STUDIO: Implement CLI Component Registry

## 1. Context & Goal
- **Objective**: Implement the `helios add` command to fetch and install components from a local registry.
- **Trigger**: The `helios add` command is currently a stub, and "Component Registry" is a key backlog item for V2.
- **Impact**: Unlocks the ability to ship reusable Helios components (starting with a `Timer`) to users, reducing boilerplate and demonstrating best practices.

## 2. File Inventory
- **Create**:
  - `packages/cli/src/registry/types.ts`: definitions for `ComponentDefinition` and `ComponentFile`.
  - `packages/cli/src/registry/manifest.ts`: The registry catalog containing the initial `timer` component.
- **Modify**:
  - `packages/cli/src/commands/add.ts`: Implement the registry lookup, file writing, and dependency logging logic.
- **Read-Only**:
  - `packages/cli/src/utils/config.ts`: To verify `HeliosConfig` structure and directory paths.

## 3. Implementation Spec
- **Architecture**:
  - **Local Registry**: The registry will be embedded in the CLI package as a TypeScript module (`manifest.ts`) exporting an array of `ComponentDefinition`. This avoids complex remote fetching for the MVP.
  - **Component Definition**:
    ```typescript
    interface ComponentDefinition {
      name: string; // e.g., 'timer'
      type: 'react' | 'vue' | 'svelte' | 'vanilla';
      files: { name: string; content: string }[]; // Content embedded as string
      dependencies?: Record<string, string>; // Peer dependencies to log
    }
    ```
- **Pseudo-Code**:
  ```typescript
  // packages/cli/src/commands/add.ts
  import { findComponent } from '../registry/manifest.js';

  export function registerAddCommand(program) {
    program.command('add <component>')
      .action(async (name) => {
        // 1. Verify Config
        const config = loadConfig();
        if (!config) exit("Run helios init first");

        // 2. Find Component
        const component = findComponent(name);
        if (!component) exit("Component not found");

        // 3. Resolve Target Directory
        const targetDir = path.resolve(process.cwd(), config.directories.components);
        ensureDir(targetDir);

        // 4. Write Files
        for (const file of component.files) {
          if (exists(file)) error("File exists");
          writeFile(file);
          log("Created " + file.name);
        }

        // 5. Log Dependencies
        if (component.dependencies) {
          log("Please install:", component.dependencies);
        }
      });
  }
  ```
- **Public API Changes**:
  - The `helios add <component>` command will now function.

## 4. Test Plan
- **Verification**:
  1. Create a temporary directory `temp_test`.
  2. Run `node packages/cli/bin/helios.js init`.
  3. Run `node packages/cli/bin/helios.js add timer`.
  4. Verify `src/components/helios/Timer.tsx` exists and contains the expected code.
- **Success Criteria**:
  - Command exits with 0 on success.
  - Files are created in the configured directory.
  - Dependencies are logged.
- **Edge Cases**:
  - `helios.config.json` missing -> Error.
  - Component not found -> Error.
  - File already exists -> Error (do not overwrite).
