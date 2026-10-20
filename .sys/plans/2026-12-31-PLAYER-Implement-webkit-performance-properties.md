#### 1. Context & Goal
- **Objective**: Implement the `webkitAudioDecodedByteCount`, `webkitDecodedFrameCount`, `webkitDroppedFrameCount`, and `webkitVideoDecodedByteCount` getter properties on `HeliosPlayer` for HTMLVideoElement API parity.
- **Trigger**: We're continuing the HTMLMediaElement/HTMLVideoElement parity track based on Chromium's native implementation, to ensure `HeliosPlayer` behaves identically to a native `<video>` element for standard compliance checkers.
- **Impact**: Brings `HeliosPlayer` one step closer to 100% drop-in API parity with native video elements, particularly for legacy performance monitoring tools that rely on these properties.

#### 2. File Inventory
- **Modify**: `packages/player/src/index.ts` - Implement the properties.
- **Modify**: `packages/player/src/api_parity.test.ts` - Add unit tests to ensure parity.
- **Read-Only**: None

#### 3. Implementation Spec
- **Architecture**: We'll implement these as getter properties that return `0` (similar to how some other native stub properties operate) or use mocked statistics to maintain API parity since Helios itself isn't a traditional video decoder, but rather a WebCodecs-driven/DOM-driven composition renderer.
- **Pseudo-Code**:
  ```typescript
  // In HeliosPlayer class (packages/player/src/index.ts)
  public get webkitAudioDecodedByteCount(): number {
    return 0; // Stub for parity
  }

  public get webkitDecodedFrameCount(): number {
    return 0; // Stub for parity
  }

  public get webkitDroppedFrameCount(): number {
    return 0; // Stub for parity
  }

  public get webkitVideoDecodedByteCount(): number {
    return 0; // Stub for parity
  }
  ```
- **Public API Changes**: Adds four new getters: `webkitAudioDecodedByteCount`, `webkitDecodedFrameCount`, `webkitDroppedFrameCount`, and `webkitVideoDecodedByteCount`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm run test -w packages/player`
- **Success Criteria**: All tests must pass, confirming the new webkit performance properties exist and return numeric values.
- **Edge Cases**: None.
