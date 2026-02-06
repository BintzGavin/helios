# 2026-01-31-DEMO-standardize-text-effects.md

#### 1. Context & Goal
- **Objective**: Standardize and modernize the `examples/text-effects-animation` example by converting it to TypeScript and adding isolated project configuration.
- **Trigger**: The "Vision Gap" where legacy examples lack `package.json` and TypeScript configuration, making them poor references for users.
- **Impact**: Ensures the example is self-contained, type-safe, and follows the "Professional" standard promised in the vision.

#### 2. File Inventory
- **Create**:
  - `examples/text-effects-animation/package.json`: Dependencies (React, Vite, TS) and scripts.
  - `examples/text-effects-animation/tsconfig.json`: Standalone TypeScript configuration following the pattern in `examples/lottie-animation/tsconfig.json`.
- **Modify**:
  - `examples/text-effects-animation/vite.config.js` -> `examples/text-effects-animation/vite.config.ts`: Convert to TS and update plugins/aliases.
  - `examples/text-effects-animation/composition.html`: Update script source from `.jsx` to `.tsx`.
  - `examples/text-effects-animation/src/main.jsx` -> `examples/text-effects-animation/src/main.tsx`: Add types.
  - `examples/text-effects-animation/src/App.jsx` -> `examples/text-effects-animation/src/App.tsx`: Add types.
  - `examples/text-effects-animation/src/components/Typewriter.jsx` -> `examples/text-effects-animation/src/components/Typewriter.tsx`: Add Prop types.
  - `examples/text-effects-animation/src/components/TextReveal.jsx` -> `examples/text-effects-animation/src/components/TextReveal.tsx`: Add Prop types.
  - `examples/text-effects-animation/src/hooks/useVideoFrame.js` -> `examples/text-effects-animation/src/hooks/useVideoFrame.ts`: Add types.

#### 3. Implementation Spec
- **Architecture**:
  - Use **Vite** for bundling with `@vitejs/plugin-react`.
  - Use **TypeScript** for type safety.
  - Define `@helios-project/core` as a file dependency (local workspace) in `package.json` and alias it in `vite.config.ts`.
- **Pseudo-Code / Changes**:
  - **package.json**:
    - Name: `@helios-examples/text-effects-animation`
    - Dependencies: `react`, `react-dom`, `@helios-project/core`.
    - DevDependencies: `vite`, `@vitejs/plugin-react`, `typescript`, types.
  - **tsconfig.json**:
    - Copy structure from `examples/lottie-animation/tsconfig.json` but add `jsx: "react-jsx"`.
    - Paths alias `@helios-project/core` to `../../packages/core/src/index.ts`.
  - **Component Types**:
    - `TypewriterProps`: `{ text: string, frame: number, start: number, end: number }`
    - `TextRevealProps`: `{ text: string, frame: number, start: number, stagger?: number, duration?: number }`
  - **Hook Types**:
    - `useVideoFrame`: Typed to accept `Helios` instance and return `number` (frame).
  - **Imports**:
    - Replace absolute `/packages/core...` imports with `@helios-project/core` alias.

#### 4. Test Plan
- **Verification**:
  - Navigate to `examples/text-effects-animation`.
  - Run `npm install` (to install local deps).
  - Run `npm run build` (should invoke `tsc && vite build`).
- **Success Criteria**:
  - The build completes without error.
  - `dist/` folder is generated.
  - No type errors reported by `tsc`.
