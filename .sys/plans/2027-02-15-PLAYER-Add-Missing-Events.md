#### 1. Context & Goal
- **Objective**: Implement missing `abort`, `emptied`, and `progress` media events in `<helios-player>` Web Component for full HTMLMediaElement API parity.
- **Trigger**: Vision gap identified in `README.md` (Standard Media API parity) comparing standard HTMLMediaElement event handlers to implemented ones.
- **Impact**: Improves standard compliance and allows drop-in replacement for standard `<video>` element for users relying on these events.

#### 2. File Inventory
- **Modify**: `packages/player/src/index.ts` - Add `_onabort`, `_onemptied`, `_onprogress` private properties and their corresponding public getters and setters. Update `bridgeMessageHandler` to forward these events if they arrive from the iframe (or simply mock them in the player based on state changes).
- **Modify**: `packages/player/README.md` - Document `onabort`, `onemptied`, `onprogress` in the "Event Handlers" section and their corresponding events in the "Events" section.
- **Modify**: `packages/player/src/index.test.ts` - Add assertions to verify `onabort`, `onemptied`, and `onprogress` properties work correctly.

#### 3. Implementation Spec
- **Architecture**: Extend the existing Web Component properties to include getters and setters for the `onabort`, `onemptied`, and `onprogress` event handlers following the established pattern.
- **Pseudo-Code**:
  ```typescript
  private _onabort: ((event: Event) => void) | null = null;
  public get onabort() { return this._onabort; }
  public set onabort(handler: ((event: Event) => void) | null) {
    if (this._onabort) this.removeEventListener('abort', this._onabort);
    this._onabort = handler;
    if (handler) this.addEventListener('abort', handler);
  }
  ```
  (Repeat for `onemptied` and `onprogress`)
- **Public API Changes**: Adds `onabort`, `onemptied`, and `onprogress` event handler properties to `HeliosPlayer`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm run build -w packages/player` and `npm run test -w packages/player`.
- **Success Criteria**: The player exposes the properties `onabort`, `onemptied`, and `onprogress` and they function as valid event listeners, passing tests.
- **Edge Cases**: None.
