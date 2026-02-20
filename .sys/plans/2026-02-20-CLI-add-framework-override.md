#### 1. Context & Goal
- **Objective**: Add a `-f, --framework <name>` flag to the `helios add` command to allow installing components from frameworks other than the project's default.
- **Trigger**: The current implementation strictly enforces the project's configured framework, preventing users from installing utility components (e.g., 'vanilla') or experimenting with cross-framework components.
- **Impact**: Enables greater flexibility in component usage, allowing users to mix and match or manually override framework detection when needed, aligning with the "Shadcn-style" registry vision where users own the code.

#### 2. File Inventory
- **Create**: None.
- **Modify**:
    - `packages/cli/src/commands/add.ts`: Add CLI option and pass to install function.
    - `packages/cli/src/utils/install.ts`: Update `installComponent` to accept and prioritize the framework override.
    - `packages/cli/src/utils/__tests__/install.test.ts`: Add test cases for framework override.
- **Read-Only**: `packages/cli/src/registry/client.ts` (reference).

#### 3. Implementation Spec
- **Architecture**:
    - Update `add` command definition in Commander to accept `-f, --framework <name>`.
    - Pass this value to `installComponent` options.
    - In `installComponent`, prioritize `options.framework` over `config.framework` when resolving the component tree.
- **Pseudo-Code**:
    - **`packages/cli/src/commands/add.ts`**:
      ```typescript
      program.command('add <component>')
        .option('-f, --framework <name>', 'Override project framework')
        .action(async (name, options) => {
           // ...
           await installComponent(..., { ..., framework: options.framework });
        });
      ```
    - **`packages/cli/src/utils/install.ts`**:
      ```typescript
      export async function installComponent(..., options: { ..., framework?: string }) {
         // ...
         const framework = options.framework || config.framework;
         const componentsToInstall = await resolveComponentTree(client, componentName, framework);
         // ...
      }
      ```
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
    - Run `npm test -w packages/cli` to verify existing and new tests pass.
    - Create a new test case in `install.test.ts` that mocks `loadConfig` with `framework: 'react'` but calls `installComponent` with `framework: 'svelte'`, verifying that `RegistryClient.findComponent` is called with `'svelte'`.
- **Success Criteria**:
    - `helios add <component> --framework <name>` correctly requests the specified framework version from the registry.
    - Existing behavior (defaulting to config) is preserved when flag is omitted.
