# Plan: Create Dynamic Props Animation Example

#### 1. Context & Goal
- **Objective**: Create a new example `examples/dynamic-props-animation` that demonstrates how to use `inputProps` and `schema` validation in Helios.
- **Trigger**: The `README.md` highlights `inputProps` and "Props editor with schema validation" as key features (Vision), but no existing example demonstrates how to define a schema or use dynamic props (Reality).
- **Impact**: Enables users (and future Studio agents) to understand how to build parametrized compositions that can be controlled via UI or API.

#### 2. File Inventory
- **Create**:
  - `examples/dynamic-props-animation/composition.html`: The logic/animation file.
  - `examples/dynamic-props-animation/index.html`: The preview/player file.
  - `examples/dynamic-props-animation/README.md`: Documentation.
- **Modify**:
  - `vite.build-example.config.js`: Add the new example to the build input.
  - `tests/e2e/verify-render.ts`: Add a test case for the new example.
- **Read-Only**:
  - `packages/core/dist/index.js`

#### 3. Implementation Spec
- **Architecture**: Vanilla JS using `import { Helios } from '../../packages/core/dist/index.js'`.
- **Composition Logic (`composition.html`)**:
  - Define a schema:
    ```typescript
    schema: {
      title: { type: 'string', default: 'Dynamic Title' },
      color: { type: 'color', default: '#ff0055' },
      scale: { type: 'number', minimum: 0.1, maximum: 3.0, default: 1.0 },
      showBackground: { type: 'boolean', default: true }
    }
    ```
  - Instantiate `Helios` with `inputProps` (can be empty, allowing defaults to take over).
  - Subscribe to `helios.subscribe(({ inputProps }) => { ... })`.
  - Update DOM elements based on props.
- **Preview Logic (`index.html`)**:
  - Use `<helios-player>` to load `composition.html`.
  - Add a simple UI (outside the player) to demonstrate changing props via `helios-player` instance (optional, but good for demo). *Self-correction: Keep it simple first, just the player.*
- **Build Config (`vite.build-example.config.js`)**:
  - Add `dynamic_props: resolve(__dirname, "examples/dynamic-props-animation/composition.html")` to the `input` object.
- **Test Config (`tests/e2e/verify-render.ts`)**:
  - Add `{ name: 'Dynamic Props', relativePath: 'examples/dynamic-props-animation/composition.html', mode: 'dom' }` to the `CASES` array.

#### 4. Test Plan
- **Verification**:
  - Run `npm run build:examples`.
  - Run `npx ts-node tests/e2e/verify-render.ts`.
- **Success Criteria**:
  - Build completes successfully.
  - `verify-render.ts` output includes "✅ Dynamic Props Passed!".
- **Edge Cases**:
  - Validate that default values are applied correctly when no props are passed.
