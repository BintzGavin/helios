# 2026-09-24-CLI-Unify-Studio-Registry.md

#### 1. Context & Goal
- **Objective**: Update `helios studio` command to use the unified `RegistryClient` (remote registry with local fallback) instead of the hardcoded local manifest.
- **Trigger**: "Studio Registry Disconnect" learning from .jules/CLI.md. Studio users currently see stale/limited components compared to `helios add`.
- **Impact**: Ensures Studio UI reflects the true component registry (Shadcn-style), aligning with V2 vision and ensuring consistency between `add` and `studio` commands.
- **State Note**: The codebase is currently at version 0.11.1 (per `docs/status/CLI.md` and file inspection), which is ahead of the "Current State" described in the initial agent prompt. `packages/cli/src/registry/client.ts` and `packages/cli/src/commands/add.ts` already exist. This plan addresses a gap in the *existing* v0.11.1 implementation.

#### 2. File Inventory
- **Modify**: `packages/cli/src/commands/studio.ts` (Switch from static import to `defaultClient.getComponents()`)
- **Read-Only**: `packages/cli/src/registry/client.ts` (Use existing client)
- **Read-Only**: `packages/cli/src/registry/manifest.ts` (Implicitly used as fallback by client)

#### 3. Implementation Spec
- **Architecture**: The `studio` command will now perform an asynchronous fetch of the component registry (using `RegistryClient`) before initializing the Vite server. This ensures the `studioApiPlugin` receives the most up-to-date component list.
- **Pseudo-Code**:
  ```typescript
  import { defaultClient } from '../registry/client.js'; // Replace manifest import

  // Inside action handler:
  console.log('Fetching component registry...');
  const components = await defaultClient.getComponents();

  // Pass to plugin
  studioApiPlugin({
    studioRoot: studioDist,
    components: components, // Dynamic list
    // ...
  })
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  - Run `helios studio` (using a mock or actual execution if possible).
  - Verify it prints "Fetching component registry..." (or equivalent).
  - Verify it starts without crashing even if remote is slow (client handles timeout).
- **Success Criteria**: The command runs, fetches (or falls back), and starts the server with component data.
- **Edge Cases**:
  - Network timeout (Client has 5s timeout -> fallback).
  - Invalid JSON (Client checks `Array.isArray` -> fallback).
