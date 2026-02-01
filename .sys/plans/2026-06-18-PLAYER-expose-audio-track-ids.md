# 2026-06-18-PLAYER-expose-audio-track-ids

#### 1. Context & Goal
- **Objective**: Expose the `id` property in `AudioAsset` and populate it from `data-helios-track-id` or standard `id` attribute in `getAudioAssets`.
- **Trigger**: Journal entry `v0.51.0` identified a gap where `HeliosController.setAudioTrackVolume` requires a track ID, but `getAudioTracks` (which uses `getAudioAssets`) does not return one, making it impossible for generic players (like Studio) to control specific tracks.
- **Impact**: Unblocks the implementation of audio track mixing controls in Helios Studio and provides a standard way to identify audio assets in the Player API.

#### 2. File Inventory
- **Create**: None
- **Modify**:
  - `packages/player/src/features/audio-utils.ts`: Update `AudioAsset` interface and `getAudioAssets` implementation.
  - `packages/player/src/features/audio-utils.test.ts`: Add tests for ID extraction logic.
- **Read-Only**:
  - `packages/player/src/features/exporter.ts`: To ensure `ClientSideExporter` is not broken (it iterates assets, so should be fine).
  - `packages/player/src/controllers.ts`: To confirm `HeliosController` interface compatibility.

#### 3. Implementation Spec
- **Architecture**: Extend the existing `getAudioAssets` utility function to extract ID information from DOM elements. This follows the existing pattern of extracting `volume`, `muted`, etc.
- **Pseudo-Code**:
  ```typescript
  // packages/player/src/features/audio-utils.ts

  export interface AudioAsset {
    // ... existing fields
    id: string; // New field
  }

  export async function getAudioAssets(doc: Document): Promise<AudioAsset[]> {
    // ...
    return Promise.all(audioTags.map(async (tag, index) => {
       // ... existing extraction ...

       // ID Extraction Priority:
       // 1. data-helios-track-id (Used by DomDriver for control)
       // 2. id attribute (Standard DOM)
       // 3. Fallback: generated "track-${index}" (Stable fallback for listing)

       const id = tag.getAttribute('data-helios-track-id')
                  || tag.id
                  || `track-${index}`;

       return {
         // ...
         id,
         // ...
       };
    }));
  }
  ```
- **Public API Changes**: `AudioAsset` interface now includes `id: string`. This affects the return type of `HeliosController.getAudioTracks()`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm test -w packages/player`
- **Success Criteria**:
  - Unit tests in `packages/player/src/features/audio-utils.test.ts` pass.
  - New test case confirms `getAudioAssets` returns correct `id` when `data-helios-track-id` is present.
  - New test case confirms fallback to `id` attribute.
  - New test case confirms fallback to generated ID when attributes are missing.
- **Edge Cases**:
  - Multiple tracks with missing IDs (ensure generated IDs are unique per call).
  - Empty document (returns empty array).
