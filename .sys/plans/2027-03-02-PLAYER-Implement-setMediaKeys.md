#### 1. Context & Goal
- **Objective**: Identify a gap in `HTMLMediaElement` parity for `<helios-player>` and generate a detailed Spec File for implementation.
- **Trigger**: The Vision states the `<helios-player>` Web Component should be an `HTMLMediaElement` drop-in replacement. `setMediaKeys()` method is missing.
- **Impact**: Achieves deeper `HTMLMediaElement` API parity, allowing compatibility with applications that might invoke this method (even if it just returns a rejected promise or null since DRM is not supported).

#### 2. File Inventory
- **Create**: (None)
- **Modify**:
  - `packages/player/src/index.ts`: Add `setMediaKeys` method.
  - `packages/player/src/api_parity.test.ts`: Add tests to verify `setMediaKeys()` returns a rejected Promise.
  - `packages/player/README.md`: Document the `setMediaKeys()` method.
- **Read-Only**: `packages/player/package.json`

#### 3. Implementation Spec
- **Architecture**: Standard Web Component API mapping. The `setMediaKeys()` method will be implemented to return a rejected promise with `NotSupportedError`, as DRM/EME is not natively supported by the player or iframe bridge right now.
- **Pseudo-Code**:
  ```typescript
  public setMediaKeys(mediaKeys: MediaKeys | null): Promise<void> {
    return Promise.reject(new DOMException("setMediaKeys is not supported.", "NotSupportedError"));
  }
  ```
- **Public API Changes**: Adds `setMediaKeys()` method.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run test -w packages/player`
- **Success Criteria**: `api_parity.test.ts` passes with verification that `setMediaKeys()` returns a rejected Promise.
- **Edge Cases**: Verify behaviour with `null` parameter.
