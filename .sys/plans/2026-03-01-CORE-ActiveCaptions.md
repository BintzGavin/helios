# Plan: Implement Active Caption State Management in Helios

## 1. Context & Goal
- **Objective**: Implement state management for active caption cues within the `Helios` class.
- **Trigger**: The README promises "Captions & Audio" support, and while an SRT parser exists (`captions.ts`), there is no logic to retrieve the *currently active* captions based on the timeline.
- **Impact**: Enables developers to easily build video players or renders with subtitles by subscribing to `helios.activeCaptions`.

## 2. File Inventory
- **Modify**: `packages/core/src/index.ts` (Add `activeCaptions` signal, `setCaptions` method, update `HeliosState` and `HeliosOptions`).
- **Modify**: `packages/core/src/captions.ts` (Add `findActiveCues` helper function).
- **Read-Only**: `packages/core/src/signals.ts` (Use `computed` and `signal`).

## 3. Implementation Spec
- **Architecture**:
    - Add `_captions` internal signal to `Helios` initialized from `options.captions`.
    - Add `activeCaptions` computed signal that derives from `_captions` and `_currentFrame`.
    - Use `findActiveCues` (to be implemented in `captions.ts`) for efficient lookup (O(N) linear scan is acceptable for V1, but logic is isolated).
- **Public API Changes**:
    - `HeliosOptions`: Add `captions?: string` (SRT content).
    - `HeliosState`: Add `activeCaptions: CaptionCue[]`.
    - `Helios` class:
        - `setCaptions(captions: string | CaptionCue[])`: Method to update captions.
        - `get activeCaptions(): ReadonlySignal<CaptionCue[]>`: Public signal.
- **Pseudo-Code**:
    ```typescript
    // captions.ts
    export function findActiveCues(cues: CaptionCue[], timeMs: number): CaptionCue[] {
      // Return cues where cue.startTime <= timeMs && cue.endTime >= timeMs
      return cues.filter(cue => cue.startTime <= timeMs && cue.endTime >= timeMs);
    }

    // index.ts
    class Helios {
      private _captions: Signal<CaptionCue[]>;

      constructor(options: HeliosOptions) {
        // ...
        const initialCues = options.captions ? parseSrt(options.captions) : [];
        this._captions = signal(initialCues);
      }

      get activeCaptions() {
        return computed(() => {
           const time = (this._currentFrame.value / this.fps) * 1000;
           return findActiveCues(this._captions.value, time);
        });
      }

      setCaptions(captions: string | CaptionCue[]) {
         const cues = typeof captions === 'string' ? parseSrt(captions) : captions;
         this._captions.value = cues;
      }

      getState() {
         return {
            // ...
            activeCaptions: this.activeCaptions.value
         }
      }
    }
    ```
- **Dependencies**: None (SRT parser already exists).

## 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
    - `activeCaptions` updates when `seek()` is called.
    - `activeCaptions` updates when `setCaptions()` is called.
    - Correctly handles gaps (returns empty array).
    - Correctly handles overlapping cues.
    - Verifies `HeliosState` contains `activeCaptions`.
- **Edge Cases**:
    - Empty SRT string.
    - `startTime` > `duration`.
