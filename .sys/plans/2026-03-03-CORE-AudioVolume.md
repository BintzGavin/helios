# 1. Context & Goal
- **Objective**: Implement relative audio volume and mute handling in `DomDriver`.
- **Trigger**: The current implementation of `DomDriver` treats `Helios` volume/mute as absolute overrides, destroying the individual mix of audio elements in a composition.
- **Impact**: This enables "Advanced Audio Mixing" by allowing `Helios` to act as a Master Fader/Mute while preserving the relative volume and mute states of individual tracks defined by the user (via HTML attributes or other scripts).

# 2. File Inventory
- **Modify**: `packages/core/src/drivers/DomDriver.ts` - Implement `WeakMap` state tracking for volume and mute.
- **Modify**: `packages/core/src/drivers/DomDriver.test.ts` - Add test cases for relative volume mixing and mute preservation.

# 3. Implementation Spec
- **Architecture**:
  - Use a `WeakMap<HTMLMediaElement, TrackState>` to store the "base" (user-intended) volume and mute state for each element.
  - `TrackState` interface: `{ baseVolume: number, lastSetVolume: number, baseMuted: boolean, lastSetMuted: boolean }`.
  - In `syncMediaElements`, compare the element's current state against `lastSetX`.
  - If different, update `baseX` (user changed it).
  - Calculate `effectiveVolume = baseVolume * masterVolume` and `effectiveMuted = baseMuted || masterMuted`.
  - Apply effective values and update `lastSetX`.

- **Pseudo-Code**:
```typescript
interface TrackState {
  baseVolume: number;
  lastSetVolume: number;
  baseMuted: boolean;
  lastSetMuted: boolean;
}

class DomDriver {
  private trackStates = new WeakMap<HTMLMediaElement, TrackState>();

  syncMediaElements(...) {
     elements.forEach(el => {
        let state = this.trackStates.get(el);

        // VOLUME LOGIC
        const currentVol = el.volume;
        let baseVol = currentVol;
        if (state) {
           if (abs(currentVol - state.lastSetVolume) > EPSILON) {
              baseVol = currentVol; // External change
           } else {
              baseVol = state.baseVolume;
           }
        }

        const effectiveVol = baseVol * masterVol;
        if (abs(el.volume - effectiveVol) > EPSILON) el.volume = effectiveVol;

        // MUTE LOGIC
        const currentMuted = el.muted;
        let baseMuted = currentMuted;
        if (state) {
           if (currentMuted !== state.lastSetMuted) {
              baseMuted = currentMuted; // External change
           } else {
              baseMuted = state.baseMuted;
           }
        }

        const effectiveMuted = baseMuted || masterMuted;
        if (el.muted !== effectiveMuted) el.muted = effectiveMuted;

        this.trackStates.set(el, {
           baseVolume: baseVol,
           lastSetVolume: effectiveVol,
           baseMuted: baseMuted,
           lastSetMuted: effectiveMuted
        });
     })
  }
```

- **Dependencies**: None.

# 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
  - `DomDriver.test.ts` passes.
  - New test `should preserve relative volumes` confirms that an element with volume 0.5 becomes 0.25 when master is 0.5.
  - New test `should respect external volume changes` confirms that user updates to volume are captured and scaled.
  - New test `should preserve individual mute state` confirms that toggling master mute off restores the element's previous mute state.
