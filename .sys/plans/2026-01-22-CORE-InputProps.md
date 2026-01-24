#### 1. Context & Goal
- **Objective**: Implement `inputProps` state management in the `Helios` core class to support parametric videos.
- **Trigger**: Vision Gap - The README states the engine manages `inputProps`, but the property is missing from `HeliosState`.
- **Impact**: Unlocks the ability for users to pass dynamic data (text, config, variables) to their compositions, a critical feature for programmatic video generation.

#### 2. File Inventory
- **Create**: (None)
- **Modify**:
  - `packages/core/src/index.ts`: Add `inputProps` to state interfaces and class implementation.
  - `packages/core/src/index.test.ts`: Add unit tests for property initialization and updates.
- **Read-Only**:
  - `README.md`: Reference for vision alignment.

#### 3. Implementation Spec
- **Architecture**: Extend the existing React-like state store pattern. `inputProps` will be stored in `HeliosState` and can be updated via a new `setInputProps` method, triggering subscriber notifications.
- **Pseudo-Code**:
  ```typescript
  // packages/core/src/index.ts

  // 1. Update Types
  export type HeliosState = {
    // ... existing fields
    inputProps: Record<string, any>; // New field
  };

  export interface HeliosOptions {
    // ... existing fields
    inputProps?: Record<string, any>; // New optional field
  }

  // 2. Update Class
  export class Helios {
    constructor(options: HeliosOptions) {
      // ... existing validation
      this.state = {
        // ... existing initialization
        inputProps: options.inputProps || {}, // Initialize with default or provided props
      };
    }

    // 3. New Method
    public setInputProps(props: Record<string, any>) {
      // Update state and notify subscribers
      this.setState({ inputProps: props });
    }
  }
  ```
- **Public API Changes**:
  - `HeliosState`: Added `inputProps: Record<string, any>`.
  - `HeliosOptions`: Added optional `inputProps?: Record<string, any>`.
  - `Helios`: Added `setInputProps(props: Record<string, any>): void`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm test -w packages/core`
- **Success Criteria**:
  - New tests in `index.test.ts` pass:
    - `should initialize with inputProps`: Verify constructor sets state correctly.
    - `should update inputProps`: Verify `setInputProps` updates state and notifies subscribers.
    - `should default inputProps to empty object`: Verify fallback when not provided.
  - All existing tests pass (no regressions).
- **Edge Cases**:
  - Setting `inputProps` to `null` or `undefined` (TypeScript should prevent this, but runtime check might be needed or just rely on TS).
  - Passing deeply nested objects (reference equality vs deep clone - `setState` is shallow merge of top level keys, but `inputProps` itself is a reference. Standard React pattern is to replace the object).
