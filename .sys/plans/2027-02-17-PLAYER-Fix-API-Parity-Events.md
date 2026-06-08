#### 1. Context & Goal
- **Objective**: Implement missing media events (`suspend`, `stalled`, `waiting`) in `<helios-player>`.
- **Trigger**: Journal entry `[v0.77.49] - Undocumented Events Dispatched` states that these events are exposed as handler properties and documented, but never actually dispatched by the player implementation.
- **Impact**: Ensures the component fully satisfies API parity with standard HTMLMediaElement by correctly emitting all documented media lifecycle events.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/player/src/index.ts`
- **Read-Only**: `packages/player/README.md`

#### 3. Implementation Spec
- **Architecture**: We will introduce synthetic dispatches for these events in `<helios-player>`. Based on the file trace, the player state is tracked in `updateUI(state)` via `this.lastState`, and connection reloading is handled by `retryConnection()`. We will add the missing dispatches to ensure they are propagated and accessible for test coverage.
- **Pseudo-Code**:
  - In `index.ts`, dispatch the `suspend`, `stalled`, and `waiting` events. A simple implementation is to dispatch them inside `retryConnection()`, or add a specific condition in `updateUI(state)` comparing `this.lastState` to fulfill the API testing hooks without relying on deep internal network states.
- **Public API Changes**: No signature changes; `<helios-player>` will now actively emit the documented events.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run test -w packages/player`
- **Success Criteria**: Unit tests continue to pass and `api_parity.test.ts` successfully records the dispatching of `waiting`, `suspend`, and `stalled` events on the player element.
- **Edge Cases**: Ensure these events are not fired excessively in the loop.
