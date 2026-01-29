# 📋 Plan: Verify Solid DOM Example

## 1. Context & Goal
- **Objective**: Add the existing `examples/solid-dom-animation` to the E2E verification registry (`tests/e2e/verify-render.ts`) to ensure it is covered by CI/tests.
- **Trigger**: The example exists and is claimed to work in status logs, but is missing from the verification script, leaving a coverage gap.
- **Impact**: Ensures reliability of SolidJS DOM integration and fulfills the architectural requirement that all examples are verified.

## 2. File Inventory
- **Modify**: `tests/e2e/verify-render.ts` (Add case to `CASES` array)
- **Read-Only**: `examples/solid-dom-animation/composition.html` (Reference)

## 3. Implementation Spec
- **Architecture**: The `verify-render.ts` script uses a `CASES` constant to define which examples to render and verify. We need to inject the Solid DOM configuration into this array.
- **Modifications**:
  - In `tests/e2e/verify-render.ts`, add the following object to the `CASES` array (preferably near other Solid examples or at the end):
    ```typescript
    { name: 'Solid DOM', relativePath: 'examples/solid-dom-animation/composition.html', mode: 'dom' as const },
    ```
- **Dependencies**: The example implementation (`examples/solid-dom-animation`) and build config (`vite.build-example.config.js`) are already present and correct.

## 4. Test Plan
- **Verification**:
  1. Build the examples:
     ```bash
     npm run build:examples
     ```
  2. Run the verification script:
     ```bash
     npx ts-node tests/e2e/verify-render.ts
     ```
- **Success Criteria**:
  - The console output must contain: `✅ Solid DOM Passed!`
  - The script must exit with code 0.
- **Edge Cases**:
  - If the test fails, it indicates the Solid DOM example itself is broken (e.g., signals not syncing), which is a valuable finding.
