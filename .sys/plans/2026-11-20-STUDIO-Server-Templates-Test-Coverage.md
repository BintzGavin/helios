#### 1. Context & Goal
- **Objective**: Add unit tests for all composition templates in the Studio server to achieve 100% test coverage.
- **Trigger**: Vitest coverage reports indicate that `packages/studio/src/server/templates/` has extremely low coverage (14-25% for most frameworks like React, Vue, Svelte, and ThreeJS).
- **Impact**: High test coverage guarantees that composition scaffolding remains robust and outputs correctly structured code for all supported frameworks.

#### 2. File Inventory
- **Create**:
  - `packages/studio/src/server/templates/index.test.ts`
  - `packages/studio/src/server/templates/react.test.ts`
  - `packages/studio/src/server/templates/vue.test.ts`
  - `packages/studio/src/server/templates/svelte.test.ts`
  - `packages/studio/src/server/templates/threejs.test.ts`
  - `packages/studio/src/server/templates/vanilla.test.ts`
  - `packages/studio/src/server/templates/solid.test.ts`
- **Modify**: None
- **Read-Only**: `packages/studio/src/server/templates/*.ts`

#### 3. Implementation Spec
- **Architecture**: Standard Vitest test suites. For each template generator, verify its `id`, `label`, and the generated file outputs.
- **Pseudo-Code**:
  - Define `CompositionOptions` (e.g. `width: 1920`, `height: 1080`, `fps: 30`, `duration: 10`).
  - Invoke the `generate('MyTestComp', options)` function for each template.
  - Assert that the function returns an array of `TemplateFile` objects.
  - Assert that `composition.html` includes the specified title (`MyTestComp`).
  - Assert that the main entry file (`index.tsx`, `index.ts`, `App.vue`, `App.svelte`, etc.) properly reflects the provided options (FPS, dimensions, duration).
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: Run `cd packages/studio && npx vitest run --coverage src/server/templates/`
- **Success Criteria**: The command runs successfully, all newly added tests pass, and the coverage report for `src/server/templates` reports 100% line/statement coverage.
- **Edge Cases**: Verifying that `defaultProps` are safely ignored or applied if supported by the template structure.
