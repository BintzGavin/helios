# 1. Context & Goal
- **Objective**: Implement a lightweight, zero-dependency Signal library in `packages/core` to support fine-grained reactivity.
- **Trigger**: The `README.md` explicitly calls for "Architecture Hardening: Signal-Based State" to resolve performance bottlenecks inherent in React state propagation.
- **Impact**: This provides the foundational primitives (`signal`, `computed`, `effect`) needed to refactor the `Helios` engine loop, enabling high-performance updates that bypass full component tree re-renders.

# 2. File Inventory
- **Create**:
  - `packages/core/src/signals.ts`: Implementation of the signal primitives.
  - `packages/core/src/signals.test.ts`: Unit tests for the signals.
- **Modify**:
  - `packages/core/src/index.ts`: Export the new signal primitives.
- **Read-Only**:
  - `packages/core/src/index.ts`: (Reference for existing patterns)

# 3. Implementation Spec
- **Architecture**: Implement a "Push-Pull" or standard "Push" reactivity model with automatic dependency tracking via a global context stack.
- **Key Requirement**: The implementation must be memory-safe.
  - **Memory Leak Prevention**: Computed signals must not permanently subscribe to their dependencies if they are no longer being used. Consider using explicit disposal mechanisms or smart subscription management.
  - **Glitch Freedom**: Updates should ideally be glitch-free (avoid inconsistent intermediate states).

- **Pseudo-Code (Conceptual)**:
  ```typescript
  // signals.ts

  export interface Signal<T> {
    value: T;
    peek(): T;
    subscribe(fn: (value: T) => void): () => void;
  }

  export function signal<T>(initialValue: T): Signal<T> {
     // Implementation with subscriber tracking
  }

  export function computed<T>(fn: () => T): ReadonlySignal<T> {
     // Implementation must handle cleanup of dependencies when computed is disposed or no longer observed.
  }

  export function effect(fn: () => void): Unsubscribe {
     // Implementation must handle automatic dependency tracking and cleanup
  }
  ```

- **Public API Changes**:
  - New exports: `signal`, `computed`, `effect`, types `Signal`, `ReadonlySignal`.

- **Dependencies**: None. Pure TypeScript implementation.

# 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
  - `signal` updates propagate to `computed` values.
  - `effect` runs when dependencies change.
  - **Memory Leak Test**: Verify that removing an effect allows garbage collection of the computed signal and its dependencies (or at least removes the subscription from the dependency).
  - Clean up (unsubscribe) works correctly.
- **Edge Cases**:
  - Nested effects.
  - Multiple dependencies.
  - Updating a signal inside a computed (should be avoided or handled).
