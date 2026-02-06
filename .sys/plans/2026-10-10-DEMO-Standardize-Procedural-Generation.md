# 2026-10-10-DEMO-Standardize-Procedural-Generation.md

#### 1. Context & Goal
- **Objective**: Standardize `examples/procedural-generation` by converting it to a self-contained, typed example with `package.json` and `tsconfig.json`.
- **Trigger**: Vision gap - "Use What You Know" implies professional-grade examples users can copy-paste. The current example lacks dependency definitions and relies on legacy relative imports.
- **Impact**: Enables users to "eject" this example easily, improves project hygiene, and ensures it builds correctly with the standard toolchain.

#### 2. File Inventory
- **Create**:
    - `examples/procedural-generation/package.json`: To define dependencies and scripts.
    - `examples/procedural-generation/tsconfig.json`: To ensure type safety.
    - `examples/procedural-generation/vite.config.ts`: To replace the JS config and provide proper aliases.
- **Modify**:
    - `examples/procedural-generation/src/main.ts`: Update imports from relative paths to `@helios-project/core`.
- **Delete**:
    - `examples/procedural-generation/vite.config.js`: Replaced by the TypeScript version.
- **Read-Only**:
    - `packages/core/package.json`: To verify the version for dependencies.

#### 3. Implementation Spec
- **Architecture**:
    - The example will be self-contained with its own `package.json` marking it as `private: true`.
    - It will depend on `@helios-project/core` (version matching the workspace).
    - `vite.config.ts` will configure aliases to point `@helios-project/core` to the local workspace source for development ease.
- **Pseudo-Code**:
    - **package.json**:
      ```json
      {
        "name": "procedural-generation",
        "private": true,
        "type": "module",
        "scripts": { "dev": "vite", "build": "tsc && vite build" },
        "dependencies": { "@helios-project/core": "file:../../packages/core" },
        "devDependencies": { "typescript": "^5.0.0", "vite": "^5.0.0" }
      }
      ```
    - **vite.config.ts**: Standard Vite config with alias:
      ```ts
      import { defineConfig } from 'vite';
      import path from 'path';

      export default defineConfig({
        resolve: {
          alias: {
            '@helios-project/core': path.resolve(__dirname, '../../packages/core/src/index.ts')
          }
        },
        server: {
          fs: {
             allow: ['../..']
          }
        }
      });
      ```
    - **tsconfig.json**:
      ```json
      {
        "compilerOptions": {
          "target": "ES2020",
          "useDefineForClassFields": true,
          "module": "ESNext",
          "lib": ["ES2020", "DOM", "DOM.Iterable"],
          "skipLibCheck": true,
          "moduleResolution": "bundler",
          "allowImportingTsExtensions": true,
          "resolveJsonModule": true,
          "isolatedModules": true,
          "noEmit": true,
          "strict": true,
          "baseUrl": ".",
          "paths": {
            "@helios-project/core": ["../../packages/core/src/index.ts"]
          }
        },
        "include": ["src"]
      }
      ```
    - **src/main.ts**: Change `import ... from '../../../packages/core/src/index'` to `import ... from '@helios-project/core'`.

#### 4. Test Plan
- **Verification**:
    1.  Run `npm install` in `examples/procedural-generation`.
    2.  Run `npm run build` in `examples/procedural-generation` to verify independent build.
    3.  Run `npx helios render examples/procedural-generation/composition.html` from the root to verify the renderer still works with it.
- **Success Criteria**:
    - `npm run build` completes with exit code 0.
    - `helios render` produces a valid video file.
- **Pre-Commit**:
    - Complete pre commit steps to ensure proper testing, verification, review, and reflection are done.
