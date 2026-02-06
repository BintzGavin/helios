# 2026-09-22-DEMO-Standardize-GSAP-Animation.md

#### 1. Context & Goal
- **Objective**: Modernize the legacy `examples/gsap-animation` by introducing a standard project structure with TypeScript, Vite, and explicit dependencies.
- **Trigger**: The current example relies on fragile relative imports (`../../packages/core`) and lacks a `package.json`, making it difficult for users to copy-paste or eject.
- **Impact**: Ensures the example is portable, self-contained, and follows the "Professional" architecture promised in the vision.

#### 2. File Inventory
- **Create**:
  - `examples/gsap-animation/package.json`: Define dependencies (`gsap`, `@helios-project/core`) and scripts.
  - `examples/gsap-animation/tsconfig.json`: TypeScript configuration.
  - `examples/gsap-animation/vite.config.ts`: Build configuration with path aliases.
  - `examples/gsap-animation/src/main.ts`: Entry point containing the logic refactored from the inline script.
- **Modify**:
  - `examples/gsap-animation/composition.html`: Update to import `src/main.ts` instead of the inline module script.
- **Read-Only**:
  - `examples/gsap-animation/composition.html`: (Will read original content to refactor)

#### 3. Implementation Spec
- **Architecture**: Vanilla TypeScript using Vite for bundling.
- **Pseudo-Code**:
  - **`package.json`**: Add `gsap` as a dependency. Set `"type": "module"`.
  - **`vite.config.ts`**: Configure alias `@helios-project/core` to point to the local workspace package for development.
  - **`src/main.ts`**:
    - Import `Helios` from `@helios-project/core`.
    - Import `gsap` from `gsap`.
    - Initialize `Helios` instance.
    - Create GSAP timeline (paused).
    - Subscribe to Helios updates to drive `timeline.seek(time)`.
    - Bind to document timeline for preview.
  - **`composition.html`**: Replace the `<script>` block with `<script type="module" src="/src/main.ts"></script>`.
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npx vite build -c examples/gsap-animation/vite.config.ts` from the root.
- **Success Criteria**: Build completes successfully without errors, producing assets in `examples/gsap-animation/dist`.
- **Edge Cases**: Verify that `gsap` types are correctly resolved by TypeScript.
