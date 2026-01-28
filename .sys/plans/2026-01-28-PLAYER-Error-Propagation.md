# 2026-01-28-PLAYER-Error-Propagation.md

## 1. Context & Goal
- **Objective**: Implement a robust error propagation system that catches runtime errors (exceptions, unhandled rejections) within the composition iframe and displays them in the `<helios-player>` UI.
- **Trigger**: "The `bridge.ts` module in `packages/player` lacks global error listeners... resulting in silent failures." (Memory)
- **Impact**: Improves developer experience by surfacing crashes immediately instead of failing silently or hanging.

## 2. File Inventory
- **Modify**: `packages/player/src/bridge.ts` (Add global error listeners)
- **Modify**: `packages/player/src/controllers.ts` (Update `HeliosController` interface and implementations)
- **Modify**: `packages/player/src/controllers.test.ts` (Add tests for error propagation)
- **Modify**: `packages/player/src/index.ts` (Subscribe to controller errors and update UI)
- **Read-Only**: `packages/player/src/features/` (No changes needed)

## 3. Implementation Spec

### Architecture
1.  **Iframe Side (`bridge.ts`)**:
    - Attach `window.onerror` and `window.onunhandledrejection` inside `connectToParent`.
    - Serialize error details (message, stack, line number) to avoid `postMessage` cloning errors (e.g. if error object contains non-clonable data).
    - Send `HELIOS_ERROR` message to parent with the serialized error.
2.  **Controller Layer (`controllers.ts`)**:
    - Update `HeliosController` interface to include `onError(callback: (error: Error) => void): () => void`.
    - `BridgeController`: Listen for `HELIOS_ERROR` message and invoke registered callbacks.
    - `DirectController`: Attach `error` and `unhandledrejection` listeners directly to the iframe window (since same-origin is guaranteed in Direct Mode).
3.  **UI Layer (`index.ts`)**:
    - In `setController`, subscribe to `controller.onError`.
    - On error, call `this.showStatus(errorMessage, true)`.
    - Ensure `unsubscribeError` is called in `dispose` or when controller changes.

### Pseudo-Code

**`packages/player/src/bridge.ts`**
```typescript
// Inside connectToParent
window.addEventListener('error', (event) => {
  // Extract essential info
  const payload = { message: event.message, stack: event.error?.stack };
  window.parent.postMessage({ type: 'HELIOS_ERROR', error: payload }, '*');
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const payload = {
     message: reason instanceof Error ? reason.message : String(reason),
     stack: reason instanceof Error ? reason.stack : undefined
  };
  window.parent.postMessage({ type: 'HELIOS_ERROR', error: payload }, '*');
});
```

**`packages/player/src/controllers.ts`**
```typescript
interface HeliosController {
  // ... existing methods
  onError(callback: (error: Error) => void): () => void;
}

class BridgeController implements HeliosController {
  private errorListeners: ((err: Error) => void)[] = [];

  constructor() {
      // ...
      window.addEventListener('message', this.handleMessage);
  }

  private handleMessage = (event: MessageEvent) => {
      // ...
      if (event.data?.type === 'HELIOS_ERROR') {
          const err = new Error(event.data.error.message);
          err.stack = event.data.error.stack;
          this.errorListeners.forEach(cb => cb(err));
      }
  }

  onError(callback: (error: Error) => void) {
      this.errorListeners.push(callback);
      return () => {
          this.errorListeners = this.errorListeners.filter(l => l !== callback);
      };
  }
}

class DirectController implements HeliosController {
  private errorListeners: ((err: Error) => void)[] = [];

  constructor(instance, iframe) {
      // If iframe provided, attach listeners
      if (this.iframe && this.iframe.contentWindow) {
          this.iframe.contentWindow.addEventListener('error', this.handleWindowError);
          this.iframe.contentWindow.addEventListener('unhandledrejection', this.handleUnhandledRejection);
      }
  }

  private handleWindowError = (event) => {
      this.notifyError(event.error || new Error(event.message));
  }

  private handleUnhandledRejection = (event) => {
      this.notifyError(event.reason instanceof Error ? event.reason : new Error(String(event.reason)));
  }

  // ... implementation of onError and notifyError
}
```

**`packages/player/src/index.ts`**
```typescript
// In setController
this.unsubscribeError = this.controller.onError((err) => {
  this.showStatus(`Runtime Error: ${err.message}`, true);
});

// In dispose / setController cleanup
if (this.unsubscribeError) {
    this.unsubscribeError();
}
```

## 4. Test Plan
- **Verification**: `npm run test -w packages/player` (Unit tests)
- **Success Criteria**:
    - `BridgeController` correctly parses `HELIOS_ERROR` messages.
    - `DirectController` correctly catches window errors from mock iframe.
    - New tests in `controllers.test.ts` verify both `error` event and `unhandledrejection` event.
- **Edge Cases**:
    - `postMessage` cloning errors (mitigated by serialization).
    - Multiple subscribers to `onError`.
    - Errors occurring immediately on load (before subscription) - these might be missed by the *controller* if it's not attached yet, but `bridge.ts` will send them. The controller might miss them if it hasn't subscribed to `message` events yet, but usually `HeliosPlayer` sets up controller quickly. (Acceptable limitation for this iteration).

## 5. Dependencies
- No external dependencies.
- Relies on existing `showStatus` in `HeliosPlayer`.
