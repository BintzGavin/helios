# 2026-08-15-CORE-ActiveClips

#### 1. Context & Goal
- **Objective**: Integrate `HeliosComposition` schema (timeline/tracks/clips) into the `Helios` runtime to expose a reactive `activeClips` signal.
- **Trigger**: "Schema-First Development" & "Utility vs Runtime Integration" learnings. The core engine defines `HeliosComposition` types but does not yet ingest or process them, forcing consumers to manually implement timeline logic.
- **Impact**: Enables declarative composition definition. Agents and users can define a JSON timeline, and Helios will automatically compute which clips are active at the current time, simplifying the render loop for Studio and Players.

#### 2. File Inventory
- **Modify**: `packages/core/src/types.ts` (Update `HeliosOptions` to extend `HeliosComposition` or include `timeline`)
- **Modify**: `packages/core/src/Helios.ts` (Implement `_timeline` signal, `activeClips` computed, `setTimeline` method, and update `HeliosState`)
- **Create**: `packages/core/src/timeline.test.ts` (Verify active clips logic)

#### 3. Implementation Spec
- **Architecture**:
  - Update `HeliosOptions` to accept `timeline?: HeliosTimeline`.
  - Store the timeline in a `Signal<HeliosTimeline | undefined>`.
  - Implement `activeClips` as a `Computed<HeliosClip[]>` that filters all clips in the timeline based on `currentTime`.
  - The logic should be: `active = clip.start <= currentTime < (clip.start + clip.duration)`.
  - Expose `activeClips` in `HeliosState` interface and `getState()` return value.
  - Add `setTimeline(timeline: HeliosTimeline)` method to update the timeline at runtime.

- **Pseudo-Code**:
  ```typescript
  // In packages/core/src/types.ts
  export interface HeliosOptions<TInputProps> extends HeliosConfig<TInputProps> {
    // Add timeline support
    timeline?: HeliosTimeline;
    // ... existing properties
  }

  // In packages/core/src/Helios.ts
  class Helios {
    private _timeline: Signal<HeliosTimeline | undefined>;
    private _activeClips: ReadonlySignal<HeliosClip[]>;

    constructor(options) {
      // ... existing init
      this._timeline = signal(options.timeline);

      this._activeClips = computed(() => {
        const time = this._currentTime.value;
        const timeline = this._timeline.value;
        if (!timeline || !timeline.tracks) return [];

        const active: HeliosClip[] = [];
        for (const track of timeline.tracks) {
          for (const clip of track.clips) {
             const end = clip.start + clip.duration;
             if (time >= clip.start && time < end) {
               active.push(clip);
             }
          }
        }
        return active;
      });
    }

    public get activeClips() { return this._activeClips; }

    public setTimeline(timeline: HeliosTimeline) {
      this._timeline.value = timeline;
    }

    public getState() {
      return {
        // ... existing state
        activeClips: this._activeClips.value
      };
    }
  }
  ```

- **Public API Changes**:
  - `HeliosOptions` now includes `timeline?: HeliosTimeline`.
  - `Helios` class now exposes `activeClips: ReadonlySignal<HeliosClip[]>` and `setTimeline(timeline: HeliosTimeline)`.
  - `HeliosState` now includes `activeClips: HeliosClip[]`.

- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm test -w packages/core` to execute the new test suite and ensure no regressions.
- **Success Criteria**:
  - `packages/core/src/timeline.test.ts` passes, confirming `activeClips` updates correctly as `seek()` is called.
  - `packages/core/src/index.test.ts` passes (regression check).
- **Edge Cases**:
  - Timeline undefined (should return empty array).
  - Empty timeline (no tracks).
  - Clips with zero duration.
  - Clips starting exactly at `currentTime` (should be active).
  - Clips ending exactly at `currentTime` (should be inactive, exclusive end).
