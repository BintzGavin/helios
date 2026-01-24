# 2025-02-18-DEMO-Expand-E2E-Tests

## 1. Context & Goal
- **Objective**: Update `tests/e2e/verify-render.ts` to verify `react-canvas-animation` and `simple-canvas-animation` in addition to Vue.
- **Trigger**: The current E2E test only verifies the Vue example (`docs/status/DEMO.md` lists "Verify E2E tests" as a backlog item).
- **Impact**: Ensures that the rendering pipeline works correctly for all supported framework examples and prevents regressions.

## 2. File Inventory
- **Modify**:
  - `tests/e2e/verify-render.ts`: Refactor to loop through multiple example compositions.
- **Read-Only**:
  - `examples/vue-canvas-animation/composition.html`
  - `examples/react-canvas-animation/composition.html`
  - `examples/simple-canvas-animation/composition.html`

## 3. Implementation Spec
- **Architecture**:
  - The script will define an array of test cases, each containing a `name` and a `relativePath` to the built composition file.
  - It will iterate through these cases, constructing the full path to the `output/example-build` directory (where `npm run build:examples` places artifacts).
  - For each case, it will instantiate a `Renderer`, call `render()`, and output a video file to `output/`.
  - It will capture errors and ensure the process exits with a non-zero code if any render fails.
- **Pseudo-Code**:
  - `import { Renderer } ...`
  - `const CASES = [`
    - `{ name: 'Vue', file: 'examples/vue-canvas-animation/composition.html' },`
    - `{ name: 'React', file: 'examples/react-canvas-animation/composition.html' },`
    - `{ name: 'Canvas', file: 'examples/simple-canvas-animation/composition.html' }`
  - `];`
  - `async function main() {`
    - `for (const testCase of CASES) {`
      - `console.log('Verifying ' + testCase.name);`
      - `const compositionUrl = file://... resolve(testCase.file) ...`
      - `const outputPath = ... output/${testCase.name}-verified.mp4 ...`
      - `const renderer = new Renderer(...)`
      - `await renderer.render(compositionUrl, outputPath);`
      - `// Verify file exists`
    - `}`
  - `}`
- **Dependencies**:
  - Requires `npm run build:examples` to have been run previously (or the script could check/warn).

## 4. Test Plan
- **Verification**:
  - Run `npm run build:examples` (to ensure artifacts exist).
  - Run `npx ts-node tests/e2e/verify-render.ts`.
- **Success Criteria**:
  - Script logs "Verifying Vue...", "Verifying React...", "Verifying Canvas...".
  - Script completes without error.
  - `output/` directory contains:
    - `vue-render-verified.mp4`
    - `react-render-verified.mp4`
    - `canvas-render-verified.mp4`
- **Edge Cases**:
  - Missing build artifacts should fail gracefully (or throw clear error).
