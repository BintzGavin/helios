# Plan: Enable Remote Registry in Helios Studio

## 1. Context & Goal
- **Objective**: Update the `helios studio` command to fetch the component registry from a remote source (with local fallback) instead of using the hardcoded local manifest.
- **Trigger**: Vision gap. `AGENTS.md` defines the CLI as the primary interface for the registry ("Shadcn-style"), but the Studio command currently passes a static local registry to the UI, causing inconsistency with `helios add` which supports remote fetching.
- **Impact**: Users will see the full list of available components in the Studio UI, consistent with `helios components` and `helios add`, enabling a dynamic ecosystem.

## 2. File Inventory
- **Modify**: `packages/cli/src/commands/studio.ts` (Fetch registry before starting server)
- **Read-Only**: `packages/cli/src/registry/client.ts` (To verify `RegistryClient` usage)
- **Read-Only**: `packages/studio/src/server/plugin.ts` (To verify `studioApiPlugin` interface)

## 3. Implementation Spec
- **Architecture**:
  - In `studio.ts` action handler:
  - Initialize `defaultClient` (already exported from `client.ts`).
  - Await `defaultClient.getComponents()` to retrieve the list of components (this handles the fetch with timeout and local fallback).
  - Pass the result to `studioApiPlugin({ components: ... })`.
  - Add a console log to indicate registry loading status.
- **Pseudo-Code**:
  ```typescript
  import { defaultClient } from '../registry/client.js';
  // ...
  action(async (options) => {
    console.log('Starting Studio...');
    console.log('Loading component registry...');
    const components = await defaultClient.getComponents();

    // ... inside createServer ...
    plugins: [
      studioApiPlugin({
        // ...
        components: components,
        // ...
      })
    ]
  })
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
  1.  Start a mock HTTP server returning a custom component list.
  2.  Run `helios studio` with `HELIOS_REGISTRY_URL` pointing to the mock server.
  3.  Query `http://localhost:5173/api/components` and verify it returns the custom list.
  4.  Stop mock server and run `helios studio` again (fallback test).
  5.  Query `http://localhost:5173/api/components` and verify it returns the local registry.
- **Success Criteria**: Studio API returns remote components when available, and local components when offline.
- **Edge Cases**: Registry fetch timeout (handled by `client.ts`), Registry returns invalid JSON (handled by `client.ts`).
