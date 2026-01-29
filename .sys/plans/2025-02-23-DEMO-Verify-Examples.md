#### 1. Context & Goal
- **Objective**: Update the E2E verification script to include missing examples (`Promo Video` and `Solid Animation Helpers`).
- **Trigger**: Audit of `examples/` directory revealed these valid examples were excluded from `tests/e2e/verify-render.ts`.
- **Impact**: Increases test coverage to 100% of examples, preventing regressions in these specific compositions.

#### 2. File Inventory
- **Modify**: `tests/e2e/verify-render.ts` (Update `CASES` array)
- **Read-Only**: `examples/promo-video/composition.html`, `examples/solid-animation-helpers/composition.html`

#### 3. Implementation Spec
- **Architecture**: The `verify-render.ts` script iterates over a registry of test cases. We will append the missing cases to this registry.
- **Pseudo-Code**:
  ```typescript
  const CASES = [
    // ... maintain existing order
    {
      name: 'Solid Helpers',
      relativePath: 'examples/solid-animation-helpers/composition.html',
      mode: 'dom'
    },
    {
      name: 'Promo Video',
      relativePath: 'examples/promo-video/composition.html',
      mode: 'dom'
    }
  ];
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run the verification script:
  ```bash
  npx tsx tests/e2e/verify-render.ts
  ```
- **Success Criteria**:
  - Output confirms `Verifying Solid Helpers...` -> `✅ Solid Helpers Passed!`
  - Output confirms `Verifying Promo Video...` -> `✅ Promo Video Passed!`
  - Final output: `✅ All 46 examples verified successfully!`
- **Edge Cases**:
  - `Promo Video` relies on GSAP. If the resolution override (600x600) breaks the GSAP layout logic significantly enough to cause a JS error, the test will fail. We assume the DOM mode handles this gracefully.
