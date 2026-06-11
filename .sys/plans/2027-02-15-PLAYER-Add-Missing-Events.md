#### 1. Context & Goal
- **Objective**: Implement missing dispatch of `abort`, `emptied`, and `progress` media events in the `<helios-player>` Web Component to complete HTMLMediaElement API parity.
- **Trigger**: Issue reported: The player has handler properties (`onabort`, `onemptied`, `onprogress`) but these events are never actually dispatched in the `src/index.ts` file.
- **Impact**: Improves standard compliance and ensures event listeners for these media events are properly triggered during the player's lifecycle.

#### 2. File Inventory
- **Modify**: `packages/player/src/index.ts`
  - Add dispatch for `abort` and `emptied` in `loadIframe()` if the player was already loaded.
  - Add dispatch for `progress` in `loadIframe()` after `loadstart`.

#### 3. Implementation Spec
- **Architecture**: In `packages/player/src/index.ts`, locate the `loadIframe(src: string)` method.
  - Before setting the new `src` and resetting states, check if the player is already loaded. If so, it means we are aborting the previous load/playback. Dispatch `abort` and `emptied` events.
  - Immediately after dispatching `loadstart`, dispatch a `progress` event to indicate data fetching has started.
- **Pseudo-Code**:
  - `loadIframe` function:
    - If previously loaded: dispatch `abort` and `emptied`.
    - Reset internal state variables.
    - Dispatch `loadstart`.
    - Dispatch `progress`.
    - Set new iframe source and internal state.
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm run build -w packages/player` and `npm run test -w packages/player`.
- **Success Criteria**: The player successfully dispatches the `abort`, `emptied`, and `progress` events during the appropriate lifecycle states. Tests pass.
- **Edge Cases**: Ensure `abort` and `emptied` do not fire on the very first load. Ensure these events do not break existing logic.
