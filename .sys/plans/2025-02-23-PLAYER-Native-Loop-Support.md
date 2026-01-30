# Plan: Implement Native Loop Support

## 1. Context & Goal
- **Objective**: Replace the legacy client-side loop implementation in `<helios-player>` with the native `setLoop` capability of the Helios core engine.
- **Trigger**: Vision alignment - The core engine supports looping natively via `setLoop`, making the player's client-side hack redundant and less reliable.
- **Impact**: Improves playback reliability and synchronization by delegating loop logic to the engine (Direct or via Bridge), ensuring the frame state is always correct across the system.

## 2. File Inventory
- **Modify**: `packages/player/src/controllers.ts` (Update `HeliosController` interface and implementations)
- **Modify**: `packages/player/src/bridge.ts` (Handle `HELIOS_SET_LOOP` message)
- **Modify**: `packages/player/src/index.ts` (Update `HeliosPlayer` to use `controller.setLoop` and remove manual looping)
- **Modify**: `packages/player/src/controllers.test.ts` (Update mocks and add tests for `setLoop`)

## 3. Implementation Spec

### Architecture
- **Interface Expansion**: The `HeliosController` interface will expose `setLoop(loop: boolean): void`.
- **Bridge Protocol**: A new message type `HELIOS_SET_LOOP` will be added to the bridge protocol to propagate the loop state from the player (parent) to the engine (iframe).
- **Controller Logic**:
    - `DirectController`: Calls `this.instance.setLoop(loop)`.
    - `BridgeController`: Posts `HELIOS_SET_LOOP` message.
- **Player Logic**:
    - The `loop` property setter in `HeliosPlayer` will trigger `controller.setLoop()`.
    - `attributeChangedCallback` will be updated to react to `loop` attribute changes.
    - `setController` will sync the initial `loop` state.
    - The manual "rewind if finished" logic in `updateUI` will be removed.

### Pseudo-Code

**`controllers.ts`**:
```typescript
interface HeliosController {
  // ... existing
  setLoop(loop: boolean): void;
}

class DirectController {
  setLoop(loop: boolean) { this.instance.setLoop(loop); }
}

class BridgeController {
  setLoop(loop: boolean) { this.iframeWindow.postMessage({ type: 'HELIOS_SET_LOOP', loop }, '*'); }
}
```

**`bridge.ts`**:
```typescript
// Inside message listener
case 'HELIOS_SET_LOOP':
  if (typeof event.data.loop === 'boolean') {
    helios.setLoop(event.data.loop);
  }
  break;
```

**`index.ts`**:
```typescript
// attributeChangedCallback
if (name === "loop") {
  if (this.controller) {
    this.controller.setLoop(this.hasAttribute("loop"));
  }
}

// setController
if (this.hasAttribute("loop")) {
  this.controller.setLoop(true);
}

// updateUI
// REMOVE the block that checks `isFinished && this.hasAttribute("loop")` and seeks to 0.
```

## 4. Test Plan
- **Verification**: `npm run build -w packages/player && npm test -w packages/player`
- **Success Criteria**:
    - Build passes (confirming `Helios` core type has `setLoop`).
    - Unit tests pass.
    - `DirectController` test confirms `instance.setLoop` is called.
    - `BridgeController` test confirms `HELIOS_SET_LOOP` message is sent.
