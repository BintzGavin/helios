# 2026-02-05-CLI-Studio-Registry-Integration.md

#### 1. Context & Goal
- **Objective**: Update the `helios studio` command to use the `RegistryClient` for fetching components, enabling the Studio UI to display and manage remote components instead of just the static local inventory.
- **Trigger**: Vision Gap - `helios studio` currently uses a hardcoded local registry, while `helios add` supports remote registries. This inconsistency causes the Studio UI to be out of sync with the CLI's capabilities.
- **Impact**: Unifies the registry experience. Users will see the same components in Studio as they see via `helios components`, and can install them directly from the UI.

#### 2. File Inventory
- **Modify**: `packages/cli/src/commands/studio.ts`
  - Replace direct `registry` import with `defaultClient`.
  - Fetch components asynchronously at startup.
  - Pass dynamic component list to `studioApiPlugin`.
- **Read-Only**: `packages/cli/src/registry/client.ts` (for interface reference)

#### 3. Implementation Spec
- **Architecture**:
  - The `studio` command will act as a "Registry Client consumer" similar to the `add` command.
  - It will preload the component list (remote + local fallback) before starting the Vite server.
  - This list will be injected into the `studioApiPlugin` and used for installation checks.

- **Pseudo-Code**:
  ```typescript
  import { defaultClient } from '../registry/client.js';
  // remove import { registry } ...

  // Inside action(async (options) => { ...
    console.log('Starting Studio...');

    // Fetch components once at startup
    console.log('Fetching component registry...');
    const components = await defaultClient.getComponents();

    // ... setup studioRoot ...

    // Inside createServer plugins:
      studioApiPlugin({
        studioRoot,
        components: components, // Pass the fetched list
        onInstallComponent: ...,
        onCheckInstalled: async (name) => {
           // Use the pre-fetched list to find the component definition
           const comp = components.find(c => c.name === name);
           if (!comp) return false;
           // ... existing file check logic using comp.files ...
        }
      })
  ```

- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  1. Run `npm run build` in `packages/cli`.
  2. Run `helios studio` (using the local bin).
  3. Observe console output for "Fetching component registry...".
  4. Verify Studio starts successfully on port 5173 (or specified port).
- **Success Criteria**:
  - `helios studio` starts without error.
  - "Fetching component registry..." log appears.
  - Code uses `defaultClient.getComponents()` instead of static `registry`.
