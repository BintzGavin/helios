#### 1. Context & Goal
- **Objective**: Implement the `onencrypted` event handler and document the `encrypted` event for HTMLMediaElement API parity.
- **Trigger**: The `.jules/PLAYER.md` journal identifies a missing standard event (`encrypted`) necessary for full standard compliance.
- **Impact**: Improves standard compliance with HTMLMediaElement, allowing standard compliance checkers to pass, even if EME/DRM is not explicitly supported.

#### 2. File Inventory
- **Create**: None
- **Modify**:
  - `packages/player/src/index.ts`: Add `_onencrypted` private field and `onencrypted` getter/setter to manage the event listener.
  - `packages/player/README.md`: Add `onencrypted` to the Event Handlers section and `encrypted` to the Events section.
  - `packages/player/src/event_handlers.test.ts`: Add a test for the `onencrypted` event handler setter/getter and event dispatching.
- **Read-Only**:
  - `packages/player/src/api_parity.test.ts`: For reference on existing API parity tests.

#### 3. Implementation Spec
- **Architecture**: Follow the existing getter/setter pattern in the `HeliosPlayer` class for standard DOM events (adding/removing event listeners).
- **Pseudo-Code**:
  - In `packages/player/src/index.ts`:
    - Define private `_onencrypted = null`.
    - Create public getter `onencrypted` returning `this._onencrypted`.
    - Create public setter `onencrypted(handler)`:
      - If `this._onencrypted` is set, remove existing listener for `encrypted`.
      - Assign `this._onencrypted = handler`.
      - If `handler` is not null, add event listener for `encrypted`.
  - In `packages/player/README.md`:
    - Document `onencrypted` under `### Event Handlers`.
    - Document `encrypted` under `## Events`.
- **Public API Changes**: `HeliosPlayer` gains a new `onencrypted` property (getter/setter).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run test -w packages/player`
- **Success Criteria**: The `event_handlers.test.ts` passes, confirming `onencrypted` successfully registers and unregisters listeners.
- **Edge Cases**: Setting the handler to `null` correctly unregisters the previous listener.
