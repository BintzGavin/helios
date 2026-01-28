# Context & Goal
- **Objective**: Implement standard `HTMLMediaElement` properties (`src`, `loop`, `autoplay`, `controls`, `preload`, `poster`) on the `HeliosPlayer` class to match the `HTMLVideoElement` interface.
- **Trigger**: Vision gap identified—standard media attributes are not exposed as properties on the DOM element, preventing standard programmatic usage.
- **Impact**: Improves interoperability and allows developers to use familiar patterns (e.g., `player.loop = true`) instead of `setAttribute`.

# File Inventory
- **Modify**: `packages/player/src/index.ts`
  - Add getters and setters for the missing properties.
- **Modify**: `packages/player/src/index.test.ts`
  - Add unit tests to verify the new properties reflect attributes correctly.
- **Read-Only**: `packages/player/src/controllers.ts`

# Implementation Spec
- **Architecture**: Use standard Custom Element attribute reflection pattern.
- **Public API Changes**:
  - `get/set src` (string): Reflects `src` attribute.
  - `get/set loop` (boolean): Reflects `loop` attribute.
  - `get/set autoplay` (boolean): Reflects `autoplay` attribute.
  - `get/set controls` (boolean): Reflects `controls` attribute.
  - `get/set preload` (string): Reflects `preload` attribute (defaults to "auto").
  - `get/set poster` (string): Reflects `poster` attribute.
- **Pseudo-Code**:
  ```typescript
  // In HeliosPlayer class

  get loop() {
    return this.hasAttribute("loop");
  }
  set loop(val) {
    if (val) this.setAttribute("loop", "");
    else this.removeAttribute("loop");
  }

  get autoplay() {
    return this.hasAttribute("autoplay");
  }
  set autoplay(val) {
    if (val) this.setAttribute("autoplay", "");
    else this.removeAttribute("autoplay");
  }

  get controls() {
    return this.hasAttribute("controls");
  }
  set controls(val) {
    if (val) this.setAttribute("controls", "");
    else this.removeAttribute("controls");
  }

  get src() {
    return this.getAttribute("src") || "";
  }
  set src(val) {
    this.setAttribute("src", val);
  }

  get poster() {
    return this.getAttribute("poster") || "";
  }
  set poster(val) {
    this.setAttribute("poster", val);
  }

  get preload() {
    return this.getAttribute("preload") || "auto";
  }
  set preload(val) {
    this.setAttribute("preload", val);
  }
  ```
- **Dependencies**: None.

# Test Plan
- **Verification**: `npm test -w packages/player`
- **Success Criteria**:
  - New tests in `index.test.ts` pass.
  - Properties correctly update attributes.
  - Attributes correctly update properties.
- **Edge Cases**:
  - Setting `src` to null/undefined (should handle gracefully or let native behavior persist).
