# Context & Goal
- **Objective**: Consolidate duplicated DOM traversal logic from `DomStrategy` and `SeekTimeDriver` into `dom-scripts.ts` to improve maintainability and ensure consistent Shadow DOM handling.
- **Trigger**: Maintenance gap - `DomStrategy` and `SeekTimeDriver` duplicate recursive `TreeWalker` logic for traversing Shadow DOMs.
- **Impact**: Reduces code duplication and potential for divergence. Aligns with the previous effort to refactor media discovery.

# File Inventory
- **Modify**: `packages/renderer/src/utils/dom-scripts.ts` (Add extracted constants)
- **Modify**: `packages/renderer/src/strategies/DomStrategy.ts` (Use imports)
- **Modify**: `packages/renderer/src/drivers/SeekTimeDriver.ts` (Use imports)
- **Read-Only**: `packages/renderer/tests/verify-enhanced-dom-preload.ts`
- **Read-Only**: `packages/renderer/tests/verify-waapi-sync.ts`

# Implementation Spec
- **Architecture**: Move inline logic to exported string constants in `dom-scripts.ts` for injection via `page.evaluate()`.
- **Logic**:
  - In `packages/renderer/src/utils/dom-scripts.ts`:
    - Add `FIND_ALL_IMAGES_FUNCTION`: Extracts the logic for finding `IMG`, `VIDEO` posters, and `SVG IMAGE` elements.
    - Add `FIND_ALL_ELEMENTS_WITH_PSEUDO_FUNCTION`: Extracts the logic for finding all elements to check for CSS backgrounds/masks.
    - Add `FIND_ALL_SCOPES_FUNCTION`: Extracts the logic for finding all Shadow Roots/Scopes.
  - In `packages/renderer/src/strategies/DomStrategy.ts`:
    - Remove inline functions `findAllImages` and `findAllElements`.
    - Import and use `FIND_ALL_IMAGES_FUNCTION` and `FIND_ALL_ELEMENTS_WITH_PSEUDO_FUNCTION` inside the `prepare()` script string.
  - In `packages/renderer/src/drivers/SeekTimeDriver.ts`:
    - Remove inline function `findAllScopes`.
    - Import and use `FIND_ALL_SCOPES_FUNCTION` inside the `setTime()` script string.
- **Dependencies**: None.

# Test Plan
- **Verification**: Run `npm test` in `packages/renderer` which executes `run-all.ts`.
- **Success Criteria**: All tests pass. Specifically:
  - `tests/verify-enhanced-dom-preload.ts` (Verifies image discovery)
  - `tests/verify-waapi-sync.ts` (Verifies basic animation sync)
- **Edge Cases**: Nested Shadow DOMs (covered by existing tests).
