# 2025-02-18-PLAYER-Deep-API-Parity.md

#### 1. Context & Goal
- **Objective**: Implement missing properties of the `HTMLMediaElement` interface (`seeking`, `buffered`, `seekable`, `videoWidth`, `videoHeight`) in `<helios-player>`.
- **Trigger**: Vision gap identified in `docs/status/PLAYER.md` and journal; external video libraries and wrappers require these properties to function correctly.
- **Impact**: Enables `<helios-player>` to be used as a drop-in replacement for `<video>` elements in third-party wrappers (e.g., React video players) and analytics tools, improving compatibility and adoption.

#### 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Add `StaticTimeRange` class and implement new getters).
- **Modify**: `packages/player/src/api_parity.test.ts` (Add unit tests for the new properties).
- **Read-Only**: `packages/core/src/index.ts` (Reference for `HeliosState` interface).

#### 3. Implementation Spec
- **Architecture**:
  - Extend `HeliosPlayer` class to include getters for `HTMLVideoElement` compatibility.
  - Implement a private/internal `StaticTimeRange` class that adheres to the `TimeRanges` interface (length, start, end) to support `buffered` and `seekable`.
  - Use `HeliosController` state as the source of truth for `videoWidth` and `videoHeight`, falling back to HTML attributes or 0.
  - Map `seeking` to the internal `isScrubbing` state (transient seeking is instantaneous in Helios, so primarily UI interaction drives this).

- **Pseudo-Code**:
  ```typescript
  // In packages/player/src/index.ts

  // Helper Class (Internal)
  class StaticTimeRange implements TimeRanges {
      constructor(private startVal: number, private endVal: number) {}
      get length() { return 1; }
      start(index: number) {
          if (index !== 0) throw new Error("IndexSizeError");
          return this.startVal;
      }
      end(index: number) {
          if (index !== 0) throw new Error("IndexSizeError");
          return this.endVal;
      }
  }

  export class HeliosPlayer extends HTMLElement {
      // ... existing code ...

      // Standard Media API Additions
      public get seeking(): boolean {
          return this.isScrubbing;
      }

      public get buffered(): TimeRanges {
          return new StaticTimeRange(0, this.duration);
      }

      public get seekable(): TimeRanges {
          return new StaticTimeRange(0, this.duration);
      }

      public get videoWidth(): number {
          if (this.controller) {
              const state = this.controller.getState();
              // Check if state has width (it should based on core spec)
              if (state.width) return state.width;
          }
          return parseFloat(this.getAttribute("width") || "0");
      }

      public get videoHeight(): number {
          if (this.controller) {
              const state = this.controller.getState();
              if (state.height) return state.height;
          }
          return parseFloat(this.getAttribute("height") || "0");
      }
  }
  ```

- **Public API Changes**:
  - New Read-Only Properties on `<helios-player>` DOM Interface:
    - `seeking`: boolean
    - `buffered`: TimeRanges
    - `seekable`: TimeRanges
    - `videoWidth`: number
    - `videoHeight`: number

- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run the player workspace tests using Vitest.
  - Command: `npm test -w packages/player`
- **Success Criteria**:
  - `packages/player/src/api_parity.test.ts` must compile and pass.
  - New tests must confirm `videoWidth` reflects controller state (priority) and attributes (fallback).
  - New tests must confirm `buffered` and `seekable` return valid `TimeRanges` objects covering the full duration.
- **Edge Cases**:
  - `videoWidth` called before controller connection (fallback to attribute).
  - `videoWidth` called with no attribute and no controller (return 0).
  - `buffered` called when duration is 0.
