# Canvas Image Preloading

## 1. Context & Goal
- **Objective**: Implement image and asset preloading in `CanvasStrategy` to match `DomStrategy` capabilities.
- **Trigger**: Vision Gap - "Asset preloading prevents artifacts". Currently, `CanvasStrategy` does not wait for DOM images (used as textures) to load, leading to potential blank frames or pop-in artifacts.
- **Impact**: Ensures parity between rendering modes and robust behavior for Canvas-based compositions that rely on DOM assets (images, video posters, SVGs).

## 2. File Inventory
- **Create**:
  - `packages/renderer/src/utils/dom-preload.ts`: Shared utility for preloading logic.
  - `packages/renderer/tests/verify-canvas-preload.ts`: Verification script.
- **Modify**:
  - `packages/renderer/src/strategies/DomStrategy.ts`: Refactor to use shared utility.
  - `packages/renderer/src/strategies/CanvasStrategy.ts`: Implement preloading call in `prepare()`.
- **Read-Only**: `packages/renderer/src/utils/dom-scripts.ts`

## 3. Implementation Spec
- **Architecture**: Refactor Strategy Pattern. Extract the specific "find and wait" logic from `DomStrategy` into a shared utility function that can be injected into the browser context via `page.evaluate`.
- **Pseudo-Code**:
  ```typescript
  // packages/renderer/src/utils/dom-preload.ts
  export const PRELOAD_IMAGES_SCRIPT = `
    (async (timeoutMs) => {
       // Helper: withTimeout...
       // 1. Wait for fonts
       // 2. Find all images (img, video poster, svg image) -> Promise.all(onload)
       // 3. Find all elements with background-image/mask-image -> Promise.all(onload)
    })
  `;

  // CanvasStrategy.ts & DomStrategy.ts
  import { PRELOAD_IMAGES_SCRIPT } from '../utils/dom-preload.js';

  async prepare(page) {
     // Execute shared script
     await page.evaluate(`(${PRELOAD_IMAGES_SCRIPT})(${timeout})`);
     // ...
  }
  ```
- **Public API Changes**: None. Internal behavior improvement.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: `npx tsx packages/renderer/tests/verify-canvas-preload.ts`
- **Success Criteria**:
  - The verification script (which mocks slow image loads) logs "Preloading X images..." and confirms requests were made before rendering started.
  - `CanvasStrategy` successfully renders the image content (no blank frames).
- **Edge Cases**:
  - Timeout handling (should warn but not crash).
  - Broken images (should not block indefinitely).
  - Shadow DOM traversal (must find images inside components).
