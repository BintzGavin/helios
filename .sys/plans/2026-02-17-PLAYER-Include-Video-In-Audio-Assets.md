# 📋 PLAYER: Include Video In Audio Assets

#### 1. Context & Goal
- **Objective**: Update `getAudioAssets` utility to include `<video>` elements as valid audio sources.
- **Trigger**: Vision gap identified where audio from video elements is missing from client-side exports and audio fading logic, despite `AudioFader` supporting them in preview.
- **Impact**: Enables audio from video elements to be included in client-side exports and allows audio fading on video tracks, ensuring parity between preview and export.

#### 2. File Inventory
- **Create**: None
- **Modify**:
  - `packages/player/src/features/audio-utils.ts`: Update query selector and type handling.
  - `packages/player/src/features/audio-utils.test.ts`: Add test case for `<video>` element discovery.
- **Read-Only**: `packages/player/src/features/audio-metering.ts` (reference implementation)

#### 3. Implementation Spec
- **Architecture**: Update the asset discovery logic in `getAudioAssets` to query for `audio, video` instead of just `audio`. Use `HTMLMediaElement` interface which covers both types.
- **Pseudo-Code**:
  ```typescript
  // In getAudioAssets function:
  // Change selector
  const elements = Array.from(doc.querySelectorAll('audio, video'));

  // Map elements
  const domAssetsPromises = elements.map((tag, index) => {
    // Cast to HTMLMediaElement
    const mediaTag = tag as HTMLMediaElement;

    // Use common properties (volume, muted, loop, src)
    // ... existing logic ...
  });
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  - Run `npx vitest packages/player/src/features/audio-utils.test.ts`
  - Run `npm run build -w packages/player`
- **Success Criteria**:
  - New test case for `<video>` element passes.
  - Existing tests for `<audio>` elements pass.
  - Build succeeds without type errors.
- **Edge Cases**:
  - Video elements without audio tracks (handled by browser decoding usually, or empty buffer).
  - Video elements with `muted` attribute.
