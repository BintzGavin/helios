# Plan: Basic Audio Support in Renderer

## 1. Context & Goal
- **Objective**: Enable the Renderer to include an external audio file in the final video output.
- **Trigger**: The Vision mentions "Audio mixing via filter complex" and "Basic (FFmpeg)" audio support, but currently, the Renderer has zero audio capabilities.
- **Impact**: Unlocks the ability to create videos with sound (background music, voiceover) by passing a pre-processed audio file.

## 2. File Inventory
- **Create**:
  - `packages/renderer/scripts/verify-audio-args.ts` (Verification script)
- **Modify**:
  - `packages/renderer/src/types.ts`: Add `audioFilePath` to `RendererOptions`.
  - `packages/renderer/src/strategies/DomStrategy.ts`: Update `getFFmpegArgs` to handle audio.
  - `packages/renderer/src/strategies/CanvasStrategy.ts`: Update `getFFmpegArgs` to handle audio.
- **Read-Only**:
  - `packages/renderer/src/index.ts` (Passes options, no change needed)
  - `packages/renderer/src/strategies/RenderStrategy.ts` (Interface definition)

## 3. Implementation Spec
- **Architecture**: Update the `RenderStrategy` implementations to check for `audioFilePath`. If present, inject FFmpeg arguments to read the audio file and map it to the output.
- **Pseudo-Code**:
  ```typescript
  // In strategies (DomStrategy and CanvasStrategy):
  getFFmpegArgs(options, outputPath) {
    // Existing video input args (Input 0)
    const videoArgs = ...;

    // New Audio Input (Input 1)
    const audioInputArgs = options.audioFilePath ? ['-i', options.audioFilePath] : [];

    // Output Mapping
    // Note: Using -shortest ensures video stops if audio is infinitely long,
    // but risks cutting video if audio is short.
    // Executor should consider adding -t options.durationInSeconds if strict duration is needed.
    const audioOutputArgs = options.audioFilePath
      ? ['-c:a', 'aac', '-map', '0:v', '-map', '1:a', '-shortest']
      : [];

    const outputArgs = [
       '-c:v', 'libx264',
       // ... other output args
       ...audioOutputArgs,
       outputPath
    ];

    return ['-y', ...videoArgs, ...audioInputArgs, ...outputArgs];
  }
  ```
- **Public API Changes**:
  - `RendererOptions` interface gains `audioFilePath?: string`.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
  1. Create `packages/renderer/scripts/verify-audio-args.ts` (Logic to instantiate strategies with audio options and assert args).
  2. Run type check: `npm run build` (in `packages/renderer`)
  3. Run the verification script: `npx ts-node packages/renderer/scripts/verify-audio-args.ts`
- **Success Criteria**:
  - Build passes.
  - Verification script confirms correct argument generation (presence of `-i path`, `-map 1:a`).
- **Edge Cases**:
  - `audioFilePath` undefined (should not crash, no audio args).
