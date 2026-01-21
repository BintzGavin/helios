# 2024-05-23-PLAYER-Harden-Player-Connection

#### 1. Context & Goal
- **Objective**: Harden the `<helios-player>` by adding iframe sandboxing and robust polling for the Helios instance.
- **Trigger**: Vision gap (Sandboxing) and reliability issues (Race conditions with `window.helios`).
- **Impact**: Improves security and compatibility with async frameworks (React, Vue) where the `helios` instance might be attached after the `load` event.

#### 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Update template and connection logic)
- **Read-Only**: `packages/core/src/index.ts` (Reference for Helios type)

#### 3. Implementation Spec
- **Architecture**:
  - The iframe will now use `sandbox="allow-scripts allow-same-origin"` to restrict permissions while allowing necessary access.
  - A polling mechanism will replace the single-check connection logic to handle asynchronous initialization of the composition.
- **Pseudo-Code**:
  - Update `template` string: Add `sandbox="allow-scripts allow-same-origin"` to `<iframe>`.
  - In `handleIframeLoad`:
    - Call `this.startPollingForHelios()`.
  - Implement `startPollingForHelios()`:
    - Set `attempts = 0`.
    - `setInterval` every 100ms.
    - Check `this.iframe.contentWindow.helios`.
    - If found: `clearInterval`, call `this.connect(helios)`.
    - If `attempts > 50` (5 seconds): `clearInterval`, log error, show "Connection Failed" state in UI.
  - Refactor `connect(helios)`:
    - Contains the logic previously in `handleIframeLoad` (enable buttons, update UI, subscribe).
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run build -w packages/player`
- **Success Criteria**:
  - Build succeeds without TypeScript errors.
  - `packages/player/dist/index.js` contains the new polling logic.
- **Edge Cases**:
  - Iframe loads but `helios` is never attached (Timeout handling).
  - `helios` is attached immediately (Happy path).
