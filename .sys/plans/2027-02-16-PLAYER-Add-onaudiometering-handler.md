#### 1. Context & Goal
- **Objective**: Implement missing `onaudiometering` standard event handler property on the `<helios-player>` Web Component.
- **Trigger**: The Vision vs Reality analysis revealed that while the `audiometering` event is documented and dispatched by the player, the corresponding `onaudiometering` IDL attribute (event handler property) is missing from the implementation and documentation, leaving an API parity gap.
- **Impact**: Completes the standard event handler API parity by allowing developers to use the `player.onaudiometering = (e) => {}` pattern, consistent with other media events.

#### 2. File Inventory
- **Create**: None
- **Modify**:
  - `packages/player/src/index.ts` (Add `onaudiometering` getter/setter)
  - `packages/player/README.md` (Document `onaudiometering` under Event Handlers)
- **Read-Only**: `packages/player/src/index.test.ts`

#### 3. Implementation Spec
- **Architecture**: Standard HTMLMediaElement IDL event handler property pattern matching existing implementations (e.g., `_onplay`, `get onplay()`, `set onplay()`).
- **Pseudo-Code**:
  - In `packages/player/src/index.ts`, add a private `_onaudiometering: ((event: Event) => void) | null = null;` to the `HeliosPlayer` class.
  - Add public getter: `public get onaudiometering() { return this._onaudiometering; }`
  - Add public setter: `public set onaudiometering(handler: ((event: Event) => void) | null)` which calls `removeEventListener` for the old handler (if exists), updates `_onaudiometering`, and calls `addEventListener` for the new handler (if not null).
  - In `packages/player/README.md`, add `- \`onaudiometering\` (function | null): Event handler for the \`audiometering\` event.` to the `### Event Handlers` list.
- **Public API Changes**: Adds `onaudiometering` property to the `HeliosPlayer` class.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run build -w packages/player && npm test -w packages/player`
- **Success Criteria**: The `HeliosPlayer` class supports getting and setting the `onaudiometering` property. Documentation accurately lists the new event handler.
- **Edge Cases**: Unsetting the handler by assigning `null` successfully removes the underlying event listener.
