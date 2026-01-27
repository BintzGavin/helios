# 2026-03-01 - Plan: Implement Bridge Error Propagation

## 1. Context & Goal
- **Objective**: Implement a global error handling mechanism that propagates runtime errors from the composition iframe (both Direct and Bridge modes) to the `<helios-player>` UI.
- **Trigger**: Currently, if a composition crashes (e.g. React render error, unhandled promise rejection), the player fails silently with no feedback.
- **Impact**: Improves developer experience by surfacing composition errors directly in the Player UI with a dismissable overlay, rather than leaving the user with a frozen screen.

## 2. File Inventory
- **Modify**: `packages/player/src/bridge.ts` (Add global error listeners)
- **Modify**: `packages/player/src/controllers.ts` (Update `HeliosController` interface and implementations)
- **Modify**: `packages/player/src/index.ts` (Subscribe to errors and display UI)
- **Modify**: `packages/player/src/controllers.test.ts` (Test Bridge error handling)
- **Modify**: `packages/player/src/index.test.ts` (Test UI error display)

## 3. Implementation Spec

### Architecture
- **Bridge Protocol**: New message type `HELIOS_ERROR` containing error details (message, stack).
- **Controller Pattern**: New `onError` subscription method in `HeliosController`.
- **UI Pattern**: Reuse existing `status-overlay` and `showStatus` method to display runtime errors.

### Pseudo-Code

#### `packages/player/src/bridge.ts`
- Add `window.onerror` handler:
  - Extract message, source, lineno.
  - `postMessage({ type: 'HELIOS_ERROR', error: { message: ... } })`
- Add `unhandledrejection` listener:
  - Extract reason.
  - `postMessage({ type: 'HELIOS_ERROR', error: { message: ... } })`

#### `packages/player/src/controllers.ts`
- Update `HeliosController` interface:
  - Add `onError(callback: (error: any) => void): () => void`
- **DirectController**:
  - In constructor, attach `error` and `unhandledrejection` listeners to `iframe.contentWindow` (if available/accessible).
  - Implement `onError` to manage subscribers.
- **BridgeController**:
  - In `handleMessage`, listen for `HELIOS_ERROR`.
  - Notify `onError` subscribers.

#### `packages/player/src/index.ts`
- In `setController`:
  - Subscribe to `controller.onError((err) => this.showStatus("Runtime Error: " + err.message, true, { label: "Dismiss", handler: () => this.hideStatus() }))`.
  - Store unsubscribe function to cleanup in `disconnectedCallback` or when controller changes.

## 4. Test Plan
- **Verification**: Run `npm run test -w packages/player`
- **Success Criteria**:
  - `controllers.test.ts`: `BridgeController` correctly emits error when `HELIOS_ERROR` message is received.
  - `index.test.ts`: `HeliosPlayer` displays the error overlay when the controller emits an error.
- **Edge Cases**:
  - Cross-origin blocking in DirectController (should catch security errors or fail gracefully).
  - Rapid fire errors (UI will show the latest one).
  - Errors occurring before connection (Bridge listeners should catch early errors).
