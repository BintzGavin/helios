# 📋 Spec: Player Loading & Error States

## 1. Context & Goal
- **Objective**: Implement visual "Loading" and "Error" states in the `<helios-player>` component to improve Developer Experience (DX).
- **Trigger**: Backlog item "Add proper UI feedback for 'Loading' state" and general DX gap where failed connections leave the player silently disabled.
- **Impact**: Developers will instantly know if their composition failed to connect (e.g., missing `window.helios`), reducing debugging time.

## 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Add UI logic and styles)
- **Read-Only**: `packages/player/src/bridge.ts` (Reference for connection protocol)

## 3. Implementation Spec
- **Architecture**:
  - Introduce an internal state logic to manage loading/error UI visibility.
  - Add a new UI element `.status-overlay` in the Shadow DOM (hidden by default, or shown initially).
  - Implement a timeout (e.g., 3000ms) in `handleIframeLoad`.

- **Pseudo-Code**:
  ```typescript
  // 1. Update Template CSS
  /*
    .status-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0,0,0,0.8);
      color: white;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 10;
      transition: opacity 0.3s;
    }
    .status-overlay.hidden {
      opacity: 0;
      pointer-events: none;
    }
    .error-msg { color: #ff6b6b; margin-bottom: 10px; }
    .retry-btn { ... }
  */

  // 2. Update Template HTML
  /*
    <div class="status-overlay" part="overlay">
      <div class="status-text">Connecting...</div>
      <button class="retry-btn" style="display:none">Retry</button>
    </div>
  */

  // 3. Class Logic
  class HeliosPlayer {
    private overlay: HTMLElement;
    private statusText: HTMLElement;
    private retryBtn: HTMLButtonElement;
    private connectionTimeout: number | null = null;

    constructor() {
      // ... select elements ...
      this.retryBtn.onclick = () => this.retryConnection();
    }

    connectedCallback() {
      // ... existing listeners ...
      // Show connecting state immediately
      this.showStatus("Connecting...", false);
    }

    handleIframeLoad() {
       // Clear any existing timeout
       if (this.connectionTimeout) clearTimeout(this.connectionTimeout);

       // 1. Try Direct
       // ... existing logic ...
       if (success) {
         this.hideStatus();
         return;
       }

       // 2. Bridge
       // Start timeout for bridge
       this.connectionTimeout = window.setTimeout(() => {
          this.showStatus("Connection Failed. Check window.helios.", true);
       }, 3000);

       postMessage(HELIOS_CONNECT);
    }

    handleWindowMessage() {
       if (HELIOS_READY) {
          if (this.connectionTimeout) clearTimeout(this.connectionTimeout);
          this.hideStatus();
          // ... existing logic ...
       }
    }

    retryConnection() {
       this.showStatus("Retrying...", false);
       this.iframe.src = this.iframe.src; // Reload iframe to force fresh start?
       // Or just re-trigger handleIframeLoad logic?
       // Reloading iframe is safer to reset state.
    }

    showStatus(msg, isError) {
       this.overlay.classList.remove('hidden');
       this.statusText.textContent = msg;
       this.retryBtn.style.display = isError ? 'block' : 'none';
    }

    hideStatus() {
       this.overlay.classList.add('hidden');
    }
  }
  ```

- **Public API Changes**: None.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
  1. Build the player: `npm run build -w packages/player`
  2. Run the example: `npm run dev`
  3. Verify "Happy Path":
     - Open `http://localhost:5173/examples/simple-canvas-animation/`
     - Confirm player connects (no overlay, or briefly "Connecting").
  4. Verify "Error Path":
     - Modify `examples/simple-canvas-animation/composition.html`: comment out `window.helios = helios`.
     - Reload page.
     - Confirm "Connecting..." appears, then "Connection Failed..." after 3s.
  5. Verify "Retry":
     - Undo change to `composition.html`.
     - Click "Retry" button (if implemented to reload) or manually reload page.
- **Success Criteria**:
  - Overlay appears and disappears correctly.
  - Timeout triggers error message.
  - Controls remain disabled while in Loading/Error state.
