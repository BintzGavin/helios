# 2026-04-21-PLAYER-Import-SRT-Captions.md

## 1. Context & Goal
- **Objective**: Enable `<helios-player>` to load external SRT captions via the standard `<track>` element.
- **Trigger**: Vision Gap - `README.md` lists "Caption/subtitle import (SRT)" as a planned feature. Currently, the player can only render captions if they are already present in the core state.
- **Impact**: Users can declaratively add captions to their compositions using standard HTML semantics (`<track src="subs.srt" kind="captions" default>`), improving accessibility and developer experience.

## 2. File Inventory
- **Modify**: `packages/player/src/controllers.ts`
  - Update `HeliosController` interface to include `setCaptions`.
  - Update `DirectController` and `BridgeController` to implement `setCaptions`.
- **Modify**: `packages/player/src/bridge.ts`
  - Update `connectToParent` to handle `HELIOS_SET_CAPTIONS` message and call `helios.setCaptions`.
- **Modify**: `packages/player/src/index.ts`
  - Add a hidden `<slot>` to the Shadow DOM.
  - Implement `slotchange` listener to detect `<track>` elements.
  - Implement fetching logic for `.srt` files and call `controller.setCaptions`.
  - Ensure initial tracks are processed on connection.
- **Create**: `packages/player/src/captions.test.ts`
  - Unit tests to verify `<track>` detection and controller calls.

## 3. Implementation Spec

### Architecture
- **Web Component**: Uses a `<slot>` in the Shadow DOM to access Light DOM `<track>` children.
- **Controller Pattern**: Extends the `HeliosController` interface to expose `setCaptions`, mirroring the Core API.
- **Bridge Protocol**: Adds `HELIOS_SET_CAPTIONS` message to synchronize captions from the Player (Parent) to the Composition (Child).

### Pseudo-Code

**packages/player/src/index.ts**
```typescript
// In template
// <style> slot { display: none; } </style>
// <slot></slot>

// In HeliosPlayer class
connectedCallback() {
  // ... existing code
  this.shadowRoot.querySelector('slot').addEventListener('slotchange', this.handleSlotChange);
  // Initial check
  this.handleSlotChange();
}

handleSlotChange = () => {
  const tracks = this.shadowRoot.querySelector('slot').assignedElements();
  // Find first default caption track
  const captionTrack = tracks.find(t => t.tagName === 'TRACK' && t.kind === 'captions' && t.hasAttribute('default'));

  if (captionTrack && captionTrack.src && this.controller) {
    fetch(captionTrack.src)
      .then(res => res.text())
      .then(srt => {
        this.controller.setCaptions(srt);
      })
      .catch(err => console.error("Failed to load captions", err));
  }
}

// Also call handleSlotChange when controller connects to ensure pending tracks are loaded
private setController(controller) {
  // ... existing code
  this.controller = controller;
  this.handleSlotChange();
}
```

**packages/player/src/controllers.ts**
```typescript
interface HeliosController {
  // ... existing methods
  setCaptions(captions: string | CaptionCue[]): void;
}

// DirectController
setCaptions(captions) { this.instance.setCaptions(captions); }

// BridgeController
setCaptions(captions) { this.iframeWindow.postMessage({ type: 'HELIOS_SET_CAPTIONS', captions }, '*'); }
```

**packages/player/src/bridge.ts**
```typescript
// In connectToParent message handler
case 'HELIOS_SET_CAPTIONS':
  if (event.data.captions) {
    helios.setCaptions(event.data.captions);
  }
  break;
```

### Public API Changes
- `<helios-player>` now reacts to `<track kind="captions" src="..." default>` children.
- `HeliosController` adds `setCaptions(captions: string | CaptionCue[])`.

### Dependencies
- `@helios-project/core` (Already available, needed for `CaptionCue` type).

## 4. Test Plan
- **Verification**: `npm test packages/player`
- **Success Criteria**:
  - New test `captions.test.ts` passes.
  - Test should mock `fetch`, append a `<track>` to `<helios-player>`, and verify `controller.setCaptions` is called with the mock SRT content.
- **Edge Cases**:
  - Track without `default` attribute (should be ignored).
  - Track with invalid `src` (should handle fetch error gracefully).
