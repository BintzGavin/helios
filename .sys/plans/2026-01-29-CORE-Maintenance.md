# 2026-01-29-CORE-Maintenance

## 1. Context & Goal
- **Objective**: Fix critical documentation discrepancies (License mismatch) and improve "Headless" quality by silencing `Helios.diagnose()` console output.
- **Trigger**: "Vision vs Reality" check revealed README states MIT License (Reality is ELv2) and `diagnose()` forces console logging.
- **Impact**: Ensures legal clarity for consumers and improves the developer experience (DX) by making the library less "chatty".

## 2. File Inventory
- **Modify**:
    - `packages/core/README.md`: Update License to ELv2 and clarify TimeDriver support.
    - `packages/core/src/index.ts`: Refactor `diagnose()` to remove console logging.
- **Read-Only**:
    - `packages/core/src/drivers/DomDriver.ts`
    - `packages/core/package.json`

## 3. Implementation Spec
- **Documentation**:
    - Change "License: MIT" to "License: Elastic License 2.0 (ELv2)".
    - Update "Time Driver" feature description to emphasize `DomDriver` as the default engine that supports WAAPI.
- **Helios.diagnose()**:
    - Remove `console.group`, `console.log`, `console.warn` calls within the `diagnose` static method.
    - Function should only return the `DiagnosticReport` object.
    - **Public API Changes**: None (return type remains `Promise<DiagnosticReport>`). Logic change only (side-effect removal).

## 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
    - `npm test` passes without error.
    - `Helios.diagnose()` returns correct report object in tests.
    - No console output observed during test execution (related to diagnostics).
    - `README.md` shows "License: Elastic License 2.0 (ELv2)".
