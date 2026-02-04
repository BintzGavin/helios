# Plan: Smart Audio Fades

## 1. Context & Goal
- **Objective**: Update the audio fading logic to calculate fade-out start times relative to the audio clip's specific duration (when known and not looping) rather than the global composition duration.
- **Trigger**: "Smart Audio Fades" gap identified in `.jules/RENDERER.md`. Currently, short audio clips fade out at the end of the video, often resulting in silence-fading instead of clip-fading.
- **Impact**: Enables correct "Use What You Know" behavior for declaratively defined audio clips in the DOM, ensuring `data-helios-fade-out` works as expected for sound effects and non-looping tracks.

## 2. File Inventory
- **Modify**: `packages/renderer/src/types.ts` (Update `AudioTrackConfig` interface)
- **Modify**: `packages/renderer/src/utils/dom-scanner.ts` (Extract duration from DOM elements)
- **Modify**: `packages/renderer/src/utils/FFmpegBuilder.ts` (Implement smart fade logic)
- **Create**: `packages/renderer/tests/verify-smart-audio-fades.ts` (New verification script)

## 3. Implementation Spec

### Architecture
- **Data Flow**: `DomScanner` (Browser) -> `AudioTrackConfig` (Node.js) -> `FFmpegBuilder` (Filter Graph).
- **Logic Change**:
  - In `DomScanner`, read `el.duration`. If finite and positive, include it in the returned track object.
  - In `FFmpegBuilder`, when processing `fadeOutDuration`:
    - IF `track.loop` is TRUE: Use `compositionDuration` (current behavior).
    - ELSE IF `track.duration` is defined:
      - Calculate `clipEndTime = delayMs/1000 + (track.duration - track.seek)`.
      - Calculate `startTime = clipEndTime - track.fadeOutDuration`.
      - Ensure `startTime` is not negative.
    - ELSE: Use `compositionDuration` (fallback).

### Pseudo-Code

**types.ts**:
```typescript
interface AudioTrackConfig {
  // ... existing fields
  duration?: number; // Duration of the source audio in seconds
}
```

**dom-scanner.ts**:
```typescript
// Inside loop
const duration = el.duration;
// ...
tracks.push({
  // ...
  duration: (Number.isFinite(duration) && duration > 0) ? duration : undefined
});
```

**FFmpegBuilder.ts**:
```typescript
if (track.fadeOutDuration && track.fadeOutDuration > 0) {
  let endTime = compositionDuration;

  if (!track.loop && track.duration) {
    // Calculate when the clip ends on the timeline
    // Note: delayMs is the start time on timeline
    // effectiveDuration = (track.duration - track.seek) / playbackRate
    // But afade works on stream time.
    // If using adelay, the stream includes the delay as silence.
    // Stream timeline: [0..delay][audio content]
    // The audio content ends at delay + effectiveDuration.

    const playbackRate = track.playbackRate || 1.0;
    const effectiveDuration = (track.duration - (track.seek || 0)) / playbackRate;

    // The timestamp in the stream where the audio ends
    // adelay adds silence, shifting the audio start.
    endTime = (delayMs / 1000) + effectiveDuration;
  }

  let startTime = endTime - track.fadeOutDuration;
  if (startTime < 0) startTime = 0;

  filters.push(`afade=t=out:st=${startTime}:d=${track.fadeOutDuration}`);
}
```

## 4. Test Plan
- **Verification**: Run `npx tsx packages/renderer/tests/verify-smart-audio-fades.ts`.
- **Scenario**:
  - Mock a page with `<audio src="short.mp3" data-helios-fade-out="1">`.
  - Inject script to force `HTMLAudioElement.prototype.duration` to `5.0`.
  - Set composition duration to `10.0`.
  - Run `DomStrategy` to generate args.
  - **Assert**: FFmpeg args contain `afade=t=out:st=4:d=1` (5s - 1s = 4s).
  - **Negative Assert**: Ensure it does NOT contain `st=9` (10s - 1s).
- **Edge Cases**:
  - Looping track (should still target composition end).
  - Missing duration (fallback to composition end).
  - Playback rate != 1.0 (duration should scale).
  - Seek > 0 (duration should reduce).
