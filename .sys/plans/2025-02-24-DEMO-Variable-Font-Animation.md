# 📋 Plan: Scaffold Variable Font Animation Example

## 1. Context & Goal
- **Objective**: Create a new example `examples/variable-font-animation` demonstrating the animation of Variable Font axes (Weight, Slant, Casual) using standard CSS Keyframes and Helios's `autoSyncAnimations`.
- **Trigger**: Vision gap in "Use What You Know". While `react-css-animation` exists, it only demonstrates basic transform/opacity. Variable Fonts represent a powerful "Native Always Wins" capability where the browser's font engine handles complex vector interpolation that is difficult to replicate in simulation-based engines.
- **Impact**: Provides a high-quality "Kinetic Typography" reference for users and proves Helios's ability to drive advanced CSS properties.

## 2. File Inventory
- **Create**:
  - `examples/variable-font-animation/vite.config.js`: Standard Vite config for the example.
  - `examples/variable-font-animation/index.html`: Dev entry point.
  - `examples/variable-font-animation/composition.html`: Build entry point.
  - `examples/variable-font-animation/src/main.jsx`: Application entry, instantiates `Helios`.
  - `examples/variable-font-animation/src/App.jsx`: Main component structure.
  - `examples/variable-font-animation/src/style.css`: CSS containing `@import` for font and `@keyframes` for variation settings.
- **Modify**:
  - `vite.build-example.config.js`: Add `variable_font` entry to `rollupOptions.input`.
  - `tests/e2e/verify-render.ts`: Add `{ name: 'Variable Font', ... }` to `CASES`.
- **Read-Only**:
  - `packages/core/dist/index.js` (Imported by main.jsx)

## 3. Implementation Spec
- **Architecture**:
  - **Framework**: React (for structure).
  - **Styling**: Standard CSS.
  - **Font**: "Recursive" (Google Fonts) loaded via CSS `@import`.
  - **Animation**: CSS `@keyframes` manipulating `font-variation-settings` (e.g. `'wght'`, `'slnt'`, `'CASL'`).
  - **Helios**: `autoSyncAnimations: true` to drive the CSS keyframes.
- **Pseudo-Code**:
  - **App.jsx**:
    - Return a container with `<h1>` text "Variable Fonts".
    - Class `animate-font` triggers the animation.
  - **style.css**:
    - `@import url('https://fonts.googleapis.com/css2?family=Recursive:slnt,wght,CASL,CRSV,MONO@-15..0,300..1000,0..1,0..1,0..1&display=swap');`
    - `body`: font-family 'Recursive'.
    - `@keyframes breathe`:
      - 0%: `font-variation-settings: 'wght' 300, 'slnt' 0, 'CASL' 0; color: #333;`
      - 50%: `font-variation-settings: 'wght' 1000, 'slnt' -15, 'CASL' 1; color: #ff0055;`
      - 100%: `font-variation-settings: 'wght' 300, 'slnt' 0, 'CASL' 0; color: #333;`
    - `.animate-font`: `animation: breathe 4s ease-in-out infinite alternate;`
  - **main.jsx**:
    - `new Helios({ fps: 30, duration: 8, autoSyncAnimations: true })`.
- **Dependencies**:
  - Must ensure `vite.build-example.config.js` uses `resolve` correctly.
  - Must ensure `verify-render.ts` uses the correct output path.

## 4. Test Plan
- **Verification**:
  - Run `npm run build:examples`.
  - Run `npx ts-node tests/e2e/verify-render.ts`.
- **Success Criteria**:
  - Build succeeds.
  - Verification script logs `✅ Variable Font Passed!`.
  - Output video `output/variable-font-render-verified.mp4` shows text morphing weight/slant.
- **Edge Cases**:
  - Offline mode: Font might fall back to system sans-serif (no variation). This is acceptable for a web-based example, but ideally the test runs in an environment with internet.
