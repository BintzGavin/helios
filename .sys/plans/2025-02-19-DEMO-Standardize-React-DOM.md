# Plan: Standardize React DOM Example

## 1. Context & Goal
- **Objective**: Upgrade `examples/react-dom-animation` to a fully standardized, strictly-typed TypeScript example.
- **Trigger**: The README promises "Pure TypeScript" support, but the primary React example is currently written in JavaScript (`.jsx`) and lacks a standard configuration (`package.json`, `tsconfig.json`), creating a gap between vision and reality.
- **Impact**: This provides a correct, strictly-typed reference implementation for React users, aligning with the project's quality standards and ensuring the example is self-contained and testable.

## 2. File Inventory
- **Create**:
    - `examples/react-dom-animation/package.json`: Define dependencies and build scripts.
    - `examples/react-dom-animation/tsconfig.json`: TypeScript configuration.
    - `examples/react-dom-animation/postcss.config.cjs`: Empty config to prevent build errors.
- **Modify**:
    - `examples/react-dom-animation/composition.html`: Update script reference to point to `.tsx` entry point.
    - `examples/react-dom-animation/vite.config.js` -> `examples/react-dom-animation/vite.config.ts`: Convert to TypeScript, add strictly typed configuration, and standardize aliases.
    - `examples/react-dom-animation/src/main.jsx` -> `examples/react-dom-animation/src/main.tsx`: Convert to strictly-typed TypeScript.
    - `examples/react-dom-animation/src/App.jsx` -> `examples/react-dom-animation/src/App.tsx`: Convert to strictly-typed TypeScript.
    - `examples/react-dom-animation/src/hooks/useVideoFrame.js` -> `examples/react-dom-animation/src/hooks/useVideoFrame.ts`: Convert to strictly-typed TypeScript.
- **Read-Only**:
    - `examples/simple-animation/tsconfig.json`: Reference for `compilerOptions`.
    - `package.json`: Reference for dependency versions.

## 3. Implementation Spec
- **Architecture**:
    - Convert the existing React/Vite example to a self-contained TypeScript project.
    - Use `package.json` with `file:` dependency for `@helios-project/core` to link to the local workspace.
    - Use strict TypeScript configuration with React JSX support.
- **Pseudo-Code / Config**:
    - **package.json**:
        ```json
        {
          "name": "react-dom-animation",
          "private": true,
          "type": "module",
          "scripts": { "build": "tsc && vite build" },
          "dependencies": {
            "react": "^19.2.3",
            "react-dom": "^19.2.3",
            "@helios-project/core": "file:../../packages/core"
          },
          "devDependencies": {
            "typescript": "^5.0.0",
            "vite": "^7.1.2",
            "@vitejs/plugin-react": "^5.1.2",
            "@types/react": "^19.0.0",
            "@types/react-dom": "^19.0.0"
          }
        }
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
            "jsx": "react-jsx",
            "strict": true,
            "types": ["vite/client"],
            "baseUrl": ".",
            "paths": {
              "@helios-project/core": ["../../packages/core/src/index.ts"]
            }
          },
          "include": ["src"]
        }
        ```
    - **composition.html**: Change `<script type="module" src="./src/main.jsx"></script>` to `<script type="module" src="./src/main.tsx"></script>`.
    - **vite.config.ts**:
        - Import `defineConfig` and `@vitejs/plugin-react`.
        - Set `alias`: `'@helios-project/core': path.resolve(__dirname, '../../packages/core/src/index.ts')`.
        - Set `server.fs.allow`: `[searchForWorkspaceRoot(path.resolve(__dirname, '../..'))]`.
    - **useVideoFrame.ts**: Add `Helios` type annotation (`import { Helios } from '@helios-project/core'`).
    - **App.tsx**: Ensure correct types for functional component.
- **Public API Changes**: None.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
    1.  Navigate to `examples/react-dom-animation`.
    2.  Run `npm install` (to link local package).
    3.  Run `npm run build`.
- **Success Criteria**:
    - Build completes without TypeScript errors.
    - `dist/composition.html` is generated.
- **Edge Cases**:
    - Verify that `postcss.config.cjs` prevents tailwind errors.
    - Verify that `@helios-project/core` types are correctly resolved via the path alias.
