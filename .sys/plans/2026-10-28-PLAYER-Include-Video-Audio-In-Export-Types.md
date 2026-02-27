# Context & Goal
- **Objective**: Fix TypeScript compilation errors in `packages/player/src/features/audio-utils.ts` related to querying `<audio>` and `<video>` elements.
- **Trigger**: The recent update to `getAudioAssets` in `packages/player` included querying `<video>` elements (`querySelectorAll('audio, video')`), but the resulting NodeList infers a generic `Element` type. This causes TypeScript errors when accessing properties like `volume`, `muted`, `src`, and `loop`, which are specific to `HTMLMediaElement`.
- **Impact**: Resolving this will allow the `packages/player` package to build successfully and ensure `<video>` elements are properly included in the audio export process.

# File Inventory
- **Modify**: `packages/player/src/features/audio-utils.ts` (Update type assertions in the element mapping)
- **Modify**: `packages/player/src/features/audio-utils.test.ts` (Add tests for `<video>` elements)

# Implementation Spec
- **Architecture**: In `getAudioAssets`, the array of elements returned by `doc.querySelectorAll('audio, video')` needs to be explicitly typed or cast. Since both `<audio>` and `<video>` elements inherit from `HTMLMediaElement`, casting the elements to `HTMLMediaElement` will satisfy TypeScript and provide access to the required properties.
- **Pseudo-Code**:
  ```typescript
  // packages/player/src/features/audio-utils.ts
  export async function getAudioAssets(...) {
    // Cast each element to HTMLMediaElement to access volume, muted, src, loop
    const domAssetsPromises = Array.from(doc.querySelectorAll('audio, video')).map((el, index) => {
        const tag = el as HTMLMediaElement;
        // ... existing logic using 'tag' ...
    });
    // ...
  }
  ```
- **Public API Changes**: None.
- **Dependencies**: The previous task `2026-10-28-PLAYER-Include-Video-Audio-In-Export` is the prerequisite.

# Test Plan
- **Verification**: Run `npm run build -w packages/player` to verify compilation, then `npm test packages/player/src/features/audio-utils.test.ts`.
- **Success Criteria**:
  - The `packages/player` package builds without TypeScript errors.
  - A new test case explicitly verifying that `<video>` elements are discovered and parsed correctly passes.
  - All existing tests pass.
- **Edge Cases**:
  - Verify that both `<audio>` and `<video>` elements in the same document are processed correctly and their respective attributes (`src`, `volume`, `muted`) are extracted.