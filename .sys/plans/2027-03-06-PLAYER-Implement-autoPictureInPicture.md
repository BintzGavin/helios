#### 1. Context & Goal
- **Objective**: Implement the `autoPictureInPicture` property on `HeliosPlayer` to bridge a vision gap.
- **Trigger**: The HTMLVideoElement standard interface defines `autoPictureInPicture`, but it is currently missing in the `HeliosPlayer` implementation and documentation.
- **Impact**: Brings the `HeliosPlayer` Web Component closer to complete drop-in parity with native `HTMLVideoElement`, allowing seamless integration with libraries that expect this property to control automatic PiP behavior.

#### 2. File Inventory
- **Create**: None
- **Modify**:
  - `packages/player/src/index.ts` - Add `autoPictureInPicture` property getter/setter mapping to the internal `pipVideo` element.
  - `packages/player/README.md` - Document the `autoPictureInPicture` property.

#### 3. Implementation Spec
- **Architecture**: Web Component API Parity. The `HeliosPlayer` should proxy the `autoPictureInPicture` property to its internal `<video>` element (`this.pipVideo`), which actually handles the PiP logic. If the internal video element isn't ready or doesn't support it, we'll store it on a local fallback state (or directly check `this.pipVideo` since it is initialized in the constructor).
- **Pseudo-Code**:
  ```typescript
  // In packages/player/src/index.ts inside HeliosPlayer class
  public get autoPictureInPicture(): boolean {
    return this.pipVideo.autoPictureInPicture ?? false;
  }
  public set autoPictureInPicture(val: boolean) {
    this.pipVideo.autoPictureInPicture = val;
  }
  ```
- **Public API Changes**:
  - Added `autoPictureInPicture` (boolean) to `HeliosPlayer` instance properties.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run test -w packages/player`
- **Success Criteria**:
  - The test suite passes.
  - The newly added `autoPictureInPicture` property correctly sets and gets the value from the internal `pipVideo` element.
- **Edge Cases**: Ensure the property does not throw if set early in the component lifecycle.
