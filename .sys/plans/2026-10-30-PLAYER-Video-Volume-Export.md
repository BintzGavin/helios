# 2026-10-30 - Video Volume Export Verification

## 1. Context & Goal
- **Objective**: Verify and ensure `ClientSideExporter` correctly respects volume and mute settings for `<video>` elements during client-side export.
- **Trigger**: Vision Gap. Users expect video elements in exported files to match the runtime audio mix (WYSIWYG), but currently, there is no explicit test coverage ensuring `getAudioAssets` correctly prioritizes runtime properties (`volume`, `muted`) over initial attributes for video elements.
- **Impact**: Ensures consistency between the player preview and the exported video file, preventing user frustration where exported videos have incorrect audio levels.

## 2. File Inventory
- **Create**: `packages/player/src/features/video-volume.test.ts` (Verification test file)
- **Modify**: `packages/player/src/features/audio-utils.ts` (If bug is confirmed by test)
- **Read-Only**: `packages/player/src/features/exporter.ts`, `packages/player/src/features/audio-metering.ts`

## 3. Implementation Spec
- **Architecture**:
  - Create a focused unit test that sets up a `<video>` element with conflicting `volume` attribute vs. runtime property.
  - Assert that `getAudioAssets` returns the runtime property value (the "truth" for WYSIWYG).
  - If the test fails (demonstrating that attributes are prioritized incorrectly), update `getAudioAssets` logic in `audio-utils.ts` to check `tag.volume !== 1` (default) or prioritize property access.
- **Pseudo-Code**:
  ```typescript
  // In video-volume.test.ts
  test('prioritizes runtime property over attribute', async () => {
    const video = document.createElement('video');
    video.setAttribute('volume', '0.2'); // Initial attribute
    video.volume = 0.9; // Runtime change

    const assets = await getAudioAssets(document);
    expect(assets[0].volume).toBe(0.9); // Should match runtime
  });
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: Run `npm test packages/player/src/features/video-volume.test.ts`
- **Success Criteria**: The test passes, confirming that the exporter uses the correct volume level.
- **Edge Cases**:
  - Video muted property (should result in effective volume 0 or explicitly muted asset).
  - Video with default volume (1) but attribute set.
