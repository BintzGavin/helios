#### 1. Context & Goal
- **Objective**: Enable declarative configuration of composition props via an `input-props` attribute on `<helios-player>`.
- **Trigger**: Vision Gap - `Helios` core supports props, but `<helios-player>` Web Component does not expose them declaratively. This limits the "Drop-in Web Component" vision for parameterized content.
- **Impact**: Unlocks the ability for users to pass dynamic data (text, config, variables) to their compositions using standard HTML attributes, enabling easier integration with CMSs and static site generators.

#### 2. File Inventory
- **Create**: (None)
- **Modify**:
  - `packages/player/src/index.ts`: Add `input-props` to `observedAttributes` and implement handling logic in `attributeChangedCallback` and `setController`.
  - `packages/player/src/index.test.ts`: Add unit tests for the new attribute.
- **Read-Only**:
  - `packages/player/src/controllers.ts`: To confirm `setInputProps` method signature.

#### 3. Implementation Spec
- **Architecture**: Extend the Web Component lifecycle to observe `input-props`. Parse the JSON value and propagate it to the `HeliosController`.
- **Pseudo-Code**:
  ```typescript
  // packages/player/src/index.ts

  static get observedAttributes() {
    return ["src", "width", "height", "autoplay", "loop", "controls", "export-format", "input-props"];
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal) return;
    // ... existing logic ...
    if (name === "input-props") {
       this.updateInputProps(newVal);
    }
  }

  private updateInputProps(jsonString: string) {
     try {
        const props = JSON.parse(jsonString);
        if (this.controller) {
           this.controller.setInputProps(props);
        }
     } catch (e) {
        console.warn("HeliosPlayer: Invalid JSON in input-props attribute", e);
     }
  }

  private setController(controller: HeliosController) {
      // ... existing logic ...

      // Apply initial props if attribute exists
      const propsAttr = this.getAttribute("input-props");
      if (propsAttr) {
          this.updateInputProps(propsAttr);
      }

      // ... subscribe logic ...
  }
  ```
- **Public API Changes**:
  - `<helios-player>` now accepts `input-props` attribute (JSON string).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm test -w packages/player`
- **Success Criteria**:
  - New test case: `should update input props when attribute changes` passes.
  - New test case: `should apply initial input props from attribute` passes.
  - New test case: `should handle invalid JSON in input-props` passes (no crash).
  - All existing tests pass.
- **Edge Cases**:
  - Invalid JSON string (should warn and ignore).
  - Empty string (should probably be treated as invalid or empty props).
  - Attribute set before controller connects (should apply on connect).
  - Attribute update while playing (should flow through to core state).
