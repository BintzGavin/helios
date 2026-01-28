# 📋 PLAYER: Standard Media Properties

#### 1. Context & Goal
- **Objective**: Implement missing Standard Media Element properties (`src`, `autoplay`, `loop`, `controls`, `preload`) on the `HeliosPlayer` class.
- **Trigger**: Vision gap. The "Standard Media API" compliance is incomplete because it lacks property accessors for standard attributes, forcing developers to use `setAttribute`.
- **Impact**: Improves Developer Experience (DX) by aligning with the standard `HTMLMediaElement` interface, allowing intuitive property access (e.g., `player.src = '...'`).

#### 2. File Inventory
- **Modify**:
  - `packages/player/src/index.ts`: Add getters and setters for `src`, `autoplay`, `loop`, `controls`, and `preload`.
  - `packages/player/src/index.test.ts`: Add unit tests to verify property-attribute reflection for these new properties.
- **Read-Only**:
  - `packages/player/src/controllers.ts`: Reference for controller interaction (if needed).

#### 3. Implementation Spec
- **Architecture**: Use the **Attribute Reflection** pattern where property getters read from `getAttribute` (or `hasAttribute` for booleans) and setters write to `setAttribute`/`removeAttribute`. This ensures the DOM attribute and JavaScript property stay in sync.
- **Pseudo-Code**:
  ```typescript
  class HeliosPlayer extends HTMLElement {
    // ... existing code ...

    // String property reflection
    get src() { return this.getAttribute('src') || ''; }
    set src(val) { this.setAttribute('src', val); }

    // Boolean property reflection
    get autoplay() { return this.hasAttribute('autoplay'); }
    set autoplay(val) {
      if (val) this.setAttribute('autoplay', '');
      else this.removeAttribute('autoplay');
    }

    // Loop property
    get loop() { return this.hasAttribute('loop'); }
    set loop(val) {
      if (val) this.setAttribute('loop', '');
      else this.removeAttribute('loop');
    }

    // Controls property
    get controls() { return this.hasAttribute('controls'); }
    set controls(val) {
      if (val) this.setAttribute('controls', '');
      else this.removeAttribute('controls');
    }

    // Preload property (default to 'auto' per spec/impl, or reflect raw string)
    get preload() { return this.getAttribute('preload') || 'auto'; }
    set preload(val) { this.setAttribute('preload', val); }

    // ... existing code ...
  }
  ```
- **Public API Changes**:
  - The `HeliosPlayer` class will now expose `src` (string), `autoplay` (boolean), `loop` (boolean), `controls` (boolean), and `preload` (string) as public read/write properties.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm test -w packages/player`
- **Success Criteria**:
  - New unit tests in `index.test.ts` pass:
    - `should reflect src property to attribute`
    - `should reflect autoplay property to attribute`
    - `should reflect loop property to attribute`
    - `should reflect controls property to attribute`
    - `should reflect preload property to attribute`
  - All existing tests pass.
- **Edge Cases**:
  - Verify that setting boolean properties to `false` removes the attribute.
  - Verify that setting `src` triggers the existing `attributeChangedCallback` logic (handled by DOM, but worth ensuring the setter works).
