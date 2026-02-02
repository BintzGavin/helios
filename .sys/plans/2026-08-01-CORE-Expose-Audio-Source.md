# Spec: Expose Audio Source in Metadata

#### 1. Context & Goal
- **Objective**: Expose the source URL (`src`) of audio tracks in the `AudioTrackMetadata` interface.
- **Trigger**: Roadmap item "Client-Side WebCodecs as Primary Export" requires access to audio sources for muxing without DOM scraping.
- **Impact**: Enables `packages/studio` (Timeline visualization) and `packages/player` (Client-side export) to access audio data directly from the Core state.

#### 2. File Inventory
- **Modify**: `packages/core/src/drivers/TimeDriver.ts` (Add `src` to interface)
- **Modify**: `packages/core/src/drivers/DomDriver.ts` (Populate `src`)
- **Modify**: `packages/core/src/drivers/DomDriver-metadata.test.ts` (Verify `src` discovery)

#### 3. Implementation Spec
- **Architecture**: Update `AudioTrackMetadata` interface to include `src`. `DomDriver` extracts it from `HTMLMediaElement`.
- **Pseudo-Code**:
  ```typescript
  // TimeDriver.ts
  export interface AudioTrackMetadata {
    // ...
    src: string;
  }

  // DomDriver.ts
  private rebuildDiscoveredTracks() {
    // ...
    const src = el.currentSrc || el.src || '';
    // ...
    this.discoveredTracks.set(id, {
        // ...
        src
    });
  }
  ```
- **Public API Changes**: `AudioTrackMetadata` gains `src` property.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**: `DomDriver-metadata.test.ts` passes with new assertions checking for `src`.
- **Edge Cases**: Empty `src` should be empty string.
