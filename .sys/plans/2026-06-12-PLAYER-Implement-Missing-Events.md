
#### 1. Context & Goal
- **Objective**: Implement dispatching for `abort`, `emptied`, and `progress` events, and document them in the README.md to complete API parity.
- **Trigger**: The event handler properties (`onabort`, `onemptied`, `onprogress`) are implemented and documented, but the component never actually dispatches these events, and they are missing from the README.md events list.
- **Impact**: Completes standard HTMLMediaElement API parity by ensuring the player both dispatches and documents these standard media lifecycle events.

#### 2. File Inventory
- **Create**: None
- **Modify**:
  - `packages/player/src/index.ts` (Add event dispatches in `loadIframe`)
  - `packages/player/README.md` (Document the new events)
- **Read-Only**: None

#### 3. Implementation Spec
- **Architecture**: Dispatch standard `Event` instances matching the HTMLMediaElement specification when appropriate state changes occur.
- **Pseudo-Code**:
  - Update `packages/player/src/index.ts`:
    - Dispatch `abort` and `emptied` when `loadIframe()` is called (if `this.isLoaded` was true, indicating a previous source was aborted/emptied), mimicking the standard `load()` process.
    - Dispatch `progress` immediately after `loadstart` to simulate the browser fetching data.
  - Update `packages/player/README.md`:
    - Add `abort`, `emptied`, and `progress` to the `## Events` list.
- **Public API Changes**: None (dispatching existing internal events).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  - Run `grep -E "dispatchEvent.*(abort|emptied|progress)" packages/player/src/index.ts` to verify the dispatches exist.
  - Run `grep -E "^- \`(abort|emptied|progress)\`: Fired" packages/player/README.md` to verify the documentation.
- **Success Criteria**: The events are dispatched during load sequences and are accurately documented in the README.
- **Edge Cases**: Ensure the events are correctly named and don't conflict with any browser native events bubbling up inappropriately.
