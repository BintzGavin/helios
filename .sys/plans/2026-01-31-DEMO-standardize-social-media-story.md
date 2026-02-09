# 📋 Plan: Standardize Social Media Story Example

## 1. Context & Goal
- **Objective**: Standardize the legacy `examples/social-media-story` example by converting it to TypeScript, adding a `package.json` workspace configuration, and ensuring it can be built independently.
- **Trigger**: Vision gap identified in `examples/` - this example lacks `package.json` and uses legacy `.jsx` files, violating the "Professional Examples" requirement.
- **Impact**: Enables independent development of this example, ensures type safety, and aligns it with the rest of the standardized examples.

## 2. File Inventory
- **Create**:
  - `examples/social-media-story/package.json`: Workspace configuration.
  - `examples/social-media-story/tsconfig.json`: TypeScript configuration.
  - `examples/social-media-story/vite.config.ts`: Modern Vite config.
- **Delete**:
  - `examples/social-media-story/vite.config.js`: Replaced by TS version.
- **Rename & Modify**:
  - `examples/social-media-story/src/main.jsx` -> `examples/social-media-story/src/main.tsx`: Add types and update imports.
  - `examples/social-media-story/src/App.jsx` -> `examples/social-media-story/src/App.tsx`: Add types and update imports.
  - `examples/social-media-story/src/components/StorySequence.jsx` -> `examples/social-media-story/src/components/StorySequence.tsx`: Add types and update imports.
  - `examples/social-media-story/src/context/FrameContext.js` -> `examples/social-media-story/src/context/FrameContext.ts`: Add types.
  - `examples/social-media-story/src/hooks/useVideoFrame.js` -> `examples/social-media-story/src/hooks/useVideoFrame.ts`: Add return type.
- **Modify**:
  - `examples/social-media-story/composition.html`: Update script entry point to `./src/main.tsx`.

## 3. Implementation Spec
- **Architecture**:
  - **Stack**: React + TypeScript + Vite.
  - **Dependency**: Reference `@helios-project/core` via `file:../../packages/core` protocol.
  - **Build**: Use `vite build` with `tsc` for type checking.
- **Pseudo-Code / Steps**:
  1.  **Scaffold**: Create `package.json` (name: `social-media-story`) and `tsconfig.json` (extending strict base, target ES2020).
  2.  **Config**: Create `vite.config.ts` resolving `@helios-project/core` alias and setting input to `composition.html`.
  3.  **Conversion**:
      -   `FrameContext.ts`: Define `FrameContextType` (number).
      -   `StorySequence.tsx`: Define props interface (`from`, `durationInFrames`, `children`).
      -   `useVideoFrame.ts`: Type return value (number).
      -   `App.tsx` & `main.tsx`: Add React types (`React.FC`, etc.).
  4.  **Integration**: Update `composition.html` to load `./src/main.tsx`.

## 4. Test Plan
- **Verification**:
  1.  `cd examples/social-media-story`
  2.  `npm install` (to install local dependencies)
  3.  `npm run build` (verifies `tsc` passes and Vite builds)
- **Success Criteria**:
  - Build completes with exit code 0.
  - `dist/assets` contains built JS/CSS.
  - No TypeScript errors.
- **Edge Cases**:
  - Verify `npm install` handles the `file:` protocol correctly in the nested directory.
