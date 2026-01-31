# Plan: Implement Audio Track Management

## 1. Context & Goal
- **Objective**: Implement a track-based audio management system in `Helios` and `DomDriver` to allow independent volume and mute control for groups of audio elements.
- **Trigger**: The V1.x Roadmap calls for "Advanced audio mixing". Currently, Helios only supports global volume/mute.
- **Impact**: This unlocks the ability to mix audio programmatically (e.g., dipping background music while keeping voiceover loud) by assigning `data-helios-track-id` to elements and controlling them via `helios.setAudioTrackVolume()`.

## 2. File Inventory
- **Modify**: `packages/core/src/drivers/TimeDriver.ts` (Update interface signature)
- **Modify**: `packages/core/src/drivers/DomDriver.ts` (Implement track mixing logic)
- **Modify**: `packages/core/src/drivers/WaapiDriver.ts` (Update signature compatibility)
- **Modify**: `packages/core/src/drivers/NoopDriver.ts` (Update signature compatibility)
- **Modify**: `packages/core/src/index.ts` (Add `AudioTrackState` type, `Helios` methods, and signal integration)
- **Modify**: `packages/core/src/helios-audio.test.ts` (Add unit tests for new API and mixing logic)

## 3. Implementation Spec

### Architecture
- **State Management**: Extend `Helios` with a `_audioTracks` signal (Map of ID -> Volume/Muted).
- **Driver Interface**: Pass the track state snapshot to the `TimeDriver` during `update()`.
- **DOM Integration**: `DomDriver` uses `data-helios-track-id` attribute on HTMLMediaElements to look up their specific track settings.
- **Mixing Logic**: Effective Volume = `ElementBaseVolume * GlobalVolume * TrackVolume`. Effective Mute = `ElementBaseMuted || GlobalMuted || TrackMuted`.

### Public API Changes
**New Type in `index.ts`**:
```typescript
export type AudioTrackState = {
  volume: number;
  muted: boolean;
};
```

**Updates to `HeliosState`**:
- Add `audioTracks: Record<string, AudioTrackState>;`

**Updates to `Helios` Class**:
- `setAudioTrackVolume(trackId: string, volume: number): void`
- `setAudioTrackMuted(trackId: string, muted: boolean): void`
- Getter `audioTracks: ReadonlySignal<Record<string, AudioTrackState>>`

### Driver Updates
- `TimeDriver.update` signature becomes:
  ```typescript
  update(
    timeInMs: number,
    options?: {
      isPlaying: boolean;
      playbackRate: number;
      volume?: number;
      muted?: boolean;
      audioTracks?: Record<string, AudioTrackState>; // New
    }
  ): void;
  ```

### Pseudo-Code (DomDriver)
```typescript
// Inside syncMediaElements loop
const trackId = el.getAttribute('data-helios-track-id');
let trackVol = 1;
let trackMuted = false;

if (trackId && options.audioTracks && options.audioTracks[trackId]) {
  trackVol = options.audioTracks[trackId].volume;
  trackMuted = options.audioTracks[trackId].muted;
}

// Calculate effective volume
// mix = elementBase * master * track
const effectiveVol = Math.max(0, Math.min(1, baseVol * masterVolume * trackVol));

// Calculate effective mute
// mute = elementBase || master || track
const effectiveMuted = baseMuted || masterMuted || trackMuted;
```

## 4. Test Plan
- **Verification**: Run `npm test -w packages/core`
- **Success Criteria**:
    1.  New tests in `helios-audio.test.ts` pass.
    2.  `setAudioTrackVolume` correctly updates the `audioTracks` signal.
    3.  `DomDriver` correctly applies volume reduction to elements with `data-helios-track-id` when that track's volume is lowered.
    4.  Elements *without* track ID are unaffected by track changes.
- **Edge Cases**:
    -   Setting volume for a non-existent track ID (should register it).
    -   Track ID exists in DOM but not in Helios state (should default to vol 1, mute false).
    -   Volume clamping (0-1).
