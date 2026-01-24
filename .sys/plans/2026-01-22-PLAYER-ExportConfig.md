# 📋 Spec: Player Export Configuration

## 1. Context & Goal
- **Objective**: Implement `export-mode` and `canvas-selector` attributes on `<helios-player>` to provide explicit control over Client-Side Export behavior.
- **Trigger**: Current implementation blindly selects the first canvas found or falls back to DOM export, which is unreliable for multi-canvas compositions or mixed content.
- **Impact**: Enables users to successfully export complex scenes (e.g., specific canvas layers) and forces DOM export when canvas detection gives false positives.

## 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Update `HeliosPlayer` class to read attributes and refine export logic)
- **Read-Only**: `packages/player/src/bridge.ts` (No changes needed, export is client-side driven)

## 3. Implementation Spec
- **Architecture**: Extend the standard Web Component attribute pattern. The `renderClientSide` method will act as the controller, reading configuration state at the moment of execution (JIT configuration).

- **Pseudo-Code**:
  ```text
  METHOD renderClientSide:
    READ attribute "export-mode" (default: "auto")
    READ attribute "canvas-selector" (default: "canvas")

    IF mode is "dom":
      CALL renderDOMToVideo()
      RETURN

    TRY to find canvas element using selector in iframe

    IF canvas found AND (mode is "canvas" OR mode is "auto"):
      CONFIGURE VideoEncoder with found canvas dimensions
      EXECUTE render loop (seek -> wait -> encode)
    ELSE:
      IF mode is "auto":
        LOG "Canvas not found, falling back to DOM"
        CALL renderDOMToVideo()
      ELSE:
        THROW Error "Target canvas not found for selector: [selector]"
  ```

- **Public API Changes**:
  - New Attribute: `export-mode="auto|canvas|dom"`
  - New Attribute: `canvas-selector="[css-selector]"`

- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
  1. Run `npm run build -w packages/player` to ensure type safety.
  2. (Manual) In `examples/simple-animation`, add a second dummy canvas and set `canvas-selector` on the player to target the original one. Confirm export works.
- **Success Criteria**:
  - Build passes.
  - Code correctly handles the `null` case for `querySelector`.
  - DOM fallback triggers correctly in `auto` mode when no canvas matches.
- **Edge Cases**:
  - Selector finds a non-canvas element (should check `instanceof HTMLCanvasElement`).
  - Selector is invalid (catch DOMException).
