#### 1. Context & Goal
- **Objective**: Implement missing standard `HTMLMediaElement` properties (`disableRemotePlayback`, `mediaGroup`, `sinkId`) and method (`setSinkId`) to `HeliosPlayer` to complete API parity.
- **Trigger**: Script analysis identified that these standard media properties/methods are missing from `packages/player/src/index.ts`.
- **Impact**: Full standard media API parity makes `HeliosPlayer` seamlessly compatible with standard media wrappers and libraries.

#### 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Add getters/setters/methods for `disableRemotePlayback`, `mediaGroup`, `sinkId`, `setSinkId`).
- **Modify**: `packages/player/src/index.test.ts` (Add tests for new properties).
- **Modify**: `packages/player/README.md` (Document the new properties).

#### 3. Implementation Spec
- **Architecture**: Web Component API Parity.
- **Pseudo-Code**:
  ```typescript
  // In HeliosPlayer class:

  // disableRemotePlayback
  public get disableRemotePlayback(): boolean {
      return this.hasAttribute("disableremoteplayback");
  }
  public set disableRemotePlayback(val: boolean) {
      if (val) this.setAttribute("disableremoteplayback", "");
      else this.removeAttribute("disableremoteplayback");
  }

  // mediaGroup
  public get mediaGroup(): string {
      return this.getAttribute("mediagroup") || "";
  }
  public set mediaGroup(val: string) {
      this.setAttribute("mediagroup", val);
  }

  // sinkId and setSinkId
  private _sinkId: string = "";
  public get sinkId(): string {
      return this._sinkId;
  }
  public async setSinkId(sinkId: string): Promise<void> {
      // Audio routing not natively supported by AudioContext destination easily,
      // but we store the value to satisfy the API shape.
      this._sinkId = sinkId;
      return Promise.resolve();
  }
  ```
- **Public API Changes**: Adds `disableRemotePlayback`, `mediaGroup`, `sinkId`, and `setSinkId` to `HeliosPlayer`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run test -w packages/player`
- **Success Criteria**: Tests pass and properties are exposed on the element correctly.
- **Edge Cases**: Ensure `setSinkId` returns a resolved promise.
