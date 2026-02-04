# Plan: DEMO - React Components Demo

## 1. Context & Goal
- **Objective**: Create `examples/react-components-demo` to verify and demonstrate the functionality of CLI Registry components (`Timer`, `ProgressBar`, `Watermark`).
- **Trigger**: The `docs/BACKLOG.md` item "Create examples demonstrating component usage" and the need to verify parity between the registry definitions and actual usage.
- **Impact**: Ensures that `helios add` components actually work when installed into a project, filling a testing gap.

## 2. File Inventory
- **Create**:
    - `examples/react-components-demo/composition.html`: Entry point for Helios.
    - `examples/react-components-demo/src/main.tsx`: React mount point.
    - `examples/react-components-demo/src/App.tsx`: Main composition component composing the registry components.
    - `examples/react-components-demo/src/components/Timer.tsx`: Code copied from `packages/cli/src/registry/manifest.ts`.
    - `examples/react-components-demo/src/components/ProgressBar.tsx`: Code copied from `packages/cli/src/registry/manifest.ts`.
    - `examples/react-components-demo/src/components/Watermark.tsx`: Code copied from `packages/cli/src/registry/manifest.ts`.
    - `examples/react-components-demo/src/components/useVideoFrame.ts`: Code copied from `packages/cli/src/registry/manifest.ts`.
    - `examples/react-components-demo/tsconfig.json`: TypeScript configuration extending root.
- **Read-Only**:
    - `packages/cli/src/registry/manifest.ts`: Source of component code.

## 3. Implementation Spec
- **Architecture**: React + TypeScript + Vite (via root config).
- **Logic**:
    - `composition.html` loads `src/main.tsx`.
    - `main.tsx` renders `App` and exposes `helios` to window.
    - `App.tsx`:
        - Instantiates `Helios`.
        - Binds to document timeline.
        - Renders `<Timer />`, `<ProgressBar />`, and `<Watermark />`.
        - Passes `helios` instance to components (or relies on window global fallback which they support).
- **Component Integrity**:
    - Components must be copied *verbatim* (or as close as possible, only adjusting imports if necessary) from `packages/cli/src/registry/manifest.ts` to simulate a user running `helios add`.
    - Note: The manifest imports `React`, so we must ensure `tsconfig.json` supports this or we modify the import slightly if using `react-jsx`. Preferred: Keep verbatim to validate the exact code stored in registry.

## 4. Test Plan
- **Verification**:
    - Run `npm run build:examples`.
    - Run `npx tsx tests/e2e/verify-client-export.ts --filter react-components-demo`.
- **Success Criteria**:
    - The example builds without errors.
    - The E2E test verifies client-side export works (implying the components rendered without crashing).
- **Edge Cases**:
    - Verify that `useVideoFrame` hook correctly subscribes/unsubscribes.
    - Verify components handle missing `helios` prop gracefully (fallback to window).
