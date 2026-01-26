# Plan: Implement Helios Disposal

## 1. Context & Goal
- **Objective**: Implement a `dispose()` method in the `Helios` class to ensure proper cleanup of resources (tickers, polling loops).
- **Trigger**: Potential memory leaks identified in `bindToDocumentTimeline` polling loop and `RafTicker` if not explicitly stopped/unbound when a `Helios` instance is discarded (common in SPA component lifecycles).
- **Impact**: Enables safe destruction of Helios instances, preventing "zombie" loops and memory leaks in consuming applications (Studio, Player).

## 2. File Inventory
- **Modify**: `packages/core/src/index.ts` (Add `dispose` method)
- **Modify**: `packages/core/src/index.test.ts` (Add verification tests)
- **Read-Only**: `packages/core/src/drivers/RafTicker.ts` (Check stop behavior)

## 3. Implementation Spec
- **Architecture**: Standard Resource Disposal Pattern.
- **Pseudo-Code**:
  ```typescript
  class Helios {
    // ...
    public dispose() {
      // 1. Stop the internal ticker (stops Playback loop)
      this.pause();
      this.ticker.stop(); // Double check to ensure callback reference is cleared

      // 2. Stop external synchronization (stops Document Timeline polling loop)
      this.unbindFromDocumentTimeline();

      // 3. Clear all subscribers to release references
      this.subscriberMap.forEach((dispose) => dispose());
      this.subscriberMap.clear();

      // 4. (Optional) Signal cleanup if needed, but signals usually GC themselves if no subscribers.
    }
  }
  ```
- **Public API Changes**:
  - Add `dispose(): void` to `Helios` class.

## 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
  - Verify `dispose()` stops the `RafTicker` (mocked).
  - Verify `dispose()` stops the `bindToDocumentTimeline` polling loop (mocked).
  - Verify subscribers are released.
- **Edge Cases**: Calling `dispose()` multiple times should be safe (idempotent).
