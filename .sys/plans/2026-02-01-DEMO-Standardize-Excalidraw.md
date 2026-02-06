# Plan: Standardize Excalidraw Example

## 1. Context & Goal
- **Objective**: Standardize `examples/excalidraw-animation` by converting it to a self-contained TypeScript project with its own `package.json` and build configuration.
- **Trigger**: The Vision requires all examples to be "Standardized" (self-contained, typed, buildable) to serve as professional references. This example is currently legacy (JS-based, relies on root configs).
- **Impact**: Enables users to copy-paste this complex example and use it immediately. Ensures strict type checking for the Excalidraw integration.

## 2. File Inventory
- **Create**:
    - `examples/excalidraw-animation/package.json`: Project manifest.
    - `examples/excalidraw-animation/tsconfig.json`: TypeScript configuration.
- **Modify**:
    - `examples/excalidraw-animation/vite.config.js` -> `examples/excalidraw-animation/vite.config.ts`: Convert to TS.
    - `examples/excalidraw-animation/src/main.jsx` -> `examples/excalidraw-animation/src/main.tsx`: Convert to TSX.
    - `examples/excalidraw-animation/src/App.jsx` -> `examples/excalidraw-animation/src/App.tsx`: Convert to TSX.
    - `examples/excalidraw-animation/src/diagram.js` -> `examples/excalidraw-animation/src/diagram.ts`: Convert to TS.
    - `examples/excalidraw-animation/src/hooks/useVideoFrame.js` -> `examples/excalidraw-animation/src/hooks/useVideoFrame.ts`: Convert to TS.
    - `examples/excalidraw-animation/composition.html`: Update entry point.

## 3. Implementation Spec

### Architecture
- **Bundler**: Vite (standardized config).
- **Language**: TypeScript (Strict mode).
- **Dependencies**: explicit `package.json` referencing `file:../../packages/core`.

### Pseudo-Code

#### `examples/excalidraw-animation/package.json`
```json
{
  "name": "@helios-examples/excalidraw-animation",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@excalidraw/excalidraw": "^0.18.0",
    "@helios-project/core": "file:../../packages/core",
    "react": "^19.2.3",
    "react-dom": "^19.2.3"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^5.1.2",
    "typescript": "^5.0.0",
    "vite": "^7.1.2"
  }
}
```

#### `examples/excalidraw-animation/tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

#### `examples/excalidraw-animation/vite.config.ts`
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  define: {
    "process.env.IS_PREACT": JSON.stringify("false"),
  },
  resolve: {
    alias: {
      '@helios-project/core': path.resolve(__dirname, '../../packages/core/src/index.ts')
    }
  },
  server: {
    fs: {
      allow: ['../..']
    }
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

#### `src/App.tsx`
- Import `Excalidraw` from `@excalidraw/excalidraw`.
- Import `Helios` from `@helios-project/core`.
- Type `excalidrawAPI` state as `any` (Excalidraw types can be complex, `any` is acceptable for API ref initially, or try to import `ExcalidrawImperativeAPI` if available).
- Type `elements` in `getArchitectureElements` (see below).

#### `src/diagram.ts`
- Export `ExcalidrawElement` type if needed or use inferred types.
- Ensure `getArchitectureElements` returns `ExcalidrawElement[]` (or equivalent compatible type).
- Add type annotations for function parameters (`frame: number`).

## 4. Test Plan
- **Verification**:
  ```bash
  cd examples/excalidraw-animation
  npm install
  npm run build
  ```
- **Success Criteria**:
  - `dist/` directory is created.
  - `dist/assets` contains compiled JS/CSS.
  - No TypeScript errors during compilation.
