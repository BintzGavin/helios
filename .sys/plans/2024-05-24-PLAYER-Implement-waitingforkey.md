### 1. Context & Goal
- **Objective**: Implement the missing `onwaitingforkey` event handler and document the `waitingforkey` event to complete HTMLMediaElement parity in the `<helios-player>` component.
- **Trigger**: Discovered that the standard `waitingforkey` event and `onwaitingforkey` handler are missing from both the codebase (`index.ts`) and the documentation (`README.md`), causing a gap in HTMLMediaElement API parity.
- **Impact**: Full compliance with the `HTMLMediaElement` spec regarding event handlers, closing the API parity gap.

### 2. File Inventory
- **Modify**: `packages/player/src/index.ts`: Add `onwaitingforkey` getter/setter and `_onwaitingforkey` private property.
- **Modify**: `packages/player/README.md`: Document `onwaitingforkey` event handler and `waitingforkey` event.
- **Read-Only**: `docs/status/PLAYER.md`

### 3. Implementation Spec
- **Architecture**: Follow the existing pattern for event handlers in `HeliosPlayer` (e.g., `onencrypted`, `onplay`).
- **Pseudo-Code**:
  ```javascript
  private _onwaitingforkey: ((event: Event) => void) | null = null;
  public get onwaitingforkey() { return this._onwaitingforkey; }
  public set onwaitingforkey(handler: ((event: Event) => void) | null) {
    if (this._onwaitingforkey) this.removeEventListener('waitingforkey', this._onwaitingforkey);
    this._onwaitingforkey = handler;
    if (handler) this.addEventListener('waitingforkey', handler);
  }
  ```
- **Public API Changes**: Adds `onwaitingforkey` property to the `HeliosPlayer` class.
- **Dependencies**: None.

### 4. Test Plan
- **Verification**: `npm run test -w packages/player`
- **Success Criteria**: The component builds successfully and the event handler is present.
- **Edge Cases**: None.
