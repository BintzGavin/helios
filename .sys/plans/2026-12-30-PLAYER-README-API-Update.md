#### 1. Context & Goal
- **Objective**: Document `enterpictureinpicture`, `leavepictureinpicture` events, and `captureStream`, `startAudioMetering`, `stopAudioMetering` methods in `README.md`.
- **Trigger**: The Vision vs Reality analysis revealed that `enterpictureinpicture`, `leavepictureinpicture` events and `captureStream`, `startAudioMetering`, `stopAudioMetering` methods exist in the implementation but are not documented in the README.
- **Impact**: Ensures that users have an accurate and up-to-date reference for the `<helios-player>` API and its features.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/player/README.md` (Update API documentation)
- **Read-Only**: `packages/player/src/index.ts`

#### 3. Implementation Spec
- **Architecture**: Documentation updates.
- **Pseudo-Code**:
  - Update `packages/player/README.md`
  - Add `- \`captureStream(): Promise<MediaStream>\` - Returns a MediaStream capturing the player's canvas (if same-origin).` to the Methods section.
  - Add `- \`startAudioMetering(): void\` - Starts audio metering calculation.` to the Methods section.
  - Add `- \`stopAudioMetering(): void\` - Stops audio metering calculation.` to the Methods section.
  - Add `- \`enterpictureinpicture\`: Fired when the player enters Picture-in-Picture mode.` under the Events section.
  - Add `- \`leavepictureinpicture\`: Fired when the player leaves Picture-in-Picture mode.` under the Events section.
- **Public API Changes**: No changes to the code, only to the README.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run test`
- **Success Criteria**: The README includes the new methods and events.
- **Edge Cases**: None.
