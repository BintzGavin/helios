#### 1. Context & Goal
- **Objective**: Update client-side export to include audio tracks from `<video>` elements.
- **Trigger**: Vision gap identified - `AudioMeter` (preview) supports video audio, but `ClientSideExporter` (export) does not.
- **Impact**: Ensures that compositions using video files with audio are correctly exported with sound, matching the preview experience.

#### 2. File Inventory
- **Create**: None.
- **Modify**:
    - `packages/player/src/features/audio-utils.ts`: Update `getAudioAssets` to query `audio, video`.
    - `packages/player/src/features/audio-utils.test.ts`: Add test case for `<video>` element discovery.
- **Read-Only**: `packages/player/src/features/exporter.ts`, `packages/player/src/features/audio-metering.ts`

#### 3. Implementation Spec
- **Architecture**: Extend the DOM query selector in `getAudioAssets` to include `video` elements alongside `audio`. Cast elements to `HTMLMediaElement` to access shared properties (`src`, `volume`, `muted`, `loop`).
- **Pseudo-Code**:
  ```typescript
  // packages/player/src/features/audio-utils.ts
  export async function getAudioAssets(...) {
    const elements = doc.querySelectorAll('audio, video'); // Changed from 'audio'
    const assetsPromises = Array.from(elements).map(el => {
       const mediaEl = el as HTMLMediaElement;
       // ... existing logic using mediaEl ...
    });
    // ...
  }
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm run test` in `packages/player`.
- **Success Criteria**:
    - New test `should include video elements` passes.
    - All existing tests pass.
- **Edge Cases**: Verify attributes like `data-helios-fade-in` are correctly parsed from video elements.
