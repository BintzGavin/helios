# Plan: Implement Audio Track Metadata

## 1. Context & Goal
- **Objective**: Expand the `availableAudioTracks` signal to include `startTime` and `duration` metadata for each track.
- **Trigger**: The current `DomDriver` only exposes track IDs (`string[]`), preventing the Studio from visualizing audio clips on the timeline (Vision Gap: "Studio IDE").
- **Impact**: Enables rich timeline visualization in Helios Studio by providing the necessary temporal data for audio tracks (where they start and how long they are).

## 2. File Inventory
- **Modify**: `packages/core/src/drivers/TimeDriver.ts`
  - Update `DriverMetadata` interface.
  - Export `AudioTrackMetadata` interface.
- **Modify**: `packages/core/src/drivers/DomDriver.ts`
  - Update `scanAndAdd` to extract offset and duration.
  - Update `scanAndRemove` to cleanup listeners.
  - Add `durationchange` event listeners to media elements.
  - Update `MutationObserver` to watch `data-helios-offset`.
- **Modify**: `packages/core/src/Helios.ts`
  - Update `HeliosState` type.
  - Update `_availableAudioTracks` signal.
  - Update `diagnose` return type if necessary (unlikely, but check).
- **Create**: `packages/core/src/drivers/DomDriver-metadata.test.ts`
  - Test case for metadata extraction and updates.

## 3. Implementation Spec

### Architecture
We will replace the simple `string[]` of IDs with a structured `AudioTrackMetadata[]`. The `DomDriver` will become the source of truth for this metadata, actively monitoring DOM attributes and media state (`duration`) to keep the `Helios` state in sync.

### Pseudo-Code

#### `packages/core/src/drivers/TimeDriver.ts`
```typescript
export interface AudioTrackMetadata {
  id: string;
  startTime: number; // derived from data-helios-offset
  duration: number;  // derived from element.duration
}

export interface DriverMetadata {
  audioTracks?: AudioTrackMetadata[]; // Changed from string[]
}
```

#### `packages/core/src/drivers/DomDriver.ts`
- **Class Properties**:
  - Add `private trackMetadata = new Map<string, AudioTrackMetadata>();` (or derive on fly)
  - Need to map `Element -> Metadata` or `ID -> Metadata`. Since multiple elements *could* share an ID (invalid but possible), we should stick to unique IDs. `DomDriver` already assumes unique IDs for control.

- **Logic**:
  - `scanAndAdd(node)`:
    - When `data-helios-track-id` is found:
      - Read `data-helios-offset` (default 0).
      - Read `element.duration` (default 0).
      - Add `durationchange` listener to element -> triggers `rebuildDiscoveredTracks()`.
  - `scanAndRemove(node)`:
    - Remove listeners.
  - `rebuildDiscoveredTracks()`:
    - Iterate `this.mediaElements`.
    - Build `AudioTrackMetadata[]`.
    - Check for deep equality change (IDs + start + duration) before emitting to avoid signal thrashing.
  - `MutationObserver`:
    - Add `data-helios-offset` to `attributeFilter`.

#### `packages/core/src/Helios.ts`
- Update `HeliosState` interface: `availableAudioTracks: AudioTrackMetadata[]`.
- Update `_availableAudioTracks` signal type.
- Update `constructor` to handle the new type in `driver.subscribeToMetadata`.

### Public API Changes
- **Breaking Change**: `helios.availableAudioTracks` now returns `AudioTrackMetadata[]` instead of `string[]`.
- `DriverMetadata.audioTracks` type change.

## 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
  - Create `packages/core/src/drivers/DomDriver-metadata.test.ts`:
    1.  **Discovery**: Add `<audio data-helios-track-id="bgm" data-helios-offset="5">`. Assert `availableAudioTracks` contains `{ id: 'bgm', startTime: 5, duration: 0 }`.
    2.  **Duration Update**: Dispatch `durationchange` on the audio element (set `duration` mock). Assert signal updates with correct duration.
    3.  **Offset Update**: Change `data-helios-offset` to "10". Assert signal updates to `startTime: 10`.
    4.  **Removal**: Remove element. Assert track is removed.
- **Edge Cases**:
  - `NaN` duration (e.g. streaming) -> handled (default to 0).
  - Missing `data-helios-offset` -> defaults to 0.
