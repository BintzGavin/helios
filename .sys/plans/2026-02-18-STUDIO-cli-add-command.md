# Plan: Implement `helios add` CLI Command

#### 1. Context & Goal
- **Objective**: Implement the `helios add` CLI command to fetch and install components from a remote registry.
- **Trigger**: Backlog item "Implement CLI command to fetch and copy components" and "Design registry manifest format".
- **Impact**: Enables a "Shadcn-style" component ecosystem, allowing users to quickly bootstrap compositions with pre-built UI elements (e.g., Progress Bars, Audio Visualizers) directly from the command line.

#### 2. File Inventory
- **Create**:
  - `packages/cli/src/commands/add.ts`: The main implementation of the `add` command.
  - `packages/cli/src/utils/registry.ts`: Utilities for fetching the registry index and resolving component files.
  - `packages/cli/src/utils/config.ts`: Shared utilities for reading/writing `helios.config.json`.
- **Modify**:
  - `packages/cli/package.json`: Add `prompts` dependency.
  - `packages/cli/src/index.ts`: Register the `add` command.
  - `packages/cli/src/commands/init.ts`: Refactor to use the new `utils/config.ts` for consistency.
- **Read-Only**:
  - `packages/cli/bin/helios.js`: Entry point verification.

#### 3. Implementation Spec
- **Architecture**:
  - **Registry Schema**:
    - The registry will be a JSON file hosted on GitHub (e.g., `https://raw.githubusercontent.com/BintzGavin/helios/main/registry/index.json`).
    - **`RegistryIndex` Interface**:
      ```typescript
      interface RegistryIndex {
        version: string;
        components: RegistryComponent[];
      }
      interface RegistryComponent {
        name: string;
        description: string;
        files: string[]; // Paths relative to registry root
        dependencies?: string[]; // npm packages
      }
      ```
  - **Config Management**:
    - Extract configuration logic from `init.ts` into `utils/config.ts`.
    - `getConfig()`: Returns parsed `helios.config.json` or throws if missing.
  - **Command Flow (`add.ts`)**:
    1. Check for `helios.config.json` via `getConfig()`.
    2. Fetch registry index using `fetch()`.
    3. If `[component]` arg is missing, use `prompts` to show a searchable list.
    4. Fetch the selected component's files (constructing raw GitHub URLs).
    5. Write files to the user's project in the directory specified by `config.directories.components`.
    6. (Optional) Warn user about missing npm dependencies.

- **Pseudo-Code**:
  ```typescript
  // packages/cli/src/commands/add.ts
  export function registerAddCommand(program) {
    program
      .command('add [component]')
      .action(async (componentName) => {
        const config = getConfig(); // throws if missing
        const registry = await fetchRegistryIndex();

        if (!componentName) {
          componentName = await promptUserForComponent(registry);
        }

        const component = registry.find(c => c.name === componentName);
        if (!component) throw new Error('Component not found');

        for (const file of component.files) {
           const content = await fetchComponentFile(file);
           const dest = path.join(config.directories.components, componentName, file);
           writeFile(dest, content);
        }

        if (component.dependencies) {
           console.log('Please install:', component.dependencies.join(' '));
        }
      });
  }
  ```

- **Public API Changes**:
  - New CLI command available: `npx helios add <component-name>`.

- **Dependencies**:
  - `prompts`: For interactive component selection.
  - `node-fetch` (if not using Node 18+ global fetch, but assuming native).

#### 4. Test Plan
- **Verification**:
  1. **Build CLI**: Run `npm run build -w packages/cli`.
  2. **Init Test**: Create a temp directory, run `node <path_to_cli>/bin/helios.js init -y` to generate `helios.config.json`.
  3. **Add Test (Mock)**: Since the remote registry URL might return 404 during dev, manually mock the `fetchRegistryIndex` response in code or verify the network request is made to the correct URL.
  4. **Add Test (Real)**: If a registry file exists, verify files are downloaded to `src/components/helios/`.
- **Success Criteria**:
  - `helios add` prompts for component if no arg provided.
  - `helios add` reads config correctly.
  - Code structure separates registry logic from command logic.
- **Edge Cases**:
  - `helios.config.json` missing (should error gracefully).
  - Registry URL unreachable (should error gracefully).
  - Component not found.
