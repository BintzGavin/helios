# Plan: Standardize Framer Motion Animation Example

## 1. Context & Goal
- **Objective**: Modernize `examples/framer-motion-animation` to align with project standards (TypeScript, Vite, Monorepo linking).
- **Trigger**: Vision gap - "Use What You Know" (Framer Motion) exists but is legacy JS implementation.
- **Impact**: Ensures maintainability and correct verification of the React/Framer Motion integration.

## 2. File Inventory
- **Modify**:
    - `examples/framer-motion-animation/package.json`: Add TS deps, update scripts.
    - `examples/framer-motion-animation/vite.config.js`: Rename to `.ts`, update config.
    - `examples/framer-motion-animation/src/App.jsx`: Rename to `.tsx`, convert to TS.
    - `examples/framer-motion-animation/src/main.jsx`: Rename to `.tsx`, convert to TS.
    - `examples/framer-motion-animation/src/hooks/useVideoFrame.js`: Rename to `.ts`, replace with standard hook.
    - `examples/framer-motion-animation/composition.html`: Update script src.
- **Create**:
    - `examples/framer-motion-animation/tsconfig.json`: Standard TS config.
- **Read-Only**:
    - `packages/core/src/index.ts` (for types reference).

## 3. Implementation Spec
- **Architecture**:
    - Convert to TypeScript.
    - Link local `@helios-project/core` via `file:` protocol.
    - Configure Vite for monorepo resolution (`server.fs.allow`, `resolve.alias`).
    - Use `useVideoFrame` hook pattern.
- **Pseudo-Code**:
    - `vite.config.ts`: Define aliases for `@helios-project/core` and `server.fs.allow`.
    - `tsconfig.json`: Extend base or use standard config with `paths`.
    - `App.tsx`:
        ```typescript
        import { Helios } from '@helios-project/core';
        import { useVideoFrame } from './hooks/useVideoFrame';

        const helios = new Helios({ duration: 5, fps: 30 });
        helios.bindToDocumentTimeline();

        export default function App() {
            const frame = useVideoFrame(helios);
            const progress = frame / (helios.duration * helios.fps);
            // ...
        }
        ```
- **Public API Changes**: None.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: `cd examples/framer-motion-animation && npm install && npm run build`.
- **Success Criteria**: `dist/` folder created with `composition.html` and assets.
- **Edge Cases**: Verify frame synchronization logic works with types.
