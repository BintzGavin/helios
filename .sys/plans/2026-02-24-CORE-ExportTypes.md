# 2026-02-24-CORE-ExportTypes.md

## 1. Context & Goal
- **Objective**: Export internal `HeliosState` and `Subscriber` types from the main entry point.
- **Trigger**: Developer Experience (DX) gap identified where consumers cannot strictly type their state objects or subscription callbacks.
- **Impact**: Enables better Type Safety for consumers and aligns with the "Pure TypeScript" vision.

## 2. File Inventory
- **Modify**: `packages/core/src/index.ts` (Export types, rename `Subscriber` to `HeliosSubscriber`)
- **Modify**: `packages/core/src/index.test.ts` (Verify types are exported and usable)

## 3. Implementation Spec
- **Architecture**: No structural change, just visibility updates.
- **Pseudo-Code**:
  ```typescript
  // packages/core/src/index.ts

  // Add export keyword
  export type HeliosState = { ... };

  // Rename to HeliosSubscriber and export
  export type HeliosSubscriber = (state: HeliosState) => void;

  // Update Helios class references
  export class Helios {
      // Use HeliosSubscriber instead of private Subscriber
      private subscriberMap = new Map<HeliosSubscriber, () => void>();

      subscribe(callback: HeliosSubscriber): () => void { ... }
      unsubscribe(callback: HeliosSubscriber) { ... }
  }
  ```

  ```typescript
  // packages/core/src/index.test.ts

  // Update import to include new types
  import { Helios, HeliosState, HeliosSubscriber } from './index';

  // Add a test case to verify types are usable
  describe('Type Exports', () => {
    it('should allow usage of exported types', () => {
      const state: HeliosState = {
        duration: 10,
        fps: 30,
        currentFrame: 0,
        isPlaying: false,
        inputProps: {},
        playbackRate: 1
      };

      const subscriber: HeliosSubscriber = (s: HeliosState) => {
        // no-op
      };

      expect(state.duration).toBe(10);
      expect(subscriber).toBeDefined();
    });
  });
  ```

- **Public API Changes**:
  - `HeliosState` is now exported.
  - `HeliosSubscriber` is exported (was private `Subscriber`).
  - `Helios.subscribe` and `Helios.unsubscribe` signatures updated to use `HeliosSubscriber`.

## 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
  - Tests pass (proving types are resolved and imports work).
  - `index.test.ts` successfully imports `HeliosState` and `HeliosSubscriber`.
- **Edge Cases**: N/A (Type-only change).

## 5. Pre-commit Steps
- Ensure proper testing, verification, review, and reflection are done.
