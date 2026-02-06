# 1. Context & Goal
- **Objective**: Standardize `examples/motion-one-animation` to match the project's "Professional" example structure.
- **Trigger**: Found legacy example without `package.json` or build config during discovery.
- **Impact**: Ensures the example is self-contained, buildable via Vite, and consistent with recent standardization efforts (Vision Parity).

# 2. File Inventory
- **Create**:
    - `examples/motion-one-animation/package.json`: Define dependencies (`motion`, `@helios-project/core`).
    - `examples/motion-one-animation/tsconfig.json`: Standard TypeScript config.
    - `examples/motion-one-animation/vite.config.ts`: Vite config with aliases.
    - `examples/motion-one-animation/postcss.config.cjs`: Standard empty config.
    - `examples/motion-one-animation/src/main.ts`: Logic extracted from `composition.html`.
- **Modify**:
    - `examples/motion-one-animation/composition.html`: Remove inline script, import `src/main.ts`.
- **Read-Only**:
    - `examples/simple-animation/vite.config.ts` (Reference)

# 3. Implementation Spec
- **Architecture**:
    - Convert inline module script to a standalone `src/main.ts` entry point.
    - Use Vite to bundle the example.
    - Configure `@helios-project/core` alias to point to the local workspace package.
- **Pseudo-Code**:
    - `src/main.ts`:
        - Import `Helios` from `@helios-project/core`.
        - Import `animate` from `motion`.
        - Initialize Helios with `autoSyncAnimations: true`.
        - Define animation using `animate()`.
        - Call `helios.bindToDocumentTimeline()`.
- **Public API Changes**: None.
- **Dependencies**: None.

# 4. Test Plan
- **Verification**:
    - `cd examples/motion-one-animation && npm install && npm run build`
- **Success Criteria**:
    - Build completes without error.
    - `dist/` directory is created.
- **Edge Cases**:
    - Ensure `motion` dependency resolves correctly.
