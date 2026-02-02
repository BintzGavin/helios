# 📋 STUDIO: Timeline Audio Visualization

#### 1. Context & Goal
- **Objective**: Visualize audio tracks on the Studio Timeline to provide visual feedback on the soundscape structure.
- **Trigger**: Vision gap (Timeline currently lacks audio visualization) and Memory confirming `AudioTrackMetadata` availability in Core state.
- **Impact**: Users can see where audio clips start/end relative to the video, improving the editing and review experience. This closes a significant gap in the "Timeline" feature set.

#### 2. File Inventory
- **Modify**:
    - `packages/studio/src/context/StudioContext.tsx`: Update `PlayerState` interface to include `audioTracks` and update default state.
    - `packages/studio/src/components/Timeline.tsx`: Implement rendering logic for audio tracks.
    - `packages/studio/src/components/Timeline.css`: Add styling for audio track elements.
- **Read-Only**:
    - `packages/studio/src/App.tsx`: Reference for state subscription logic.

#### 3. Implementation Spec
- **Architecture**:
    - Leverage `HeliosState` from Core, which exposes `audioTracks: AudioTrackMetadata[]` (containing `id`, `startTime`, `duration`, `volume`, `muted`).
    - Propagate this data through `StudioContext`'s `playerState`.
    - `Timeline` component reads `playerState.audioTracks` and renders distinct blocks for each track in a dedicated area.

- **Data Structures**:
    ```typescript
    // In StudioContext.tsx
    // (Import AudioTrackMetadata from @helios-project/core if available, otherwise define locally matching Core's shape)
    export interface AudioTrackMetadata {
        id: string;
        startTime: number; // ms
        duration: number; // ms
        volume?: number;
        muted?: boolean;
    }

    export interface PlayerState {
        // ... existing properties
        audioTracks: AudioTrackMetadata[];
    }

    // Update DEFAULT_PLAYER_STATE to include audioTracks: []
    ```

- **UI Changes (Timeline.tsx)**:
    - Add a "Timeline Audio Track" container (`div.timeline-audio-area`) below the main video track (`div.timeline-track`).
    - Iterate over `audioTracks` array.
    - For each track, render a `div.timeline-audio-clip`.
    - **Positioning**:
        - `left`: `(startTime / 1000 * fps) / totalFrames * 100%` (or reuse `getPercent` helper).
        - `width`: `(duration / 1000 * fps) / totalFrames * 100%`.
    - **Styling**:
        - Distinct color (e.g., green/blue) to differentiate from video/captions.
        - `overflow: hidden`, `text-overflow: ellipsis` for labels (track ID).
        - Handle overlapping clips by allowing them to overlap visually (z-index) or stacking if height permits (MVP: simple overlap).

#### 4. Test Plan
- **Verification**:
    1. Run `npx helios studio`.
    2. Load a composition known to have audio (e.g., `examples/promo-video` or `examples/music-video`).
    3. Observe the Timeline.
- **Success Criteria**:
    - Audio clips appear as colored blocks on the timeline.
    - The blocks align correctly with the audio start time and duration (verify by scrubbing and listening).
    - If no audio tracks exist, the audio area is empty/hidden or shows "No Audio".
- **Edge Cases**:
    - **No Audio**: Timeline should look normal, potentially with an empty audio track area.
    - **Overlapping Audio**: Clips should be visible (overlapping `div`s).
    - **Short Audio**: Very short clips (e.g. sound effects) should be visible (min-width logic might be needed, similar to captions).
