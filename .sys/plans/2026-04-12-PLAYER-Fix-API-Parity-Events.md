#### 1. Context & Goal
- **Objective**: Implement missing media events (`playing`, `waiting`, `suspend`, `stalled`) to improve API parity with HTMLMediaElement.
- **Trigger**: The HTMLMediaElement specification requires several lifecycle and network state events that `HeliosPlayer` does not currently dispatch or support handlers for.
- **Impact**: Better compatibility with third-party wrappers and analytics tracking that rely on standard media events.

#### 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Add event handler properties and dispatch logic)
- **Modify**: `packages/player/src/features/api_parity.test.ts` (Add tests for new events, ensuring parity with HTMLMediaElement)

#### 3. Implementation Spec
- **Architecture**: We will add the corresponding handler properties (`onplaying`, `onwaiting`, `onsuspend`, `onstalled`) following the existing pattern for event handlers in `HeliosPlayer`. We will dispatch these events appropriately based on internal state changes (e.g. `playing` when playback starts or resumes).
- **Pseudo-Code**:
  - `packages/player/src/index.ts`: Add `_onplaying`, `_onwaiting`, `_onsuspend`, `_onstalled` and getter/setters for `onplaying`, `onwaiting`, `onsuspend`, `onstalled`.
  - In `updateUI` state diff check, if `state.isPlaying` transitions to true (and wasn't previously true), dispatch `playing` event in addition to `play` event.
  - While `waiting`, `suspend`, and `stalled` might not trigger naturally in a generated local video environment like Helios, adding the properties ensures the interface adheres to standard media elements, allowing developers to safely set handlers.
- **Public API Changes**: Adds `onplaying`, `onwaiting`, `onsuspend`, `onstalled` to `HeliosPlayer`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm test -w packages/player`
- **Success Criteria**: The `api_parity.test.ts` should confirm the presence of the new event properties (`onplaying`, `onwaiting`, `onsuspend`, `onstalled`) and verify `playing` dispatch on play.
- **Edge Cases**: Ensure handlers can be assigned and removed correctly.
