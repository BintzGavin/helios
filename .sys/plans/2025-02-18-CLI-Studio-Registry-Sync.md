# 2025-02-18-CLI-Studio-Registry-Sync

#### 1. Context & Goal
- **Objective**: Unify component registry access by updating `helios studio` to use `RegistryClient` instead of the hardcoded local manifest.
- **Trigger**: Code analysis confirmed `packages/cli/src/commands/studio.ts` imports a static registry manifest, diverging from the `RegistryClient` pattern used in `helios add`. This aligns with previous learnings recorded in `.jules/CLI.md`.
- **Impact**: Ensures the Studio UI displays the same component list as `helios add`, supporting remote registry updates and maintaining consistency across the CLI.

#### 2. File Inventory
- **Modify**: `packages/cli/src/commands/studio.ts` (Switch from static import to `RegistryClient`)
- **Read-Only**: `packages/cli/src/registry/client.ts` (To confirm API usage)
- **Read-Only**: `packages/cli/src/registry/manifest.ts` (To confirm type compatibility)

#### 3. Implementation Spec
- **Architecture**:
  - The `studio` command currently imports `registry` directly from `manifest.js`.
  - It will be updated to use `defaultClient.getComponents()` which supports remote fetching with local fallback.
  - The fetch will occur asynchronously during the command initialization (before server start) to ensure the `studioApiPlugin` receives the full, up-to-date list.
- **Pseudo-Code**:
  ```typescript
  import { defaultClient } from '../registry/client.js';
  // Remove: import { registry } from '../registry/manifest.js';

  // Inside action(async (options) => { ...
      console.log('Fetching component registry...');
      const components = await defaultClient.getComponents();

      // ... resolve studio paths ...

      const server = await createServer({
          // ...
          plugins: [
              studioApiPlugin({
                  studioRoot: studioDist,
                  components: components, // Use fetched list
                  onInstallComponent: ...,
                  onCheckInstalled: async (name) => {
                      // Use fetched list for lookup
                      const comp = components.find(c => c.name === name);
                      // ... rest of logic
                  }
              })
          ]
      });
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  1.  Run `npm run build` in `packages/cli` to ensure type safety.
  2.  Run `bin/helios.js studio --help` to ensure command registration is intact.
  3.  Run `bin/helios.js studio` (short run) to verify it starts up without crashing on fetch.
- **Success Criteria**:
  - `studio` command starts successfully.
  - `registry` import from `manifest.js` is removed from `studio.ts`.
- **Edge Cases**:
  - **Registry Timeout**: `RegistryClient` handles this internally and falls back to local manifest, so `studio` should still start even if offline.
