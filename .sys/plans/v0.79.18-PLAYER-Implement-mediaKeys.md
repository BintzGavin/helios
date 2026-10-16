#### 1. Context & Goal
- **Objective**: Implement `mediaKeys` property and `setMediaKeys()` method in `HeliosPlayer` for HTMLMediaElement API parity.
- **Trigger**: The HTMLMediaElement interface includes `mediaKeys` and `setMediaKeys()` for Encrypted Media Extensions (EME). While Helios doesn't explicitly support EME DRM natively, providing these stubbed APIs ensures standard compliance and passes parity checks (similar to how `srcObject`, `sinkId`, and standard events like `encrypted` and `waitingforkey` are handled).
- **Impact**: Improves standard compliance for `<helios-player>` as a drop-in replacement for standard `<video>` elements, passing more strict type checking and API parity tests in downstream tools.

#### 2. File Inventory
- **Modify**: `packages/player/src/index.ts` - Implement `mediaKeys` property getter and `setMediaKeys` method.
- **Modify**: `packages/player/src/api_parity.test.ts` - Add tests to verify `mediaKeys` and `setMediaKeys`.
- **Modify**: `packages/player/README.md` - Document the new property and method under the API section for HTMLMediaElement parity.

#### 3. Implementation Spec
- **Architecture**:
  - Since Helios does not play EME content in its core bridge logic right now, we will stub these APIs.
  - In `packages/player/src/index.ts`:
    - Add private property `_mediaKeys: MediaKeys | null = null;`.
    - Expose `get mediaKeys(): MediaKeys | null { return this._mediaKeys; }`.
    - Expose `public async setMediaKeys(mediaKeys: MediaKeys | null): Promise<void>` which sets `this._mediaKeys = mediaKeys;` and logs a warning about EME not being fully supported.
- **Public API Changes**:
  - Property `mediaKeys: MediaKeys | null` added to `HeliosPlayer` instances.
  - Method `setMediaKeys(mediaKeys: MediaKeys | null): Promise<void>` added to `HeliosPlayer`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run test -w packages/player`
- **Success Criteria**: All tests pass, particularly the newly added `mediaKeys` API parity tests.
- **Edge Cases**:
  - Calling `setMediaKeys` returns a resolved promise.
  - Getting `mediaKeys` returns the stored value (initially `null`).
