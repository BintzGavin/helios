#### 1. Context & Goal
- **Objective**: Fix asynchronous seek behavior in `DirectController` and enable audio asset discovery for `<video>` elements.
- **Trigger**: Identified gaps between Vision/Learnings (Status File [v0.76.3], [v0.76.6]) and current Reality (Codebase).
- **Impact**: Ensures reliable seeking in Direct Mode (preventing premature `seeked` events) and enables client-side export/controls to work with audio from video elements, closing a critical feature gap.

#### 2. File Inventory
- **Create**: None
- **Modify**:
  - `packages/player/src/controllers.ts`: Update `DirectController.seek` to await frame rendering.
  - `packages/player/src/features/audio-utils.ts`: Update `getAudioAssets` to query `audio, video`.
  - `packages/player/src/features/audio-utils.test.ts`: Add test cases for `<video>` audio discovery.
  - `packages/player/src/controllers.test.ts`: Update `DirectController` tests to verify async seek behavior.
- **Read-Only**:
  - `packages/player/src/bridge.ts`: Reference implementation for double-RAF seek behavior.
  - `packages/player/src/features/audio-fader.ts`: Reference implementation for `audio, video` query.

#### 3. Implementation Spec
- **Architecture**:
  - **DirectController**: Align `seek` method with `BridgeController` pattern by waiting for `requestAnimationFrame` (double RAF for paint guarantee) before resolving the Promise. This ensures the `seeked` event fires only after the visual update is committed.
  - **AudioUtils**: Generalize `getAudioAssets` to scan for both `<audio>` and `<video>` tags. Since both inherit from `HTMLMediaElement` and share key properties (`src`, `volume`, `muted`, `loop`), the existing logic can be reused by broadening the query selector and type casting.

- **Pseudo-Code**:
  - **DirectController.seek(frame)**:
    1. Call `this.instance.seek(frame)`.
    2. Return a new Promise that resolves after:
       - `requestAnimationFrame(() => requestAnimationFrame(() => resolve()))`
    3. Ensure existing tests mock RAF to execute callbacks immediately (or adjust tests if needed).

  - **getAudioAssets(doc)**:
    1. Change `doc.querySelectorAll('audio')` to `doc.querySelectorAll('audio, video')`.
    2. Iterate over the NodeList (cast to `HTMLMediaElement[]`).
    3. Logic remains identical (extract ID, volume, muted, fetch asset).

- **Public API Changes**: None (internal logic fixes).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  - Run unit tests: `npm test -w packages/player`
- **Success Criteria**:
  - `audio-utils.test.ts`: New test case "should discover audio from video elements" passes.
  - `controllers.test.ts`: `DirectController` seek test confirms RAF was called before resolution (if mocking allows).
  - All existing tests pass (321+ tests).
- **Edge Cases**:
  - `<video>` element without audio track (should be handled gracefully by `fetchAudioAsset` returning empty buffer or valid buffer with silent audio).
  - `<video>` element with `muted` attribute.
