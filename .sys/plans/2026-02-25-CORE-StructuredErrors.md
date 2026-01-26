# Spec: Implement Structured Errors in Core

#### 1. Context & Goal
- **Objective**: Implement a `HeliosError` class and standard error codes to provide machine-parseable, actionable errors in `packages/core`.
- **Trigger**: The `README.md` vision states "All errors are machine-parseable with actionable guidance" to improve Agent Experience (AX). Currently, `packages/core` throws generic `Error` objects which makes automated diagnosis difficult.
- **Impact**: Enables AI agents and tooling to programmatically diagnose and fix configuration issues (e.g., negative duration, invalid interpolation ranges) by catching specific error codes rather than parsing string messages.

#### 2. File Inventory
- **Create**:
  - `packages/core/src/errors.ts`: Defines `HeliosError` class and `HeliosErrorCode` enum.
- **Modify**:
  - `packages/core/src/index.ts`: Export errors, use `HeliosError` in constructor validation.
  - `packages/core/src/animation.ts`: Use `HeliosError` in `interpolate` and `spring` validation.
  - `packages/core/src/index.test.ts`: Update tests to verify `HeliosError` is thrown.
  - `packages/core/src/animation.test.ts`: Update tests to verify `HeliosError` is thrown.
- **Read-Only**:
  - `packages/core/package.json`

#### 3. Implementation Spec
- **Architecture**:
  - Introduce a custom error class `HeliosError` extending the native `Error`.
  - Use an enum `HeliosErrorCode` to define stable, machine-readable error identifiers.
  - Include a `suggestion` property in the error to provide actionable fix advice.

- **Pseudo-Code**:
  ```typescript
  // packages/core/src/errors.ts

  export enum HeliosErrorCode {
    INVALID_DURATION = 'INVALID_DURATION',
    INVALID_FPS = 'INVALID_FPS',
    INVALID_INPUT_RANGE = 'INVALID_INPUT_RANGE',
    INVALID_OUTPUT_RANGE = 'INVALID_OUTPUT_RANGE',
    UNSORTED_INPUT_RANGE = 'UNSORTED_INPUT_RANGE',
    INVALID_SPRING_CONFIG = 'INVALID_SPRING_CONFIG'
  }

  export class HeliosError extends Error {
    public readonly code: HeliosErrorCode;
    public readonly suggestion?: string;

    constructor(code: HeliosErrorCode, message: string, suggestion?: string) {
      super(message);
      this.name = 'HeliosError';
      this.code = code;
      this.suggestion = suggestion;

      // Restore prototype chain for instanceof checks (TypeScript issue with built-ins)
      Object.setPrototypeOf(this, HeliosError.prototype);
    }

    static isHeliosError(error: unknown): error is HeliosError {
      return error instanceof HeliosError;
    }
  }
  ```

  ```typescript
  // Example usage in packages/core/src/index.ts

  import { HeliosError, HeliosErrorCode } from './errors';

  // ... inside constructor
  if (options.duration < 0) {
    throw new HeliosError(
      HeliosErrorCode.INVALID_DURATION,
      "Duration must be non-negative",
      "Ensure the 'duration' option passed to the Helios constructor is >= 0."
    );
  }
  ```

- **Public API Changes**:
  - Export `HeliosError` and `HeliosErrorCode` from `@helios-project/core`.
  - Methods that previously threw generic `Error` will now throw `HeliosError`.

- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
  - All existing tests pass (after updates).
  - New tests confirm that thrown errors are instances of `HeliosError`.
  - New tests confirm `error.code` matches the expected `HeliosErrorCode`.
- **Edge Cases**:
  - Verify `instanceof HeliosError` works correctly in the test environment (common pitfall with custom errors).
