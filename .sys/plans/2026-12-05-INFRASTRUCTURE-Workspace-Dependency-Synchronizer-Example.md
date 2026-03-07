#### 1. Context & Goal
- **Objective**: Create an example script demonstrating the standalone use of the `syncWorkspaceDependencies` governance tool.
- **Trigger**: The INFRASTRUCTURE domain has reached gravitational equilibrium with the V2 vision. According to AGENTS.md, when no feature gaps exist, the agent must focus on allowed fallback actions. Creating examples is an explicitly allowed fallback action.
- **Impact**: Provides a clear, executable reference for how to use the bounded dependency synchronizer to ensure consistent package versions during testing or local development without violating domain boundaries.

#### 2. File Inventory
- **Create**:
  - `packages/infrastructure/examples/sync-workspace.ts` (New example script for the governance tooling)
- **Modify**:
  - `packages/infrastructure/package.json` (Update minor version if necessary for documentation/test addition)
- **Read-Only**:
  - `packages/infrastructure/src/governance/sync-workspace.ts` (To understand the `syncWorkspaceDependencies` API)
  - `packages/infrastructure/src/governance/index.ts` (To verify exports)

#### 3. Implementation Spec
- **Architecture**:
  - Implement a standalone Node.js script in `examples/sync-workspace.ts` that dynamically generates a temporary dummy package structure.
  - Apply the `syncWorkspaceDependencies` function to the temporary directory.
  - Log the before and after states of the `package.json` dependencies to demonstrate successful synchronization.
  - Clean up the temporary directory after the demonstration to avoid polluting the workspace.
- **Pseudo-Code**:
  ```typescript
  import fs from 'node:fs/promises';
  import path from 'node:path';
  import { syncWorkspaceDependencies } from '../src/governance/sync-workspace.js';

  async function main() {
    const tmpDir = path.join(process.cwd(), '.tmp-sync-example');
    // 1. Scaffold dummy packages and package.json files with outdated deps
    // ...
    // 2. Call syncWorkspaceDependencies({ rootDir: tmpDir })
    await syncWorkspaceDependencies({ rootDir: tmpDir });
    // 3. Read and log the updated package.json to show synchronized versions
    // ...
    // 4. Clean up tmpDir
  }
  main();
  ```
- **Public API Changes**: None. This is strictly an example addition.
- **Dependencies**: None.
- **Cloud Considerations**: Not applicable. This is local governance tooling.

#### 4. Test Plan
- **Verification**: Run `npx tsx packages/infrastructure/examples/sync-workspace.ts` from the root directory after running `npm install`.
- **Success Criteria**: The script should output the correct before and after states showing that the dummy dependencies were successfully synchronized to match the simulated workspace versions, and the temporary directory should be cleaned up.
- **Edge Cases**: Verify behavior when the package structure does not contain a `packages` directory or missing `package.json` files.
- **Integration Verification**: Run `npm test -w packages/infrastructure` to ensure no existing tests were broken.
