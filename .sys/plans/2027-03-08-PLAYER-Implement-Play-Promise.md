#### 1. Context & Goal
- **Objective**: Ensure the `play()` method returns a `Promise` that resolves when playback actually begins or rejects if it fails, aligning with the `HTMLMediaElement.play()` specification.
- **Trigger**: Vision gap - `play()` currently returns `Promise<void>` but resolves immediately without waiting for actual playback to start or handling rejections.
- **Impact**: True API parity with `HTMLMediaElement`, preventing bugs in React/Vue wrappers that rely on standard Promise resolution/rejection for `play()` (e.g. for handling autoplay block).

#### 2. File Inventory
- **Create**: (None)
- **Modify**: `packages/player/src/index.ts`
- **Read-Only**: `docs/status/PLAYER.md`

#### 3. Implementation Spec
- **Architecture**: Web Component API Parity
- **Pseudo-Code**:
  - Update `play()` in `HeliosPlayer` class.
  - Instead of resolving immediately, return a new Promise.
  - Check if `this.paused` is false (or if it immediately starts).
  - Listen for the `play` event or `playing` event on `this` to resolve the promise.
  - Listen for `abort` or `error` events on `this` to reject the promise with an appropriate `DOMException` (e.g. `AbortError` or `NotAllowedError`).
  - If `!this.isLoaded`, still set `autoplay` and `this.load()`, but wait for the `play` event to resolve.
- **Public API Changes**: No signature changes (`play(): Promise<void>`), but behavioral change to match spec.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run test -w packages/player` and `npm run build -w packages/player`
- **Success Criteria**: The `play()` method returns a Promise that correctly resolves when the `play` event is fired and rejects if an error occurs. Tests pass successfully.
- **Edge Cases**:
  - `play()` called when already playing (should resolve immediately).
  - Multiple rapid calls to `play()` (should return the same pending promise or handle them gracefully).
  - Calling `play()` before iframe is loaded (should resolve once loaded and playing).
