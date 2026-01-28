# DEMO: Variable Font Animation

#### 1. Context & Goal
- **Objective**: Create a new example `examples/variable-font-animation` demonstrating how to animate Variable Fonts (weight, width, slant) using standard CSS Keyframes and Helios's `autoSyncAnimations`.
- **Trigger**: Vision gap—README promotes "Use What You Know" and native web capabilities; Variable Fonts are a powerful native feature currently missing from examples.
- **Impact**: Showcases Helios's ability to drive complex typography animations without JavaScript libraries, reinforcing the "Native Always Wins" thesis.

#### 2. File Inventory
- **Create**:
  - `examples/variable-font-animation/composition.html`: Entry point for the example.
  - `examples/variable-font-animation/src/main.ts`: Helios initialization script.
  - `examples/variable-font-animation/src/style.css`: CSS file containing Variable Font `@keyframes`.
  - `examples/variable-font-animation/vite.config.js`: Vite configuration for the example.
  - `examples/variable-font-animation/package.json`: Package configuration.
- **Modify**:
  - `vite.build-example.config.js`: Add the new example to the build configuration.
- **Read-Only**:
  - `packages/core/src/index.ts`: For import reference.

#### 3. Implementation Spec
- **Architecture**:
  - **Framework**: Vanilla JS (no framework dependencies).
  - **Font Source**: Use Google Fonts API to load a variable font (e.g., `Recursive`) that supports `monk` (Monospace), `casl` (Casual), `wght` (Weight), `slnt` (Slant), and `crsv` (Cursive) axes for maximum visual impact.
  - **Animation**: define CSS `@keyframes` that modify the `font-variation-settings` property.
  - **Helios**: Initialize `new Helios({ autoSyncAnimations: true })` to drive the CSS animations.
- **Pseudo-Code**:
  - `composition.html`:
    - Link to Google Fonts (Recursive).
    - Container div with text.
    - Script src to `./src/main.ts`.
  - `src/main.ts`:
    - Import `Helios` from `@helios-project/core` (using relative path `../../../packages/core/src/index.ts` for internal dev).
    - Instantiate `helios` with duration ~5s, fps 30, `autoSyncAnimations: true`.
  - `src/style.css`:
    - `@keyframes morph { 0% { font-variation-settings: 'MONK' 0, 'CASL' 0, 'wght' 300; } 50% { font-variation-settings: 'MONK' 1, 'CASL' 1, 'wght' 900; } ... }`
    - Apply animation to text element.
  - `vite.build-example.config.js`:
    - Add `variable_font: resolve(__dirname, "examples/variable-font-animation/composition.html")` to `rollupOptions.input`.
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run build:examples`
- **Success Criteria**:
  - The build command completes without error.
  - `output/example-build/assets/` contains the compiled JS/CSS for the new example.
- **Edge Cases**:
  - Font loading: Ensure the font is loaded. (Note: In a real production render, we might need a `document.fonts.ready` waiter, but for this demo, `autoSyncAnimations` is the focus).
