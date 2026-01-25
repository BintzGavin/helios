# 2026-02-21 - PLAYER - Scaffold Test Suite

## 1. Context & Goal
- **Objective**: Establish a unit testing infrastructure for `packages/player` and implement initial tests for critical controllers and export logic.
- **Trigger**: The `packages/player` domain lacks any automated testing, creating a high risk of regressions during refactors or feature additions.
- **Impact**: Enables safe refactoring, ensures reliability of the Bridge/Direct communication, and validates the complex Client-Side Export logic without manual verification.

## 2. File Inventory
- **Create**:
  - `packages/player/vitest.config.ts`: Vitest configuration file.
  - `packages/player/src/controllers.test.ts`: Unit tests for `DirectController` and `BridgeController`.
  - `packages/player/src/features/exporter.test.ts`: Unit tests for `ClientSideExporter`.
- **Modify**:
  - `packages/player/package.json`: Add `test` script.
- **Read-Only**:
  - `packages/player/src/controllers.ts`: Source to test.
  - `packages/player/src/features/exporter.ts`: Source to test.

## 3. Implementation Spec

### Architecture
- Use **Vitest** as the test runner (consistent with `packages/core`).
- Use **JSDOM** environment to simulate browser APIs (`window`, `document`, `HTMLElement`).
- **Mocking**:
  - Mock `VideoEncoder` and `VideoFrame` (WebCodecs) as they are not present in JSDOM.
  - Mock `mp4-muxer` to avoid binary generation during tests.
  - Mock `HTMLIFrameElement` and `postMessage` for Bridge testing.

### Pseudo-Code

#### `packages/player/package.json`
- Add script: `"test": "vitest"`

#### `packages/player/vitest.config.ts`
- Export default defineConfig with `test: { environment: 'jsdom' }`.

#### `packages/player/src/controllers.test.ts`
- **DirectController Tests**:
  - Mock `Helios` instance (play, pause, seek, subscribe, setPlaybackRate, setInputProps).
  - Test `play/pause/seek` delegate to instance.
  - Test `captureFrame`:
    - Mock `requestAnimationFrame` to resolve immediately.
    - Mock `captureDomToBitmap` (spy) from `features/dom-capture` to return an `ImageBitmap`.
    - Assert it returns a `VideoFrame` wrapping the bitmap.
- **BridgeController Tests**:
  - Mock `iframe.contentWindow`.
  - Test `play/pause` send `postMessage` with correct type (`HELIOS_PLAY` etc).
  - Test `subscribe`:
    - Simulate incoming `message` event with `HELIOS_STATE`.
    - Assert subscriber is called with new state.
  - Test `captureFrame`:
    - Send `HELIOS_CAPTURE_FRAME`.
    - Simulate response message `HELIOS_FRAME_DATA` with success=true.
    - Assert promise resolves with `VideoFrame`.
    - Test timeout/failure cases (simulate error response).

#### `packages/player/src/features/exporter.test.ts`
- **Setup**:
  - Mock global `VideoEncoder` with `isConfigSupported` (return true), `configure`, `encode`, `flush`, `close`.
  - Mock `mp4-muxer` class (ArrayBufferTarget, Muxer).
  - Mock `URL.createObjectURL` and `URL.revokeObjectURL`.
- **Test `export()`**:
  - Create `ClientSideExporter` with a mock Controller.
  - Mock `controller.getState()` to return `{ duration: 1, fps: 30 }`.
  - Mock `controller.captureFrame()` to return a dummy `VideoFrame` (with `close()` method).
  - Call `exporter.export()` with a progress callback.
  - **Assert**:
    - `controller.pause()` was called initially.
    - `captureFrame` called for frame 0 (setup) and frames 0..29 (render loop).
    - `encoder.configure` called with correct width/height.
    - `encoder.encode` called 30 times.
    - `muxer.finalize` called.
    - `download` logic triggered (check `URL.createObjectURL` called).

### Dependencies
- None.

## 4. Test Plan
- **Verification**: Run `npm test -w packages/player`.
- **Success Criteria**:
  - All tests pass (green).
  - Coverage includes `controllers.ts` and `exporter.ts`.
- **Edge Cases**:
  - Test export cancellation (pass `AbortSignal.abort()`).
  - Test invalid `VideoEncoder` config (mock `isConfigSupported` to false).
