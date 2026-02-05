# Plan: Auto-Install Dependencies in CLI

## 1. Context & Goal
- **Objective**: Enhance the `helios add` command to automatically install dependencies for added components.
- **Trigger**: The current CLI lists dependencies but requires the user to manually install them, which is a friction point compared to the "Shadcn-style" vision in AGENTS.md.
- **Impact**: Streamlines the component adoption process (one-step add), improving developer experience and alignment with V2 platform goals.

## 2. File Inventory
- **Create**: `packages/cli/src/utils/package-manager.ts`
  - Purpose: Utilities to detect the project's package manager (npm, yarn, pnpm, bun) and execute install commands.
- **Modify**: `packages/cli/src/utils/install.ts`
  - Change: Integrate `package-manager` utility to check and install dependencies after component files are written.
- **Modify**: `packages/cli/src/commands/add.ts`
  - Change: Add `--no-install` flag and pass the option to the install function.
- **Read-Only**: `packages/cli/src/registry/types.ts` (to understand `ComponentDefinition`)

## 3. Implementation Spec

### Architecture
1.  **Package Manager Detection**:
    - The CLI will inspect the project root for lockfiles (`yarn.lock`, `pnpm-lock.yaml`, `bun.lockb`) to determine the preferred package manager.
    - Defaults to `npm` if no lockfile is found.
2.  **Dependency Installation**:
    - After writing component files, the CLI will compare the component's required dependencies against `package.json`.
    - It will construct a list of missing dependencies.
    - It will spawn a child process to run the install command (e.g., `npm install react@^18.0.0`).
    - Output from the install process will be piped to the console.

### Pseudo-Code

**`packages/cli/src/utils/package-manager.ts`**
```typescript
type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun';

export function detectPackageManager(rootDir: string): PackageManager {
  // if yarn.lock -> yarn
  // if pnpm-lock.yaml -> pnpm
  // if bun.lockb -> bun
  // else -> npm
}

export async function installPackage(rootDir: string, dependencies: string[], isDev: boolean = false): Promise<void> {
  const pm = detectPackageManager(rootDir);
  // Construct command:
  // npm install ...
  // yarn add ...
  // pnpm add ...
  // bun add ...

  // spawn child process with stdio: 'inherit'
}
```

**`packages/cli/src/utils/install.ts`**
```typescript
import { installPackage } from './package-manager.js';

export async function installComponent(rootDir: string, componentName: string, options: { install: boolean }) {
  // ... existing file writing logic ...

  if (component.dependencies && options.install) {
    const depsToInstall: string[] = [];
    // Read package.json
    // For each dep in component.dependencies:
    //   If not in package.json dependencies/devDependencies:
    //     push `${dep}@${version}` to depsToInstall

    if (depsToInstall.length > 0) {
      console.log('Installing dependencies...');
      await installPackage(rootDir, depsToInstall);
    }
  }
}
```

**`packages/cli/src/commands/add.ts`**
```typescript
registerAddCommand(program) {
  program
    .command('add <component>')
    // ...
    .option('--no-install', 'Skip dependency installation')
    .action(async (componentName, options) => {
       // Pass options.install (defaults to true if flag not present)
       const shouldInstall = options.install !== false;
       await installComponent(process.cwd(), componentName, { install: shouldInstall });
    });
}
```

### Public API Changes
- New CLI Flag: `helios add <component> --no-install` (default behavior is to install).

### Dependencies
- No new external dependencies (use Node.js `fs` and `child_process`).

## 4. Test Plan
- **Verification**:
  1.  Run `helios init` in a temp directory.
  2.  Run `helios add button` (assuming 'button' has deps like 'clsx' or 'tailwind-merge').
  3.  Check `package.json` to ensure deps were added.
  4.  Check console output for install logs.
  5.  Run `helios add card --no-install`.
  6.  Verify deps were NOT installed.
- **Success Criteria**:
  - Dependencies are correctly installed using the detected package manager.
  - User can opt-out using `--no-install`.
- **Edge Cases**:
  - **Network Failure**: Install fails. The command should probably warn but consider the component "added" (files are written).
  - **Existing Dependencies**: Should not reinstall or downgrade if already present (basic check).
  - **Unknown Package Manager**: Defaults safely to `npm`.
