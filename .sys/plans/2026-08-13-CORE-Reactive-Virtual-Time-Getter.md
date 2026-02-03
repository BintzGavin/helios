#### 1. Context & Goal
- **Objective**: Expose `isVirtualTimeBound` getter in `Helios` to confirm synchronous virtual time binding and ensure it resets on unbind.
- **Trigger**: The Renderer agent requires verification that the timeline is being driven synchronously via `__HELIOS_VIRTUAL_TIME__` setters, rather than falling back to asynchronous polling, to ensure frame-accurate determinism during high-speed rendering.
- **Impact**: Enables consumers (specifically the Renderer) to detect "Polling Mode" fallbacks and either abort or adjust their synchronization strategy, preventing frame drift in exports.

#### 2. File Inventory
- **Modify**: `packages/core/src/Helios.ts` (Add public getter for private state; reset state on unbind)
- **Create**: `packages/core/src/virtual-time.test.ts` (New test suite for binding verification)
- **Read-Only**: `packages/core/src/signals.ts` (Reference for signal implementation if needed)

#### 3. Implementation Spec
- **Architecture**: Expose existing private `_reactiveVirtualTimeBound` state via a public read-only getter. Ensure state consistency by explicitly resetting the flag in `unbindFromDocumentTimeline`.
- **Pseudo-Code**:
  ```typescript
  class Helios {
    // ... existing code ...
    /**
     * Returns true if the instance has successfully established a reactive, synchronous binding
     * to the environment's virtual time source. Returns false if falling back to polling
     * or if not bound to document timeline.
     */
    public get isVirtualTimeBound(): boolean {
      return this._reactiveVirtualTimeBound;
    }

    public unbindFromDocumentTimeline() {
       // ... existing cleanup logic ...
       this._reactiveVirtualTimeBound = false; // Reset state
    }
  }
  ```
- **Public API Changes**:
  - `Helios.isVirtualTimeBound`: boolean (Read-only property)
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npx vitest run packages/core/src/virtual-time.test.ts`
- **Success Criteria**:
  1.  Test confirms `isVirtualTimeBound` returns `false` by default.
  2.  Test confirms `isVirtualTimeBound` returns `true` after `bindToDocumentTimeline()` when `window.__HELIOS_VIRTUAL_TIME__` is successfully defined.
  3.  Test confirms `isVirtualTimeBound` returns `false` after `unbindFromDocumentTimeline()`.
  4.  Test confirms `isVirtualTimeBound` returns `false` if `Object.defineProperty` fails (simulated error), ensuring fallback state is correctly reported.
- **Edge Cases**:
  - Environment without `window` (Node.js) should return `false`.
