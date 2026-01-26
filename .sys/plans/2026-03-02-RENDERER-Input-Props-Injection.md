#### 1. Context & Goal
- **Objective**: Enable passing `inputProps` to the `Renderer` so they can be injected into the rendering page.
- **Trigger**: Vision gap - `Helios` supports `inputProps` but `Renderer` lacks a mechanism to supply them for dynamic video generation.
- **Impact**: Unlocks the ability to render parameterized videos (e.g. changing text/colors) via the Renderer API/CLI without code changes.

#### 2. File Inventory
- **Modify**:
  - `packages/renderer/src/types.ts`: Add `inputProps` to `RendererOptions`.
  - `packages/renderer/src/index.ts`: Inject `inputProps` into the page via `window.__HELIOS_PROPS__` before navigation.
- **Read-Only**:
  - `packages/renderer/src/strategies/RenderStrategy.ts`

#### 3. Implementation Spec
- **Architecture**: Use Playwright's `page.addInitScript` to inject a global variable `window.__HELIOS_PROPS__` containing the JSON-serialized props. This ensures props are available before the composition script executes.
- **Pseudo-Code**:
  ```typescript
  // In packages/renderer/src/index.ts, inside render(), around line 77 (before page.goto)

  // IF options.inputProps is defined
    // SET serializedProps = JSON.stringify(options.inputProps)
    // CALL page.addInitScript with "window.__HELIOS_PROPS__ = " + serializedProps
  // END IF

  // CALL page.goto(compositionUrl, { waitUntil: 'networkidle' })
  ```
- **Public API Changes**: `RendererOptions` in `types.ts` will now accept `inputProps?: Record<string, any>`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npx ts-node verify_props_injection.ts`.
  - Create a temporary test script `verify_props_injection.ts` in the root directory that:
  1. Instantiates `Renderer` with `{ inputProps: { text: "Hello World" }, ...otherOptions }`.
  2. Creates a dummy HTML file `temp_composition.html` containing `<script>console.log('PROPS:', JSON.stringify(window.__HELIOS_PROPS__))</script>`.
  3. Runs `renderer.render('file://' + path.resolve('temp_composition.html'), 'output/test.mp4')`.
  4. Verifies that "PROPS: {"text":"Hello World"}" appears in the captured logs.
  5. Cleans up `verify_props_injection.ts`, `temp_composition.html`, and `output/test.mp4`.
- **Success Criteria**: The injected props are correctly logged by the page.
- **Edge Cases**:
  - `inputProps` is undefined (should inject nothing).
  - `inputProps` contains complex JSON.
