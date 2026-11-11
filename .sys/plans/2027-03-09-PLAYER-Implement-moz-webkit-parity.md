#### 1. Context & Goal
- **Objective**: Implement missing vendor-prefixed properties and methods (`moz*` and `webkit*`) for complete HTMLVideoElement / HTMLMediaElement API parity.
- **Trigger**: The HTMLMediaElement and HTMLVideoElement specifications contain several legacy/vendor-prefixed properties (e.g. `mozCaptureStream`, `mozHasAudio`, `webkitSupportsFullscreen`) that are currently missing from the `<helios-player>` Web Component.
- **Impact**: Ensures that our `<helios-player>` accurately polyfills/reflects the full API surface of a standard HTMLMediaElement, fulfilling the core architectural promise of standard API parity.

#### 2. File Inventory
- **Create**: None
- **Modify**:
  - `packages/player/src/index.ts`: Add vendor-prefixed methods and properties.
  - `packages/player/README.md`: Document the newly added properties and methods.
- **Read-Only**: None

#### 3. Implementation Spec
- **Architecture**: We will add the missing `moz` and `webkit` properties to `HeliosPlayer` as read-only getters returning mock values (mostly `0`, `false`, or forwarding to existing methods).
- **Pseudo-Code**:
  ```typescript
  // In packages/player/src/index.ts
  public async mozCaptureStream(): Promise<MediaStream> {
    return this.captureStream();
  }
  public mozGetMetadata(): any { return {}; }
  public get mozHasAudio(): boolean { return this.audioTracks.length > 0; }
  public get mozParsedFrames(): number { return 0; }
  public get mozDecodedFrames(): number { return 0; }
  public get mozPresentedFrames(): number { return 0; }
  public get mozPaintedFrames(): number { return 0; }
  public get mozFrameDelay(): number { return 0; }
  public get mozAudioChannelType(): string { return "normal"; }

  public get webkitSupportsFullscreen(): boolean { return false; }
  public get webkitDisplayingFullscreen(): boolean { return false; }
  public webkitEnterFullscreen(): void {}
  public webkitExitFullscreen(): void {}
  public webkitEnterFullScreen(): void {}
  public webkitExitFullScreen(): void {}
  public get webkitPresentationMode(): string { return "inline"; }
  public webkitSetPresentationMode(mode: string): void {}
  public get webkitSupportsPresentationMode(): boolean { return false; }
  ```
- **Public API Changes**: Adds various vendor-prefixed properties and methods to `<helios-player>`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Ensure `npm run test` or `npx tsx tests/e2e/verify-player.ts` functions normally.
- **Success Criteria**: The `index.ts` file contains the newly added getters and methods, completing the API parity.
- **Edge Cases**: These are mostly mocked polyfill methods so edge cases are minimal.
