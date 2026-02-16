# 2026-02-16-PLAYER-VideoAudioExport.md

#### 1. Context & Goal
- **Objective**: Update `getAudioAssets` to include `<video>` elements in audio asset discovery, enabling audio control and export for video sources.
- **Trigger**: Vision Gap - `<video>` elements are currently ignored by the audio asset discovery logic, causing missing audio in client-side exports and missing controls in the Audio Menu.
- **Impact**: Enables users to export compositions with video sound and control individual video track volumes via the player UI.

#### 2. File Inventory
- **Modify**:
  - `packages/player/src/features/audio-utils.ts`: Update `getAudioAssets` query selector to include `video`.
  - `packages/player/src/features/audio-utils.test.ts`: Add test cases for `<video>` element discovery.
- **Read-Only**: `packages/player/src/features/exporter.ts` (consumer), `packages/player/src/features/audio-fader.ts` (reference).

#### 3. Implementation Spec
- **Architecture**: Extend the existing DOM query in `getAudioAssets` to select `audio, video` instead of just `audio`.
- **Pseudo-Code**:
  ```typescript
  // In getAudioAssets
  const elements = Array.from(doc.querySelectorAll('audio, video'));
  // Iterate and extract attributes (src, volume, muted, loop, etc.)
  // Reuse existing logic for ID generation and state merging
  ```
- **Public API Changes**: None (internal logic update).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm run test -w packages/player` to ensure `getAudioAssets` tests pass, including new video test cases.
- **Success Criteria**:
  - `getAudioAssets` returns assets for `<video>` elements.
  - Video assets respect `data-helios-track-id`, `volume`, `muted`, and other attributes.
- **Edge Cases**:
  - Video without `src`.
  - Video with `muted` attribute (should result in `muted: true`).
  - Video with `volume` attribute vs property.
