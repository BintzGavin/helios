# 2026-04-01-CORE-Maintenance-And-Robustness.md

## 1. Context & Goal
- **Objective**: Fix a memory leak in the `Helios` class, enhance schema validation for `color` types, and synchronize the package version.
- **Trigger**:
    - Discovery of ignored `effect()` disposal in `Helios` constructor (Memory Leak).
    - `validateProps` treats `color` as generic string, missing format validation (Robustness Gap).
    - `package.json` version (0.0.1) mismatch with Status (2.4.0) (Housekeeping).
- **Impact**: Prevents memory leaks in long-running sessions (e.g., Studio), improves error reporting for invalid props, and restores versioning integrity.

## 2. File Inventory
- **Modify**:
    - `packages/core/src/index.ts`: Capture and dispose `activeCaptions` effect.
    - `packages/core/src/schema.ts`: Integrate `parseColor` into `validateProps`.
    - `packages/core/src/index.test.ts`: Add test cases for invalid color props.
    - `packages/core/package.json`: Update version to `2.5.0`.
- **Read-Only**:
    - `packages/core/src/color.ts`: Use `parseColor` implementation.

## 3. Implementation Spec
- **Helios Class (Memory Leak Fix)**:
    - Add `private _disposeActiveCaptionsEffect: () => void;` to `Helios` class.
    - In constructor, assign the result of `effect(...)` (for `_activeCaptions`) to this property.
    - In `dispose()`, call `this._disposeActiveCaptionsEffect()`.
- **Schema Validation**:
    - Import `parseColor` from `./color.js` in `packages/core/src/schema.ts`.
    - In `validateProps`, inside the loop checking property types:
        - If `def.type === 'color'`, call `parseColor(val)`.
        - This will throw `HeliosError(INVALID_COLOR_FORMAT)` if invalid.
- **Versioning**:
    - Set `version` to `2.5.0` in `packages/core/package.json`.

## 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
    - All existing tests pass.
    - New test cases in `index.test.ts` (or `schema.test.ts` if appropriate, but `index.test.ts` tests `Helios` integration) pass:
        - `should throw for invalid color prop`
        - `should accept valid color prop`
    - `Helios.dispose()` runs without error (regression test).
- **Edge Cases**:
    - Valid color formats (Hex, RGB, HSL) should pass validation.
    - `undefined` optional color props should pass (handled by existing logic before type check).
