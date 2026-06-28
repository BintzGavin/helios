#### 1. Context & Goal
- **Objective**: Expose `setPlaybackRange` and `clearPlaybackRange` as public methods on the `<helios-player>` Web Component and document them in the README.
- **Trigger**: The underlying `HeliosController` implementation and UI support setting and clearing a playback range, but these methods are currently missing from the public API of the `HeliosPlayer` component itself.
- **Impact**: Unlocks the ability for third-party scripts and users to programmatically set loop in/out points on the player.

#### 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Implement public wrapper methods on `HeliosPlayer` class)
- **Modify**: `packages/player/README.md` (Add `setPlaybackRange` and `clearPlaybackRange` to the Methods documentation section)
- **Read-Only**: `packages/player/src/controllers.ts`

#### 3. Implementation Spec
- **Architecture**: We will add two public methods on the `HeliosPlayer` Web Component class (`packages/player/src/index.ts`). These methods will check if `this.controller` exists; if so, they will delegate to `this.controller.setPlaybackRange(start, end)` and `this.controller.clearPlaybackRange()`. If the controller isn't ready yet, they should log a warning or defer the action (delegating when `this.controller` is accessed is fine, but they could also be stored as pending state if needed - however, other methods like `play()` just fail or do nothing if the controller is missing. Given that, doing a simple `if (this.controller) this.controller.setPlaybackRange(...)` is consistent with methods like `pause()`).
- **Pseudo-Code**:
```typescript
  public setPlaybackRange(startFrame: number, endFrame: number): void {
    if (this.controller) {
      this.controller.setPlaybackRange(startFrame, endFrame);
    }
  }

  public clearPlaybackRange(): void {
    if (this.controller) {
      this.controller.clearPlaybackRange();
    }
  }
```
- **Public API Changes**: New methods `setPlaybackRange(start: number, end: number): void` and `clearPlaybackRange(): void`. Documentation updated in README.md under `### Methods`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm run build -w packages/player` to ensure no TypeScript compilation errors exist.
- **Success Criteria**: `index.ts` exports the methods successfully, and `packages/player/README.md` documents them.
- **Edge Cases**: Calling these methods before the controller is initialized will be handled gracefully (i.e. ignored, just like `pause()`).
