# Standardize Media Element Animation Example

## 1. Context & Goal
- **Objective**: Upgrade the legacy `examples/media-element-animation` to a standardized, self-contained TypeScript project.
- **Trigger**: The example currently lacks `package.json`, `tsconfig.json`, and uses legacy relative imports/inline scripts, making it inconsistent with the "Professional" standard of other examples.
- **Impact**: Ensures the example serves as a proper reference for users, supports `npm install` / `npm run dev` in isolation, and participates correctly in the standardized build pipeline.

## 2. File Inventory
- **Create**:
  - `examples/media-element-animation/package.json`: Standard scripts and dependencies.
  - `examples/media-element-animation/tsconfig.json`: TypeScript configuration.
  - `examples/media-element-animation/vite.config.ts`: Vite config with local aliases.
  - `examples/media-element-animation/postcss.config.cjs`: Empty config to isolate from root.
  - `examples/media-element-animation/src/main.ts`: Logic moved from `composition.html`, typed and modernized.
- **Modify**:
  - `examples/media-element-animation/composition.html`: Update script to point to `src/main.ts` and remove inline logic.
  - `examples/media-element-animation/index.html`: Ensure it works with the new structure (likely just a preview wrapper).
- **Read-Only**:
  - `examples/simple-animation/`: Reference for standard structure.

## 3. Implementation Spec
- **Architecture**:
  - **Vite + TypeScript**: Standard build stack.
  - **Main Logic**: Move inline JS from `composition.html` to `src/main.ts`.
  - **Imports**: Replace relative `../../packages/core/src/index.ts` with `@helios-project/core`.
  - **Asset Management**: Keep Data URIs for self-containment (moved to `src/main.ts` constants).
- **Pseudo-Code (src/main.ts)**:
  ```typescript
  import { Helios } from '@helios-project/core';

  // Minimal 1x1 pixel MP4 (Black)
  const VIDEO_SRC = "data:video/mp4;base64,...";
  // Minimal WAV (Silence)
  const AUDIO_SRC = "data:audio/wav;base64,...";

  // Init elements
  const video = document.getElementById('my-video') as HTMLVideoElement;
  const audio = document.getElementById('my-audio') as HTMLAudioElement;

  if (video && audio) {
    video.src = VIDEO_SRC;
    audio.src = AUDIO_SRC;

    const helios = new Helios({
      duration: 5,
      fps: 30,
      autoSyncAnimations: true
    });

    (window as any).helios = helios;
    helios.bindToDocumentTimeline();
  }
  ```
- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
  1. `cd examples/media-element-animation`
  2. `npm install`
  3. `npm run build` (verifies local build)
  4. `cd ../..`
  5. `npm run build:examples` (verifies root integration)
- **Success Criteria**:
  - Both builds succeed.
  - The example output exists in `dist/` (local) and `output/example-build/` (root).
- **Edge Cases**:
  - Ensure Data URIs are correctly handled in TS files (just strings).
