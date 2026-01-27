# Plan: Scaffold Media Element Animation Example

## 1. Context & Goal
- **Objective**: Create `examples/media-element-animation` to demonstrate Helios' ability to synchronize and control native `<video>` and `<audio>` elements via `DomDriver`.
- **Trigger**: The README states that "Native `<video>` and `<audio>` killed Flash" and `packages/core` contains `DomDriver` logic for syncing media elements, but no example exists to verify or demonstrate this core feature.
- **Impact**: verify the `DomDriver` media synchronization logic (scrubbing, volume, mute) and provide a reference implementation for users wanting to include video/audio assets in their compositions.

## 2. File Inventory
- **Create**:
  - `examples/media-element-animation/composition.html`: The core composition file using vanilla JS and HTML5 media elements.
  - `examples/media-element-animation/index.html`: A preview wrapper for the composition.
- **Modify**:
  - `vite.build-example.config.js`: Add the new example to the build input configuration.
    - Add `media_element: resolve(__dirname, "examples/media-element-animation/composition.html"),` to `rollupOptions.input`.
  - `tests/e2e/verify-render.ts`: Add a test case to verify the new example renders correctly.
    - Add `{ name: 'Media Element', relativePath: 'examples/media-element-animation/composition.html', mode: 'dom' as const },` to the `CASES` array.
- **Read-Only**:
  - `packages/core/src/drivers/DomDriver.ts`: To understand the expected behavior for media elements.

## 3. Implementation Spec
- **Architecture**:
  - **Vanilla JS**: No framework dependency to keep the example focused on the DOM API.
  - **Data URIs**: Use small, embedded Base64 data URIs for video and audio sources to ensure the example is self-contained, offline-capable, and robust against network flakiness during CI/CD.
  - **Auto-Sync**: Use `autoSyncAnimations: true` in `Helios` config to leverage `DomDriver`'s automatic media element synchronization.
- **Content**:
  - A `<video>` element playing a loop (visual verification).
  - An `<audio>` element playing a loop (audio mixing verification).
  - Visual indicators for volume/mute state to allow manual verification.
- **Pseudo-Code (Composition)**:
  ```javascript
  import { Helios } from '../../packages/core/dist/index.js';

  // 1. Define Data URIs for video/audio (Base64 strings)
  const VIDEO_SRC = "data:video/mp4;base64,...";
  const AUDIO_SRC = "data:audio/mp3;base64,...";

  // 2. Initialize Helios
  const helios = new Helios({
    duration: 10,
    fps: 30,
    autoSyncAnimations: true // This triggers DomDriver to sync <video>/<audio>
  });

  // 3. Bind to timeline
  helios.bindToDocumentTimeline();
  ```
- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
  1. Run `npm run build:examples` to ensure the new example builds.
  2. Run `npx ts-node tests/e2e/verify-render.ts` to verify the example renders to video without errors.
- **Success Criteria**:
  - The build command succeeds.
  - The E2E verification script outputs `✅ Media Element Passed!`.
- **Edge Cases**:
  - Verify that `DomDriver` correctly handles `volume` and `muted` signals (implicit in the E2E test if audio is rendered, though hard to verify audio content in headless without advanced tools; visual render is the primary success criteria for now).
