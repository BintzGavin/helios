#### 1. Context & Goal
- **Objective**: Update `DirectController.seek` to wait for a visual update (frame render) before resolving, ensuring consistency with `BridgeController` and compliance with Standard Media API.
- **Trigger**: Journal entry `[v0.76.3] - DirectController Consistency` identified this gap where `seeked` fires prematurely in Direct Mode.
- **Impact**: Fixes potential race conditions where `seeked` event fires before the video frame updates, ensuring reliable testing and providing a consistent API across connection modes.

#### 2. File Inventory
- **Modify**: `packages/player/src/controllers.ts` (Implement double-RAF wait in `seek`)
- **Modify**: `packages/player/src/controllers.test.ts` (Add test case to verify async behavior)

#### 3. Implementation Spec
- **Architecture**: Use `requestAnimationFrame` (double RAF pattern) to wait for the browser paint cycle after calling `this.instance.seek(frame)`.
- **Pseudo-Code**:
  ```typescript
  seek(frame: number) {
    this.instance.seek(frame);
    return new Promise<void>(resolve => {
       // Use iframe window if available to ensure we sync with composition rendering
       const targetWindow = this.iframe?.contentWindow || window;
       targetWindow.requestAnimationFrame(() => {
           targetWindow.requestAnimationFrame(() => {
               resolve();
           });
       });
    });
  }
  ```
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm test packages/player/src/controllers.test.ts`
- **Success Criteria**:
  - All existing tests pass.
  - A new test case confirms `seek` returns a Promise that resolves only after RAF callbacks execution.
- **Edge Cases**: Verify behavior when `iframe.contentWindow` is null (fallback to global window).
