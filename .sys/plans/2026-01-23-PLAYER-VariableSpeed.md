# 2026-01-23-PLAYER-VariableSpeed.md

#### 1. Context & Goal
- **Objective**: Implement variable playback speed controls in `<helios-player>` and the underlying `HeliosController`.
- **Trigger**: Vision gap - README calls for "variable speed" controls, but `HeliosController` lacks `setPlaybackRate` and the UI has no speed toggle.
- **Impact**: Enables users to preview animations in slow motion (debug) or fast forward. Unlocks the "Variable speed" feature promised in the vision.

#### 2. File Inventory
- **Modify**: `packages/player/src/controllers.ts`
  - Update `HeliosController` interface to include `setPlaybackRate(rate: number): void`.
  - Implement `setPlaybackRate` in `DirectController` and `BridgeController`.
- **Modify**: `packages/player/src/bridge.ts`
  - Add `HELIOS_SET_PLAYBACK_RATE` case to message listener.
- **Modify**: `packages/player/src/index.ts`
  - Add Speed Selector UI (dropdown) to Shadow DOM.
  - Bind UI change to `controller.setPlaybackRate()`.
  - Update UI to reflect current rate from state.

#### 3. Implementation Spec
- **Architecture**:
  - Extend the `HeliosController` interface to support `setPlaybackRate`.
  - Use the existing Bridge pattern to propagate this command to the iframe via `postMessage`.
  - Update the `<helios-player>` UI to include a `<select>` element for standard speeds (0.25x, 0.5x, 1x, 2x).
- **Public API Changes**:
  - `HeliosController.setPlaybackRate(rate: number): void`
- **Pseudo-Code**:
  ```typescript
  // controllers.ts
  interface HeliosController {
    // ...
    setPlaybackRate(rate: number): void;
  }

  class DirectController {
    setPlaybackRate(rate) { this.instance.setPlaybackRate(rate); }
  }

  class BridgeController {
    setPlaybackRate(rate) { this.iframeWindow.postMessage({ type: 'HELIOS_SET_PLAYBACK_RATE', rate }, '*'); }
  }

  // bridge.ts
  case 'HELIOS_SET_PLAYBACK_RATE':
    if (typeof data.rate === 'number') {
        helios.setPlaybackRate(data.rate);
    }
    break;

  // index.ts UI
  // Add <select class="speed-selector">...</select>
  // On change: controller.setPlaybackRate(parseFloat(value));
  ```
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  - Run `npm run build -w packages/player` to ensure type safety.
  - Run `grep "setPlaybackRate" packages/player/src/controllers.ts` to verify API update.
  - Run `grep "speed-selector" packages/player/src/index.ts` to verify UI update.
- **Success Criteria**:
  - Build succeeds.
  - Grep commands return matches.
- **Edge Cases**:
  - Negative rates (reverse play) - Supported by Core, allowed by API.
  - Rate = 0 - Allowed.
