# Context & Goal
- **Objective**: Update `DomStrategy` to perform asset preloading (fonts, images) and audio track discovery across all frames (including iframes), ensuring robust rendering for nested compositions.
- **Trigger**: Vision Gap - "Implicit Audio Discovery" and "Robust Preloading" currently fail for content inside iframes, leading to missing audio and visual artifacts.
- **Impact**: Enables correct rendering of complex compositions that use iframes for sandboxing or layout, ensuring consistent audio mixing and no "pop-in" of assets.

# File Inventory
- **Modify**: `packages/renderer/src/strategies/DomStrategy.ts` (Implement frame iteration and aggregation)
- **Create**: `packages/renderer/tests/verify-deep-dom.ts` (Test script with iframe setup)
- **Read-Only**: `packages/renderer/src/Renderer.ts`, `packages/renderer/src/types.ts`

# Implementation Spec
- **Architecture**:
  - The `DomStrategy` will move its preloading and discovery logic from a single `page.evaluate` call to a structured function (passed as a string or function body) executed via `Promise.all(page.frames().map(frame => frame.evaluate(...)))`.
  - Audio tracks discovered in all frames will be aggregated into a single list.
  - Preloading (fonts, images, backgrounds) will run concurrently in all frames.

- **Pseudo-Code**:
  ```typescript
  // In DomStrategy.prepare(page)

  // Define the discovery/preloading logic as a reusable function body
  const gatherAssets = async () => {
      // 1. Wait for document.fonts.ready
      // 2. Wait for document.images
      // 3. Scan and preload CSS background images
      // 4. Scan and preload <video>/<audio>
      // 5. Return discovered audio tracks [{ path, volume }]
  }

  // Execute on all frames (including main frame)
  const results = await Promise.all(page.frames().map(frame =>
      frame.evaluate(gatherAssets)
  ));

  // Flatten and aggregate audio tracks
  this.discoveredAudioTracks = results.flat().filter(validTracks);
  ```

# Test Plan
- **Verification**:
  1. Run `npx tsx packages/renderer/tests/verify-deep-dom.ts`.
     - Sets up a server with an iframe containing an audio element.
     - Verifies that `DomStrategy` discovers the audio track from the iframe.
  2. Run `npm test` to execute the full regression suite (`tests/run-all.ts`).
- **Success Criteria**:
  - `verify-deep-dom.ts` passes (audio found).
  - `npm test` passes (no regressions).
- **Edge Cases**:
  - Cross-origin iframes.
  - Empty iframes.
  - Iframes with no audio.
