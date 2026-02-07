#### 1. Context & Goal
- **Objective**: Standardize the `examples/social-media-story` example by converting it to TypeScript, adding `package.json` and `tsconfig.json`, and configuring Vite correctly.
- **Trigger**: The example currently lacks standard configuration files, uses relative imports for core packages, and is not using TypeScript, creating a "legacy" feel compared to other examples.
- **Impact**: Ensures the example is self-contained, type-safe, and serves as a proper reference for users (especially React users).

#### 2. File Inventory
- **Create**:
    - `examples/social-media-story/package.json`: Define dependencies and scripts.
    - `examples/social-media-story/tsconfig.json`: TypeScript configuration extending root.
- **Modify**:
    - `examples/social-media-story/vite.config.js` -> `examples/social-media-story/vite.config.ts`: Update to TS and standard alias pattern.
    - `examples/social-media-story/composition.html`: Update entry point reference.
    - `examples/social-media-story/src/main.jsx` -> `examples/social-media-story/src/main.tsx`: Convert to TS.
    - `examples/social-media-story/src/App.jsx` -> `examples/social-media-story/src/App.tsx`: Convert to TS, fix imports.
    - `examples/social-media-story/src/components/StorySequence.jsx` -> `examples/social-media-story/src/components/StorySequence.tsx`: Add types.
    - `examples/social-media-story/src/context/FrameContext.js` -> `examples/social-media-story/src/context/FrameContext.ts`: Add types.
    - `examples/social-media-story/src/hooks/useVideoFrame.js` -> `examples/social-media-story/src/hooks/useVideoFrame.ts`: Add types.
    - `examples/social-media-story/src/assets/media.js` -> `examples/social-media-story/src/assets/media.ts`: Convert to TS.
- **Read-Only**:
    - `examples/react-css-animation/tsconfig.json`: Reference for config.
    - `examples/react-css-animation/vite.config.ts`: Reference for config.

#### 3. Implementation Spec
- **Architecture**:
    - Convert strict JavaScript/JSX to TypeScript.
    - Use `file:../../packages/core` for `@helios-project/core` dependency to ensure local development works.
    - Configure Vite to resolve `@helios-project/core` to source for hot reloading.
- **Pseudo-Code / Refactoring**:
    - **package.json**:
        - Dependencies: `react`, `react-dom`, `@helios-project/core` (file protocol).
        - DevDependencies: `typescript`, `vite`, `@vitejs/plugin-react`, `@types/react`, `@types/react-dom`.
    - **tsconfig.json**:
        - `paths`: Map `@helios-project/core` to `../../packages/core/src/index.ts`.
    - **App.tsx**:
        - Replace `import ... from '../../../packages/core/src/index.ts'` with `import ... from '@helios-project/core'`.
        - Add types for components (e.g. `FeatureItemProps`).
    - **StorySequence.tsx**:
        - Define props interface: `{ from: number; durationInFrames: number; children: React.ReactNode }`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
    1.  `npm install` (in root, to link workspace).
    2.  `cd examples/social-media-story`
    3.  `npm install` (to install local example deps).
    4.  `npm run build`
- **Success Criteria**:
    - Build completes without errors.
    - `dist/` directory is created.
    - `dist/index.html` exists.
- **Edge Cases**:
    - Verify `autoSyncAnimations` is still preserved in `App.tsx`.
