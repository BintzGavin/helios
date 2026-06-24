#### 1. Context & Goal
- **Objective**: Implement `getVideoPlaybackQuality`, `requestVideoFrameCallback`, and `cancelVideoFrameCallback` methods on `HeliosPlayer` to complete `HTMLVideoElement` API parity.
- **Trigger**: Vision gap identified in `HTMLVideoElement` API parity. `HeliosPlayer` aims to be a drop-in replacement for standard `<video>` elements, but lacks these standard methods.
- **Impact**: Unlocks deeper compatibility with third-party video tracking, analytics, and frame-syncing wrappers that rely on the standard Video APIs.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/player/src/index.ts` (Implement the missing methods)
- **Modify**: `packages/player/README.md` (Document the newly added methods)
- **Modify**: `packages/player/src/api_parity.test.ts` (Add tests for the new methods)
- **Read-Only**: `README.md` (To verify documentation requirements for the player API)

#### 3. Implementation Spec
- **Architecture**: Standard Web Component class methods matching the `HTMLVideoElement` interface.
- **Pseudo-Code**:
  - Add `getVideoPlaybackQuality()` method returning a standard `VideoPlaybackQuality` object (e.g., `{ creationTime: performance.now(), totalVideoFrames: this.currentFrame, droppedVideoFrames: 0, corruptedVideoFrames: 0 }`).
  - Add `requestVideoFrameCallback(callback: VideoFrameRequestCallback): number` method that polyfills the standard behavior via `requestAnimationFrame`. The callback should be passed `(now, { presentationTime, expectedDisplayTime, width, height, mediaTime, presentedFrames, processingDuration })`.
  - Add `cancelVideoFrameCallback(handle: number): void` method that polyfills via `cancelAnimationFrame`.
  - Update `packages/player/README.md` under the Methods section to include `getVideoPlaybackQuality()`, `requestVideoFrameCallback()`, and `cancelVideoFrameCallback()`.
  - Add simple unit tests in `packages/player/src/api_parity.test.ts` to assert methods exist and function basically.
- **Public API Changes**: Expose `getVideoPlaybackQuality`, `requestVideoFrameCallback`, and `cancelVideoFrameCallback` on `HeliosPlayer`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run build -w packages/player && npx vitest run --passWithNoTests packages/player/`
- **Success Criteria**: Methods exist on `HeliosPlayer` prototype, return expected types, correctly execute the provided callbacks via the polyfill, and are documented in the README.
- **Edge Cases**: Valid polyfill execution of `requestVideoFrameCallback` with timestamp and metadata arguments; safe handling of invalid handles in `cancelVideoFrameCallback`.
