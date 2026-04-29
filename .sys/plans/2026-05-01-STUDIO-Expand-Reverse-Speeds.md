#### 1. Context & Goal
- **Objective**: Add -2x and -4x reverse playback options to the playback speed dropdown.
- **Trigger**: Vision gap identified: The "J" shortcut allows reverse playback up to -4x speed, but the PlaybackControls UI dropdown only offers a single reverse option (-1x).
- **Impact**: Ensures parity between keyboard shortcuts and UI controls, providing a complete variable speed playback experience as promised in the vision.

#### 2. File Inventory
- **Create**: []
- **Modify**: [`packages/studio/src/components/Controls/PlaybackControls.tsx` - Add `<option value="-4">⏪ -4x</option>` and `<option value="-2">⏪ -2x</option>` to the select element]
- **Read-Only**: [`packages/studio/src/components/GlobalShortcuts.tsx`]

#### 3. Implementation Spec
- **Architecture**: Simple UI addition to existing `<select>` element. The `HeliosController` and `GlobalShortcuts` already support these playback rates.
- **Pseudo-Code**:
  - Locate the `<select value={playbackRate}>` element in `PlaybackControls.tsx`.
  - Insert `<option value="-4">⏪ -4x</option>` and `<option value="-2">⏪ -2x</option>` before the existing `-1x` option.
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: Run `npm run test -w packages/studio` to verify existing tests. Then, launch the studio (`npx helios studio`) and visually confirm the new options are present in the speed dropdown and selecting them updates the playback rate.
- **Success Criteria**: The playback speed dropdown contains "-4x" and "-2x" options, and selecting them correctly sets the player's playback rate.
- **Edge Cases**: None
