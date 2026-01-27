# 2026-03-16-CORE-Expose-Captions

## 1. Context & Goal
- **Objective**: Expose the full list of caption cues in `HeliosState` and allow `HeliosOptions` to accept structured caption data.
- **Trigger**: The Studio application requires access to the full caption track to visualize it on the timeline, but `Helios` currently only exposes the currently active cues.
- **Impact**: Unlocks the "Captions Track" feature in Studio and enables programmatic introspection of the full subtitle content.

## 2. File Inventory
- **Modify**: `packages/core/src/index.ts` (Update `HeliosState`, `HeliosOptions`, and `Helios` class)
- **Read-Only**: `packages/core/src/captions.ts` (For type definitions)

## 3. Implementation Spec
- **Architecture**:
  - Update `HeliosState` to include `captions: CaptionCue[]`.
  - Update `HeliosOptions.captions` to accept `string | CaptionCue[]`.
  - Expose the internal `_captions` signal as a public readonly signal `captions`.
  - Update `Helios` constructor to handle array input for captions.
  - Update `getState()` to return the full caption list.

- **Pseudo-Code**:
  ```typescript
  // packages/core/src/index.ts

  export type HeliosState = {
    // ... existing props
    captions: CaptionCue[]; // Add this
    activeCaptions: CaptionCue[];
  };

  export interface HeliosOptions {
    // ... existing props
    captions?: string | CaptionCue[]; // Update type
  }

  export class Helios {
    // ...
    // Public Readonly Signals
    public get captions(): ReadonlySignal<CaptionCue[]> { return this._captions; }

    constructor(options: HeliosOptions) {
      // ...
      // Handle string OR array
      const initialCaptions = options.captions
        ? (typeof options.captions === 'string' ? parseSrt(options.captions) : options.captions)
        : [];
      // ...
    }

    public getState(): Readonly<HeliosState> {
      return {
        // ...
        captions: this._captions.value, // Add this
        activeCaptions: this._activeCaptions.value,
      };
    }
  }
  ```

## 4. Test Plan
- **Verification**: Run `npm test -w packages/core` to ensure no regressions.
- **New Tests**: Add test cases to `packages/core/src/index.test.ts`:
  - `should expose full captions list in state`: Verify `getState().captions` returns all cues.
  - `should accept CaptionCue[] in constructor`: Verify passing array works.
  - `should update full captions list via setCaptions`: Verify `getState().captions` updates.
- **Success Criteria**: All tests pass, and `HeliosState` includes the full caption list.
