# Plan: Expose Audio Fade Metadata

## 1. Context & Goal
- **Objective**: Expose `fadeInDuration` and `fadeOutDuration` in `AudioTrackMetadata` to support declarative audio fades.
- **Trigger**: Vision Gap - "Parity between Preview and Render". `DomDriver` supports fades for playback via attributes, but this data is hidden from the `availableAudioTracks` signal, preventing the Renderer from generating matching audio filters.
- **Impact**: Enables `renderer` to generate frame-accurate audio fades (via FFmpeg) that match the DOM Preview.

## 2. File Inventory
- **Modify**: `packages/core/src/drivers/TimeDriver.ts`
  - Update `AudioTrackMetadata` interface to include optional `fadeInDuration` and `fadeOutDuration`.
- **Modify**: `packages/core/src/drivers/DomDriver.ts`
  - Update `rebuildDiscoveredTracks` to parse `data-helios-fade-in` and `data-helios-fade-out`.
  - Update `addScope` to include these attributes in `MutationObserver` filter.
- **Modify**: `packages/core/src/drivers/DomDriver-metadata.test.ts`
  - Add tests for fade attribute discovery and updates.

## 3. Implementation Spec

### Architecture
Extend `AudioTrackMetadata` to include fade durations. `DomDriver` becomes the source of truth, extracting these values from `data-helios-fade-in/out` attributes and emitting them via the `availableAudioTracks` signal.

### Pseudo-Code

#### `packages/core/src/drivers/TimeDriver.ts`
```typescript
export interface AudioTrackMetadata {
  id: string;
  startTime: number;
  duration: number;
  fadeInDuration?: number; // Optional, default 0
  fadeOutDuration?: number; // Optional, default 0
}
```

#### `packages/core/src/drivers/DomDriver.ts`
- **`rebuildDiscoveredTracks`**:
  - `const fadeIn = parseFloat(el.getAttribute('data-helios-fade-in') || '0');`
  - `const fadeOut = parseFloat(el.getAttribute('data-helios-fade-out') || '0');`
  - Add to `AudioTrackMetadata` object.
  - Ensure `deepEqual` check compares these new fields to avoid unnecessary updates.
- **`addScope`**:
  - Update `observer.observe` options: `attributeFilter: ['data-helios-track-id', 'data-helios-offset', 'data-helios-fade-in', 'data-helios-fade-out']`.

### Public API Changes
- **Breaking Change**: None.
- `AudioTrackMetadata` interface expanded.

## 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
  - `DomDriver-metadata.test.ts` passes.
  - New Test: `should discover fade metadata` checks correct parsing of attributes.
  - New Test: `should update metadata on fade attribute change` checks reactivity.
- **Edge Cases**:
  - Attributes missing (should be undefined or 0).
  - Attributes invalid (NaN -> 0).
