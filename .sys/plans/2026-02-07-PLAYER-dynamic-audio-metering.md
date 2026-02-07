#### 1. Context & Goal
- **Objective**: Update `AudioMeter` to detect and meter `<audio>` and `<video>` elements added dynamically to the DOM after initialization.
- **Trigger**: Currently, `AudioMeter` only scans the DOM once during `connect()`. Elements added later (e.g., via React rendering or JavaScript) are missed, causing silent audio issues or incorrect metering. This violates the "Reactive DOM Features" learning.
- **Impact**: Ensures accurate audio metering for all media elements in a composition, regardless of when they are added to the DOM. Improves reliability for dynamic compositions.

#### 2. File Inventory
- **Create**: None
- **Modify**:
  - `packages/player/src/features/audio-metering.ts`: Add `MutationObserver` logic to track DOM changes.
  - `packages/player/src/features/audio-metering.test.ts`: Add tests for dynamic element detection using mocked `MutationObserver`.
- **Read-Only**:
  - `packages/player/src/features/audio-fader.ts`: Reference implementation for `MutationObserver` usage.

#### 3. Implementation Spec
- **Architecture**: Use the `MutationObserver` API to watch for changes in the composition's DOM (`doc.body`), specifically looking for added or removed `HTMLMediaElement` nodes.
- **Pseudo-Code**:
  - Add `private observer: MutationObserver | null = null;` to `AudioMeter` class.
  - In `connect(doc: Document)`:
    - Keep existing initial scan logic.
    - Initialize `this.observer` with a callback function.
    - Inside callback:
      - Iterate through `mutations`.
      - For `addedNodes`:
        - Check if node is `ELEMENT_NODE`.
        - Check if node is `AUDIO` or `VIDEO`. If so, connect it.
        - Also `querySelectorAll('audio, video')` on the added node to find nested media elements and connect them.
      - For `removedNodes`:
        - Check if node is `ELEMENT_NODE`.
        - Check if node is `AUDIO` or `VIDEO`. If so, and if in `this.sources`, disconnect and remove it.
        - Also check descendants for removed media elements.
    - Call `this.observer.observe(doc.body, { childList: true, subtree: true });`.
  - In `dispose()`:
    - Call `this.observer.disconnect()` if it exists.
    - Set `this.observer = null`.
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run test -w packages/player`
- **Success Criteria**:
  - All existing tests pass.
  - A new test case in `audio-metering.test.ts` successfully mocks `MutationObserver` and verifies that:
    1. `connect()` starts observing.
    2. Simulating a mutation with an added `<audio>` element triggers the connection logic (calls `manager.getSharedSource`).
    3. Simulating a mutation with a removed `<audio>` element triggers the disconnection logic.
- **Edge Cases**:
  - Elements added/removed in subtrees (e.g., a `div` containing an `audio` tag is added).
  - Removing an element that was never connected (should be handled gracefully).
  - Calling `connect` multiple times (should clean up previous observer if necessary, though `AudioMeter` lifecycle usually implies single connection per instance or disposal before reconnect).
