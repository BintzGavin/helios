# Plan: Enable Sandbox and PostMessage Bridge

## 1. Context & Goal
- **Objective**: Implement a `postMessage` bridge for `<helios-player>` to support sandboxed iframes and cross-origin compositions, while maintaining backward compatibility with `window.helios` direct access.
- **Trigger**: Vision Gaps identified: "Sandboxed iframe" (missing attribute) and "Bridge via postMessage" (Architectural Requirement).
- **Impact**: Enables secure isolation of user compositions, prepares the player for hosted usage (e.g. on a separate domain), and improves architectural cleanliness by decoupling the player UI from the iframe internals.

## 2. File Inventory
- **Create**:
  - `packages/player/src/bridge.ts`: A new module exporting `connectToParent(helios)` to handle the guest-side messaging.
- **Modify**:
  - `packages/player/src/index.ts`: Update `HeliosPlayer` to add `sandbox` attribute and implement the host-side messaging protocol.
  - `packages/player/package.json`: Add `exports` field to expose the bridge module.

## 3. Implementation Spec

### Architecture: Hybrid Bridge
The `HeliosPlayer` will support two modes of operation:
1.  **Direct Mode (Legacy/Local)**: Direct access to `iframe.contentWindow.helios`. Used when `allow-same-origin` is active and the iframe is on the same origin.
2.  **Bridge Mode (Secure/Remote)**: Communication via `postMessage`. Required for strict sandboxing or cross-origin iframes.

### Protocol
- **Host (Player) -> Guest (Iframe)**:
  - `HELIOS_CONNECT`: Handshake initiation.
  - `HELIOS_PLAY`, `HELIOS_PAUSE`: Playback control.
  - `HELIOS_SEEK`: `{ type: 'HELIOS_SEEK', frame: number }`.
- **Guest (Iframe) -> Host (Player)**:
  - `HELIOS_READY`: Handshake response.
  - `HELIOS_STATE`: `{ type: 'HELIOS_STATE', state: HeliosState }`.

### `packages/player/src/bridge.ts`
```typescript
export function connectToParent(helios: Helios) {
  // 1. Listen for messages from parent
  window.addEventListener('message', (event) => {
    const { type, frame } = event.data;
    switch (type) {
      case 'HELIOS_CONNECT':
        // Reply with ready and current state
        window.parent.postMessage({ type: 'HELIOS_READY' }, '*');
        window.parent.postMessage({ type: 'HELIOS_STATE', state: helios.getState() }, '*');
        break;
      case 'HELIOS_PLAY':
        helios.play();
        break;
      case 'HELIOS_PAUSE':
        helios.pause();
        break;
      case 'HELIOS_SEEK':
        helios.seek(frame);
        break;
    }
  });

  // 2. Subscribe to Helios state changes and broadcast
  helios.subscribe((state) => {
    // Optimization: Maybe throttle this if needed, but for now 1:1 is fine
    window.parent.postMessage({ type: 'HELIOS_STATE', state }, '*');
  });

  // 3. Announce readiness immediately (in case parent is already listening)
  window.parent.postMessage({ type: 'HELIOS_READY' }, '*');
}
```

### `packages/player/src/index.ts`
- **Iframe Attributes**: Add `sandbox="allow-scripts allow-same-origin"`.
  - `allow-scripts`: Required for JS execution.
  - `allow-same-origin`: Required for current examples to work (Direct Mode) and for DOM-based export (until we have a better solution).
- **Initialization**:
  - In `handleIframeLoad`:
    - Attempt Direct Mode (`contentWindow.helios`). If found, use it.
    - AND send `HELIOS_CONNECT` message to `contentWindow`.
    - Setup `window.addEventListener('message')` to listen for `HELIOS_READY` and `HELIOS_STATE`.
- **State Management**:
  - If `HELIOS_READY` is received, set a flag `isBridged = true`.
  - In `togglePlayPause`, `handleScrubberInput`:
    - If `isBridged`, send `postMessage`.
    - Else (or In addition? No, prefer Bridge if available), use `this.helios` direct methods.
    - Actually, if we have a local proxy `this.helios`, we can keep using it for Direct Mode.
    - For Bridge Mode, we might not have a local `this.helios` object. We should abstract this.
- **Abstraction**:
  - Interface `HeliosController` { play(), pause(), seek(frame) }.
  - Implementation `DirectController` (wraps local instance).
  - Implementation `BridgeController` (sends messages).
  - `HeliosPlayer` holds a `controller: HeliosController`.

### `packages/player/package.json`
```json
"exports": {
  ".": "./dist/index.js",
  "./bridge": "./dist/bridge.js"
}
```
(Maintain existing fields, just add exports).

## 4. Test Plan
- **Verification**:
  1.  Check that `packages/player/src/bridge.ts` exists.
  2.  Check that `packages/player/src/index.ts` contains `sandbox="allow-scripts allow-same-origin"`.
  3.  Check that `packages/player/package.json` has `exports`.
- **Command**: `npm run build -w packages/player`
- **Success Criteria**: Build succeeds.
- **Manual Verification (Later)**:
  - Run `npm run dev` (uses Direct Mode) - should still work.
  - Create a test HTML using `connectToParent` (Bridge Mode) - should work.
