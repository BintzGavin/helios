# Context & Goal
- **Objective**: Implement `helios init --example <name>` to scaffold new projects from the `examples/` directory in the Helios repository.
- **Trigger**: Vision Gap - "Examples are a core teaching surface" but currently rely on local monorepo paths, making them unusable for end users.
- **Impact**: Enables users to instantly start with rich examples (e.g., `simple-animation`, `react-three-fiber`), significantly improving onboarding and experimentation.

# File Inventory
- **Modify**: `packages/cli/package.json` (Add `giget` dependency for fetching templates)
- **Modify**: `packages/cli/src/commands/init.ts` (Add `--example <name>` flag and integrate new logic)
- **Create**: `packages/cli/src/utils/examples.ts` (Logic for downloading and transforming examples)
- **Read-Only**: `examples/` (Reference for testing, but do not modify)

# Implementation Spec
- **Architecture**:
  - Integrate `giget` to download subdirectories from the Helios GitHub repository.
  - Implement a transformation pipeline to convert "monorepo-internal" examples into "standalone" user projects.
- **Pseudo-Code**:
  ```typescript
  // packages/cli/src/utils/examples.ts
  import { downloadTemplate } from 'giget';

  export async function scaffoldExample(exampleName: string, targetDir: string) {
    // 1. Download from GitHub
    await downloadTemplate(`github:helios-project/helios/examples/${exampleName}`, {
      dir: targetDir,
      force: true
    });

    // 2. Transform package.json
    const pkg = readJson(targetDir, 'package.json');
    pkg.dependencies = transformDeps(pkg.dependencies); // file:../../packages/core -> latest
    writeJson(targetDir, 'package.json', pkg);

    // 3. Transform vite.config.ts
    const viteConfig = readFile(targetDir, 'vite.config.ts');
    const cleanConfig = removeMonorepoConfig(viteConfig); // Remove server.fs.allow
    writeFile(targetDir, 'vite.config.ts', cleanConfig);
  }
  ```
- **Public API Changes**:
  - New flag: `helios init --example <name>`
- **Dependencies**:
  - `giget`: For downloading templates.

# Test Plan
- **Verification**:
  1. Run `helios init --example simple-animation` in a temporary directory.
  2. Verify the directory is populated.
  3. Check `package.json`: Ensure dependencies like `@helios-project/core` are valid versions (not `file:`).
  4. Check `vite.config.ts`: Ensure no `server.fs.allow` pointing to `../..`.
  5. Run `npm install` and `npm run build` in the new project to confirm it works (if possible in environment).
- **Success Criteria**:
  - The example is downloaded and transformed into a standalone, buildable project.
- **Edge Cases**:
  - Example does not exist (handle 404/error from `giget`).
  - Network failure.
  - Target directory not empty.
