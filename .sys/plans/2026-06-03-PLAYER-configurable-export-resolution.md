# Plan: Configurable Export Resolution

## 1. Context & Goal
- **Objective**: Allow users to specify a target resolution (width/height) for client-side video exports, independent of the preview player's size.
- **Trigger**: Vision gap identified during planning. Currently, exports use the computed size of the DOM element, which couples export quality to the UI layout.
- **Impact**: Enables high-quality (e.g., 1080p) exports even when the player is displayed in a small container or responsive layout.

## 2. File Inventory
- **Modify**:
    - `packages/player/src/index.ts`: Add `export-width` and `export-height` attributes and logic.
    - `packages/player/src/features/exporter.ts`: Update `export` method to accept dimensions.
    - `packages/player/src/controllers.ts`: Update `captureFrame` signature in interface and implementations.
    - `packages/player/src/bridge.ts`: Update `handleCaptureFrame` to unpack dimensions.
    - `packages/player/src/features/dom-capture.ts`: Update `captureDomToBitmap` to accept target dimensions.
    - `packages/player/src/features/dom-capture.test.ts`: Add verification test.
- **Read-Only**: `packages/core/src/index.ts`

## 3. Implementation Spec
- **Architecture**:
    - **Data Flow**: `HeliosPlayer` (attributes) -> `ClientSideExporter` -> `HeliosController` -> (`Direct` | `Bridge`) -> `captureDomToBitmap`.
    - **Mechanism**: `captureDomToBitmap` will use the provided `targetWidth` and `targetHeight` to set the root SVG dimensions. The internal `foreignObject` uses `100%` width/height, ensuring the cloned DOM content re-layouts to the new viewport size before rasterization.
- **Pseudo-Code**:
    ```typescript
    // 1. dom-capture.ts
    // Modify captureDomToBitmap to accept optional target dimensions
    export async function captureDomToBitmap(element: HTMLElement, options?: { targetWidth?: number, targetHeight?: number }): Promise<ImageBitmap> {
       const width = options?.targetWidth || element.scrollWidth || ...;
       const height = options?.targetHeight || element.scrollHeight || ...;
       // ... construct SVG with these dimensions ...
    }

    // 2. controllers.ts
    // Update interface and classes
    export interface HeliosController {
       // ...
       captureFrame(frame: number, options?: { selector?: string, mode?: 'canvas' | 'dom', width?: number, height?: number }): Promise<...>;
    }

    // DirectController just passes options to captureDomToBitmap
    // BridgeController sends options in postMessage

    // 3. bridge.ts
    // Handle new properties in message
    async function handleCaptureFrame(helios, data) {
       const { width, height } = data;
       // ...
       if (mode === 'dom') {
           const bitmap = await captureDomToBitmap(document.body, { targetWidth: width, targetHeight: height });
           // ...
       }
    }

    // 4. exporter.ts
    // Update ClientSideExporter to accept dimensions
    export class ClientSideExporter {
       public async export(options: { ..., width?: number, height?: number }) {
           // ...
           // Pass width/height to controller.captureFrame
       }
    }

    // 5. index.ts
    // Parse attributes and pass to exporter
    private renderClientSide = async () => {
       const exportWidth = parseFloat(this.getAttribute("export-width") || "");
       const exportHeight = parseFloat(this.getAttribute("export-height") || "");

       const options = {
           // ...
           width: !isNaN(exportWidth) ? exportWidth : undefined,
           height: !isNaN(exportHeight) ? exportHeight : undefined
       };
       await exporter.export(options);
    }
    ```
- **Public API Changes**:
    - `<helios-player>`: Adds `export-width` and `export-height` attributes.
    - `HeliosController.captureFrame`: New optional `width` and `height` properties.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
    - Run `npm run build -w packages/player` to verify type correctness across the modified chain.
    - Run `npm test -w packages/player` to ensure no regressions.
    - Add a unit test in `packages/player/src/features/dom-capture.test.ts` mocking `captureDomToBitmap` (or testing internal logic if possible) to assert that the generated SVG string contains the correct `width` and `height` attributes when options are provided.
- **Success Criteria**:
    - Build passes.
    - Tests pass.
    - `dom-capture.test.ts` confirms SVG dimensions match target.
- **Edge Cases**:
    - `export-width` set but `export-height` missing: SVG will use `targetWidth` and fallback `scrollHeight` for height.
    - `canvas` mode: Options are passed but likely ignored by current Canvas logic (acceptable for this iteration, as feature targets DOM).
