# Context & Goal
- **Objective**: Update the `helios studio` command to correctly identify and launch the Studio application in both user projects (via installed package) and the local monorepo (via source), and fix a broken import in the Studio binary.
- **Trigger**: The current CLI implementation hardcodes the Studio path to the monorepo structure, breaking usage for end users who install the package. Additionally, `bin/helios-studio.js` imports a non-existent file (`plugin.js`).
- **Impact**: Enables `npx helios studio` to work for end-users as promised in the README, while preserving the development workflow for contributors.

# File Inventory
- **Modify**: `packages/studio/bin/helios-studio.js`
  - Update import path from `plugin.js` to `index.js`.
- **Modify**: `packages/cli/src/commands/studio.ts`
  - Implement dual-strategy resolution (User Package vs. Monorepo Source).

# Implementation Spec
- **Architecture**:
  - Use `createRequire` to attempt resolving `@helios-project/studio/package.json` from the current working directory.
  - If found (User Mode): Spawn `node` pointing to the resolved package's `bin/helios-studio.js`.
  - If not found (Dev Mode): Fall back to the existing logic (checking `packages/studio` relative path and spawning `npm run dev`).
- **Pseudo-Code (studio.ts)**:
  ```typescript
  import { createRequire } from 'module';
  // ...
  const require = createRequire(import.meta.url);
  try {
    const pkgPath = require.resolve('@helios-project/studio/package.json', { paths: [process.cwd()] });
    const studioRoot = path.dirname(pkgPath);
    const binPath = path.join(studioRoot, 'bin', 'helios-studio.js');
    console.log(`Found Studio package at: ${studioRoot}`);

    spawn('node', [binPath], {
      cwd: process.cwd(),
      stdio: 'inherit',
      env: { ...process.env, HELIOS_PROJECT_ROOT: process.cwd() }
    });
  } catch (e) {
    // Existing fallback logic for monorepo
    console.log('Studio package not found in project, checking local monorepo...');
    // ...
  }
  ```
- **Dependencies**: None.

# Test Plan
- **Verification**:
  1. Run `npm run build -w packages/cli` to update the CLI binary.
  2. Run `node bin/helios.js studio` from the repository root to verify it still works in the monorepo (Fallback path).
  3. Verify `packages/studio/bin/helios-studio.js` content to ensure import is fixed.
- **Success Criteria**:
  - CLI builds successfully.
  - `node bin/helios.js studio` starts the dev server (indicating fallback logic works).
  - `packages/studio/bin/helios-studio.js` imports `index.js`.
