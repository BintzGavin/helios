# Spec: Standardize Pixi Canvas Example

#### 1. Context & Goal
- **Objective**: Standardize `examples/pixi-canvas-animation` to match the "Professional" example structure by adding `package.json`, `vite.config.ts`, and `tsconfig.json`.
- **Trigger**: "Standardize P5 Canvas Example" and "Standardize Three.js Canvas Example" were recently completed. `pixi-canvas-animation` is the next legacy example needing modernization.
- **Impact**: Ensures the example is portable, self-contained, and follows the "Professional" project structure promised in the README. It allows users to copy-paste the folder and run it immediately.

#### 2. File Inventory
- **Create**:
  - `examples/pixi-canvas-animation/package.json`: Define dependencies (`pixi.js`) and scripts.
  - `examples/pixi-canvas-animation/vite.config.ts`: Define build config and aliases.
  - `examples/pixi-canvas-animation/tsconfig.json`: Define TypeScript config.
- **Modify**:
  - `examples/pixi-canvas-animation/src/main.ts`: Refactor relative import `../../../packages/core...` to `@helios-project/core`.
- **Read-Only**:
  - `examples/simple-animation/vite.config.ts` (Reference)
  - `vite.build-example.config.js` (Root config)

#### 3. Implementation Spec

**Architecture:**
- Uses Vite for bundling. The example will be self-contained with its own dependencies but linked to the local `@helios-project/core` source for development.

**`examples/pixi-canvas-animation/package.json`:**
```json
{
  "name": "pixi-canvas-animation",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  },
  "dependencies": {
    "@helios-project/core": "file:../../packages/core",
    "pixi.js": "^8.0.0"
  }
}
```

**`examples/pixi-canvas-animation/vite.config.ts`:**
```typescript
import { defineConfig, searchForWorkspaceRoot } from 'vite';
import path from 'path';

export default defineConfig({
  server: {
    fs: {
      allow: [
        searchForWorkspaceRoot(path.resolve(__dirname, '../..')),
      ],
    },
  },
  resolve: {
    alias: {
      '@helios-project/core': path.resolve(__dirname, '../../packages/core/src/index.ts'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'composition.html'),
      },
    },
  },
});
```

**`examples/pixi-canvas-animation/tsconfig.json`:**
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
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    "types": ["vite/client"],
    "baseUrl": ".",
    "paths": {
      "@helios-project/core": ["../../packages/core/src/index.ts"]
    }
  },
  "include": ["src"]
}
```

**`examples/pixi-canvas-animation/src/main.ts`:**
- Change: `import { Helios } from '../../../packages/core/src/index.ts';`
- To: `import { Helios } from '@helios-project/core';`

#### 4. Test Plan
- **Verification**:
  1. Local Build: `npx vite build -c examples/pixi-canvas-animation/vite.config.ts`
     - Expectation: Builds successfully to `dist/` (or similar).
  2. Global Build: `npm run build:examples`
     - Expectation: Builds successfully to `output/example-build/`.
- **Success Criteria**: Both build commands exit with code 0.
- **Edge Cases**: Ensure `pixi.js` types are resolved correctly in the local `tsconfig.json`.
