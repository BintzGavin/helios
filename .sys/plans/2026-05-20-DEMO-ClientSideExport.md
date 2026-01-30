# Plan: Client-Side Export API Example

## 1. Context & Goal
- **Objective**: Create a new example `examples/client-export-api` that demonstrates how to programmatically use the `ClientSideExporter` and `HeliosController` APIs to export video directly in the browser, without using the `<helios-player>` UI.
- **Trigger**: The Vision designates "Client-Side WebCodecs" as a key capability and future primary export path, but currently no example demonstrates how to implement this programmatically. The Journal also flagged a "Client-Side Verification Gap".
- **Impact**: Unlocks the ability for developers to build custom export workflows (e.g., "Canva-like" apps) and provides a testable surface for verifying the client-side export pipeline. It also documents the need to expose `BridgeController` publicly.

## 2. File Inventory
- **Create**:
    - `examples/client-export-api/composition.html`: The HTML frame for the Helios composition.
    - `examples/client-export-api/index.html`: The "Studio/App" page that embeds the composition and drives the export process.
    - `examples/client-export-api/src/main.ts`: The entry point for the composition logic (bouncing ball animation + `connectToParent`).
    - `examples/client-export-api/src/app.ts`: The entry point for the app logic (iframe embedding + `BridgeController` + `ClientSideExporter`).
- **Modify**:
    - `vite.build-example.config.js`:
        - Add `client_export_comp` and `client_export_app` to the `rollupOptions.input` list.
        - Add aliases for `@helios-project/player/bridge`, `@helios-project/player/controllers`, and `@helios-project/player` to point to their source files, enabling the example to import internal/non-exported modules for demonstration purposes.
- **Read-Only**:
    - `packages/player/src/features/exporter.ts`
    - `packages/player/src/controllers.ts`
    - `packages/player/src/bridge.ts`

## 3. Implementation Spec
- **Architecture**:
    - **Composition**: Standard vanilla JS Helios composition using `canvas`. Imports `connectToParent` from `@helios-project/player/bridge` to enable external control.
    - **App**: Vanilla JS app that loads the composition in an `<iframe>`.
    - **Integration**: App uses `BridgeController` (from `@helios-project/player/controllers`) to connect to the iframe's `Helios` instance via `postMessage`.
    - **Export**: App instantiates `ClientSideExporter` with the controller and triggers `.export()`, updating a progress bar.
- **Pseudo-Code (Composition - src/main.ts)**:
    - Initialize `Helios`.
    - Draw bouncing ball on canvas in `subscribe`.
    - Call `connectToParent(helios)` to start listening for handshake.
- **Pseudo-Code (App - src/app.ts)**:
    - Select iframe and Export button.
    - Listen for `message` event.
    - On `HELIOS_READY`, instantiate `new BridgeController(iframe.contentWindow, state)`.
    - On iframe load, send `HELIOS_CONNECT`.
    - On Export click:
        - Disable button.
        - `const exporter = new ClientSideExporter(controller, iframe);`
        - `await exporter.export({ format: 'mp4', onProgress: (p) => ... });`
        - Re-enable button.
- **Dependencies**:
    - Depends on `packages/player` source files via Vite aliases.
- **Public API Changes**: None (aliases are build-time config for examples only).

## 4. Test Plan
- **Verification**:
    1.  Run `npm run build:examples`.
    2.  Check that `output/example-build/examples/client-export-api/index.html` and `composition.html` exist.
    3.  (Manual) Serve the output: `npx serve output/example-build`.
    4.  (Manual) Open `http://localhost:3000/examples/client-export-api/index.html`.
    5.  (Manual) Click "Export" and verify `video.mp4` downloads.
- **Success Criteria**:
    - Build succeeds without module resolution errors.
    - The `ClientSideExporter` successfully captures frames from the iframe and generates a video file.
- **Edge Cases**:
    - Verify that `BridgeController` correctly handles the handshake when imported from source.
    - Ensure `VideoEncoder` is supported in the test environment (Chrome/Edge).
