#### 1. Context & Goal
- **Objective**: Implement the standard `onencrypted` media event handler property and document the `encrypted` event for `HeliosPlayer`.
- **Trigger**: HTMLMediaElement parity gap identified (the `encrypted` event handler is missing from the codebase).
- **Impact**: Achieves deeper API parity with standard HTMLMediaElement by providing the `onencrypted` property and documenting it, even though EME is unsupported.

#### 2. File Inventory
- **Create**: None.
- **Modify**: `packages/player/src/index.ts` - Add `onencrypted` getter and setter.
- **Modify**: `packages/player/README.md` - Document `onencrypted` and `encrypted`.
- **Read-Only**: None.

#### 3. Implementation Spec
- **Architecture**: Web Components standard event mapping.
- **Pseudo-Code**:
  - Add a private backing field for the `onencrypted` event handler.
  - Implement a public getter that returns the current handler.
  - Implement a public setter that removes the old event listener if it exists, assigns the new handler, and attaches the new event listener if the new handler is not null.
  - Update the Event Handlers section in `README.md` to include `onencrypted`.
  - Update the Events section in `README.md` to include `encrypted`.
- **Public API Changes**: Exposes `onencrypted` on `HeliosPlayer`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm run build -w packages/player` and `npm run test -w packages/player`.
- **Success Criteria**: `onencrypted` property exists and compiles.
- **Edge Cases**: None (standard boilerplate for events).
