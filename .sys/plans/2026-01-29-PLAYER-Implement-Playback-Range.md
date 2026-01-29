#### 1. Context & Goal
- **Objective**: Expose the `setPlaybackRange` and `clearPlaybackRange` API from `packages/core` through the `HeliosController` interface and Bridge protocol.
- **Trigger**: The current `HeliosController` lacks these methods, forcing consumers like `packages/studio` to implement client-side looping logic, which duplicates core engine functionality.
- **Impact**: Enables robust, engine-driven looping and playback range support in Studio and other consumers, allowing them to rely on the engine's internal `playbackRange` state.

#### 2. File Inventory
- **Modify**:
  - `packages/player/src/controllers.ts`: Update `HeliosController` interface and implementations (`DirectController`, `BridgeController`).
  - `packages/player/src/bridge.ts`: Update `connectToParent` to handle new playback range messages.
  - `packages/player/src/controllers.test.ts`: Add unit tests for the new methods.
- **Read-Only**:
  - `packages/core/src/index.ts` (Reference for `Helios` API).

#### 3. Implementation Spec

**Architecture:**
- Extend the `HeliosController` interface to include `setPlaybackRange` and `clearPlaybackRange`.
- Update `DirectController` to pass these calls directly to the `Helios` instance.
- Update `BridgeController` to send `HELIOS_SET_PLAYBACK_RANGE` and `HELIOS_CLEAR_PLAYBACK_RANGE` messages.
- Update `connectToParent` in `bridge.ts` to listen for these messages and invoke the corresponding methods on the `Helios` instance.

**Public API Changes:**
- `HeliosController` interface in `packages/player/src/controllers.ts`:
  ```typescript
  export interface HeliosController {
    // ... existing members
    setPlaybackRange(startFrame: number, endFrame: number): void;
    clearPlaybackRange(): void;
  }
  ```

**Pseudo-Code:**

*packages/player/src/controllers.ts*
```typescript
// DirectController
setPlaybackRange(start, end) {
  this.instance.setPlaybackRange(start, end);
}
clearPlaybackRange() {
  this.instance.clearPlaybackRange();
}

// BridgeController
setPlaybackRange(start, end) {
  this.iframeWindow.postMessage({ type: 'HELIOS_SET_PLAYBACK_RANGE', start, end }, '*');
}
clearPlaybackRange() {
  this.iframeWindow.postMessage({ type: 'HELIOS_CLEAR_PLAYBACK_RANGE' }, '*');
}
```

*packages/player/src/bridge.ts*
```typescript
// inside connectToParent message listener
case 'HELIOS_SET_PLAYBACK_RANGE':
  const { start, end } = event.data;
  if (typeof start === 'number' && typeof end === 'number') {
    helios.setPlaybackRange(start, end);
  }
  break;
case 'HELIOS_CLEAR_PLAYBACK_RANGE':
  helios.clearPlaybackRange();
  break;
```

**Dependencies:**
- None. `packages/core` already supports these methods.

#### 4. Test Plan
- **Verification**: Run `npm test -w packages/player` to execute the updated test suite.
- **New Tests**:
  - In `packages/player/src/controllers.test.ts`:
    - **DirectController**:
      - Test `setPlaybackRange(10, 20)` calls `instance.setPlaybackRange(10, 20)`.
      - Test `clearPlaybackRange()` calls `instance.clearPlaybackRange()`.
    - **BridgeController**:
      - Test `setPlaybackRange(10, 20)` posts `{ type: 'HELIOS_SET_PLAYBACK_RANGE', start: 10, end: 20 }`.
      - Test `clearPlaybackRange()` posts `{ type: 'HELIOS_CLEAR_PLAYBACK_RANGE' }`.
- **Success Criteria**:
  - `packages/player` builds successfully.
  - All tests in `packages/player` pass.
- **Edge Cases**:
  - Ensure `start` and `end` are passed correctly across the bridge.
  - Ensure `clearPlaybackRange` works without arguments.
