# Plan: Standard Media API Gap Fill

#### 1. Context & Goal
- **Objective**: Implement missing `HTMLMediaElement` properties and methods in `<helios-player>` to achieve full parity with the standard interface.
- **Trigger**: The `.jules/PLAYER.md` journal highlights gaps in "Standard Media API" implementation (specifically `canPlayType` and others) which prevents compatibility with standard video wrapper libraries.
- **Impact**: Enables `<helios-player>` to be used as a drop-in replacement for `<video>` elements in third-party libraries (e.g. video.js, React players) without throwing runtime errors due to missing properties.

#### 2. File Inventory
- **Modify**: `packages/player/src/index.ts`
  - Implement `canPlayType(type: string): CanPlayTypeResult`
  - Implement `defaultMuted` (getter/setter)
  - Implement `defaultPlaybackRate` (getter/setter)
  - Implement `preservesPitch` (getter/setter)
  - Implement `srcObject` (getter/setter)
  - Implement `crossOrigin` (getter/setter)
- **Modify**: `packages/player/src/api_parity.test.ts`
  - Add unit tests verifying existence and behavior of new properties.
- **Read-Only**: `packages/player/src/controllers.ts` (reference only)

#### 3. Implementation Spec
- **Architecture**: Extend the `HeliosPlayer` class (which inherits from `HTMLElement`) to include the missing members of the `HTMLMediaElement` interface.
- **Pseudo-Code**:
  ```typescript
  class HeliosPlayer extends HTMLElement {
    // ... existing code ...

    // defaultMuted reflects the 'muted' attribute state
    get defaultMuted() { return this.hasAttribute('muted'); }
    set defaultMuted(val) { val ? this.setAttribute('muted', '') : this.removeAttribute('muted'); }

    // defaultPlaybackRate is a property store (default 1.0)
    private _defaultPlaybackRate = 1.0;
    get defaultPlaybackRate() { return this._defaultPlaybackRate; }
    set defaultPlaybackRate(val) { this._defaultPlaybackRate = val; this.dispatchEvent(new Event('ratechange')); }

    // preservesPitch is a property store (default true)
    private _preservesPitch = true;
    get preservesPitch() { return this._preservesPitch; }
    set preservesPitch(val) { this._preservesPitch = val; } // No-op for now, but stores state

    // srcObject is not supported but required by interface
    get srcObject() { return null; }
    set srcObject(val) { console.warn("HeliosPlayer does not support srcObject"); }

    // crossOrigin reflects 'crossorigin' attribute
    get crossOrigin() { return this.getAttribute('crossorigin'); }
    set crossOrigin(val) { val ? this.setAttribute('crossorigin', val) : this.removeAttribute('crossorigin'); }

    // canPlayType required by interface
    canPlayType(type: string): CanPlayTypeResult {
      // We strictly play Helios compositions, not standard video MIME types.
      // Return empty string to be spec-compliant for video/mp4 etc.
      return "";
    }
  }
  ```
- **Public API Changes**: Adds `defaultMuted`, `defaultPlaybackRate`, `preservesPitch`, `srcObject`, `crossOrigin`, `canPlayType` to the `HeliosPlayer` instance.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm test -w packages/player` to execute Vitest suite.
- **Success Criteria**:
  - `api_parity.test.ts` passes with new tests.
  - `canPlayType` returns string.
  - `defaultMuted` toggles `muted` attribute.
  - `srcObject` accepts assignment without crashing (logs warning).
- **Edge Cases**:
  - Assigning `null` or `undefined` to properties.
  - `crossOrigin` set to invalid string (should just reflect attribute).
