# Spec: Implement Audio Fade Easing

#### 1. Context & Goal
- **Objective**: Enable WYSIWYG audio fades in client-side export by supporting custom easing curves.
- **Trigger**: Audio fades in export are currently linear-only, while preview (`DomDriver`) supports custom easing via `data-helios-fade-easing`.
- **Impact**: Ensures the exported video audio matches the preview exactly.

#### 2. File Inventory
- **Modify**: `packages/player/src/features/audio-utils.ts`
  - Add `fadeEasing` to `AudioAsset` interface.
  - Update `getAudioAssets` to extract `data-helios-fade-easing` and `fadeEasing` from metadata.
  - Update `mixAudio` to implement curve-based fading using `setValueCurveAtTime`.

#### 3. Implementation Spec
- **Architecture**: Use `OfflineAudioContext.setValueCurveAtTime` with sampled values from `@helios-project/core`'s `Easing` functions to replicate the `DomDriver` fade logic.
- **Public API Changes**: None (Internal `mixAudio` update). `AudioAsset` interface updated but it is internal to the package features.
- **Dependencies**: `@helios-project/core` (for `Easing`).

### Pseudo-Code

```typescript
import { Easing, EasingFunction } from "@helios-project/core";

// 1. Update Interface
export interface AudioAsset {
  // ... existing
  fadeEasing?: string;
}

// 2. Helper to resolve easing (copied/adapted from DomDriver)
function resolveEasing(name?: string): EasingFunction {
  if (!name || name === 'linear') return Easing.linear;
  // Parse "group.type" (e.g. "quad.in")
  // Return Easing function or linear fallback
}

// 3. Update getAudioAssets
// Extract `data-helios-fade-easing` from DOM
// Extract `fadeEasing` from metadataTracks

// 4. Update mixAudio
// In the fade logic block:
const easingFn = resolveEasing(asset.fadeEasing);

// Fade In
if (fadeInDuration > 0) {
    if (asset.fadeEasing && asset.fadeEasing !== 'linear') {
        // Generate Float32Array curve (e.g. 50 samples)
        // t goes from (startOffset / fadeInDuration) -> 1
        // val = targetVolume * easingFn(t)
        // use setValueCurveAtTime(curve, playbackStart, durationRemaining)
    } else {
        // Existing linear ramp logic (which handles startOffset via interpolation)
    }
}

// Fade Out
if (fadeOutDuration > 0) {
    // Determine fadeOutStart relative to clip start (adjusted for startOffset)
    // t goes 0 -> 1 (progress 1 -> 0)
    // val = targetVolume * easingFn(1 - t)
    // Handle startOffset pushing us into fade out region if needed
    // use setValueCurveAtTime(curve, fadeOutStart, fadeOutDuration)
}
```

#### 4. Test Plan
- **Verification**: `npm run build -w packages/player`
- **Success Criteria**: Build succeeds. Code logic mirrors `DomDriver` implementation.
- **Edge Cases**:
  - Invalid easing name -> Linear fallback.
  - `startOffset` > 0 (clip starts late) -> Fade curve must be correctly windowed.
  - Zero duration -> No fade.
