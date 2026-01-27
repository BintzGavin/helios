# 2026-03-01-PLAYER-ClientSideAudioVolume.md

## 1. Context & Goal
- **Objective**: Support `volume` and `muted` properties in Client-Side Audio Export.
- **Trigger**: Vision gap - Client-side export ignores audio volume/mute state, breaking parity with preview.
- **Impact**: Exported videos will respect the volume levels and mute states of `<audio>` elements in the DOM.

## 2. File Inventory
- **Modify**: `packages/player/src/features/audio-utils.ts`
- **Modify**: `packages/player/src/features/exporter.test.ts`
- **Read-Only**: `packages/player/src/features/exporter.ts`

## 3. Implementation Spec
- **Architecture**: Extend `AudioAsset` interface and update extraction/mixing logic.
- **Public API Changes**:
  - `AudioAsset` interface in `audio-utils.ts` adds:
    - `volume: number`
    - `muted: boolean`
- **Pseudo-Code**:
  - In `getAudioAssets`:
    - Iterate over `audio` tags.
    - Read `tag.volume` and `tag.muted`.
    - Include these in the returned `AudioAsset` objects.
  - In `mixAudio`:
    - Create a `GainNode` for each asset: `const gain = ctx.createGain()`.
    - Set `gain.gain.value = asset.muted ? 0 : asset.volume`.
    - Chain: `source.connect(gain)`.
    - Chain: `gain.connect(ctx.destination)`.

## 4. Test Plan
- **Verification**: Run existing tests: `npm test -w packages/player`
- **Success Criteria**:
  - `packages/player/src/features/exporter.test.ts` must pass.
  - Test coverage for audio export should verify that `createGain` is called and set correctly.
- **Edge Cases**:
  - Volume 0 vs Muted.
  - Volume > 1 (HTMLMediaElement clamps to 1, but we should handle it safely).
  - Missing volume/muted (default to 1/false).
