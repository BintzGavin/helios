# 2025-02-18-PLAYER-Seek-Sync.md

## 1. Context & Goal

- **Objective**: Synchronize `DirectController.seek` with the render cycle by waiting for `requestAnimationFrame` before resolving.
- **Trigger**: `DirectController.seek` currently resolves immediately, while `BridgeController.seek` waits for frame rendering. This inconsistency causes `seeked` events to fire before the frame is painted in Direct/Same-Origin mode.
- **Impact**: Ensures consistent behavior across connection modes (Direct vs Bridge) and guarantees that visual updates are complete when `seek()` resolves, improving reliability for automated testing and user experience.

## 2. File Inventory

- **Modify**: `packages/player/src/controllers.ts` (Update `DirectController.seek` method)
- **Read-Only**: `packages/player/src/bridge.ts` (Reference implementation for `HELIOS_SEEK` handler)

## 3. Implementation Spec

### Architecture
- Update `DirectController.seek` to be an `async` function.
- Implement a double `requestAnimationFrame` wait pattern before resolving the Promise, mirroring the behavior in `BridgeController` (via `connectToParent`).
- Use the iframe's `contentWindow.requestAnimationFrame` if available, falling back to the global `requestAnimationFrame` if the iframe is missing (e.g., in headless contexts).

### Pseudo-Code
```typescript
class DirectController implements HeliosController {
  // ... other methods ...

  async seek(frame: number): Promise<void> {
    // 1. Update internal state synchronously
    this.instance.seek(frame);

    // 2. Wait for 2 RAFs to ensure paint (matching BridgeController behavior)
    // Use iframe's RAF if available, otherwise fallback to global
    return new Promise<void>((resolve) => {
      const raf = (cb: FrameRequestCallback) => {
        if (this.iframe && this.iframe.contentWindow) {
          this.iframe.contentWindow.requestAnimationFrame(cb);
        } else {
          requestAnimationFrame(cb);
        }
      };

      raf(() => {
        raf(() => {
          resolve();
        });
      });
    });
  }
}
```

### Public API Changes
- None (The interface already returns `Promise<void>`, but the implementation was synchronous).

### Dependencies
- None.

## 4. Test Plan

### Verification
- Run existing unit tests: `npm test -w packages/player`
- Run E2E verification: `npx tsx tests/e2e/verify-player.ts`

### Success Criteria
- `DirectController.seek` returns a Promise that resolves asynchronously after frame rendering.
- Unit tests pass (mocked RAF should handle the async flow).
- E2E tests pass (no regression in scrubbing performance).

### Edge Cases
- **Missing Iframe**: Ensure fallback to global `requestAnimationFrame` works correctly when `this.iframe` is undefined.
- **Rapid Seeking**: Ensure rapid calls to `seek` (scrubbing) do not cause performance issues or stack overflows (RAF callbacks are scheduled efficiently by the browser).
