# 2026-01-22-CORE-Enable-Core-Testing-And-Robustness

#### 1. Context & Goal
- **Objective**: Enable standard unit testing for the Core package and harden the `Helios` constructor against invalid inputs.
- **Trigger**: The current `packages/core/package.json` lacks a `test` script, hindering verification. Additionally, the `Helios` class allows initialization with invalid values (e.g., 0 FPS) which can lead to runtime errors.
- **Impact**: Unlocks standard `npm test` workflow for the Core domain and prevents invalid engine states, improving developer experience and reliability.

#### 2. File Inventory
- **Modify**: `packages/core/package.json` (Add `test` script)
- **Modify**: `packages/core/src/index.ts` (Add constructor validation)
- **Modify**: `packages/core/src/index.test.ts` (Add validation test cases)

#### 3. Implementation Spec
- **Architecture**: No architectural changes. Enhancing input validation within the existing `Helios` class.
- **Pseudo-Code**:
  ```typescript
  // packages/core/src/index.ts -> constructor
  constructor(options: HeliosOptions) {
    if (options.duration < 0) {
      throw new Error("Duration must be non-negative");
    }
    if (options.fps <= 0) {
      throw new Error("FPS must be greater than 0");
    }
    // ... continue with existing initialization
  }
  ```
- **Public API Changes**: The `Helios` constructor will now throw an `Error` if `duration` is negative or `fps` is less than or equal to 0.

#### 4. Test Plan
- **Verification**: Run `npm test -w packages/core` from the root directory.
- **Success Criteria**:
  - The test suite runs and passes.
  - New tests confirm that `new Helios({ fps: 0 })` and `new Helios({ duration: -1 })` throw specific errors.
- **Edge Cases**:
  - `fps: 0.1` (should pass)
  - `duration: 0` (should pass)
  - `fps: -10` (should throw)
