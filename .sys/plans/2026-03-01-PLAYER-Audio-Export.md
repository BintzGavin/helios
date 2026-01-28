#### 1. Context & Goal
- **Objective**: Support `loop` and `data-start-time` attributes for audio elements during client-side export to enable audio sequencing and looping.
- **Trigger**: Vision gap "Client-Side Audio Mixing" is primitive; currently, all audio tracks are blindly mixed at time zero without looping support.
- **Impact**: Enables users to create compositions with background loops and sequenced sound effects that export correctly.

#### 2. File Inventory
- **Create**:
  - `packages/player/src/features/audio-utils.test.ts`: Unit tests for audio utilities.
- **Modify**:
  - `packages/player/src/features/audio-utils.ts`: Update `getAudioAssets` and `mixAudio` to handle new attributes.
- **Read-Only**:
  - `packages/player/src/features/exporter.ts`: Consumer of `mixAudio`.

#### 3. Implementation Spec
- **Architecture**:
  - Update `AudioAsset` interface to carry `loop` (boolean) and `startTime` (number) metadata.
  - `getAudioAssets` becomes the parser, extracting these values from DOM attributes.
  - `mixAudio` becomes the sequencer, applying these values to the `OfflineAudioContext` nodes.

- **Pseudo-Code**:
  - **In `packages/player/src/features/audio-utils.ts`**:
    - Update `AudioAsset` interface to include optional `loop` and `startTime`.
    - In `getAudioAssets`:
      - For each audio element:
        - Read `loop` property (standard boolean).
        - Read `data-start-time` attribute (custom float).
        - Parse `data-start-time` to float (default to 0 if missing/invalid).
        - Include these in the returned `AudioAsset` object.
    - In `mixAudio`:
      - When creating `BufferSource`:
        - Set `source.loop = asset.loop || false`.
        - Set `source.start(asset.startTime || 0)`.

- **Public API Changes**:
  - `getAudioAssets` returns `Promise<AudioAsset[]>` with expanded `AudioAsset` type.
  - No breaking changes to `mixAudio` signature, but behavior changes to respect new fields.

- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm test packages/player/src/features/audio-utils.test.ts`
- **Success Criteria**:
  - `getAudioAssets` correctly parses `loop="true"` and `data-start-time="5.5"`.
  - `mixAudio` calls `source.start(5.5)` and sets `source.loop = true`.
- **Edge Cases**:
  - Missing `data-start-time` (should default to 0).
  - Invalid `data-start-time` (e.g., "abc", should default to 0).
  - `loop` attribute present but false (should be false).
