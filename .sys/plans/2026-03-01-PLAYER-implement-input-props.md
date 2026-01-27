# 2026-03-01 - Implement Input Props Attribute

#### 1. Context & Goal
- **Objective**: Implement support for the `input-props` attribute on the `<helios-player>` Web Component to allow declarative passing of dynamic data to compositions.
- **Trigger**: Vision Gap - The README states support for `input-props`, and it is essential for dynamic video previewing, but the current Web Component implementation ignores it.
- **Impact**: Enables users and the Studio to drive dynamic compositions (e.g., changing text, colors) directly via the HTML attribute, aligning with the "Web Component encapsulates all UI" vision.

#### 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Implement attribute observation and logic)
- **Modify**: `packages/player/src/index.test.ts` (Add unit tests)
- **Read-Only**: `packages/player/src/controllers.ts` (To verify interface)

#### 3. Implementation Spec
- **Architecture**:
    - Update `HeliosPlayer` class to observe `input-props`.
    - Use a `private pendingProps` field to store parsed props when the controller is not yet ready.
    - Flush `pendingProps` to the controller upon connection (`setController`).
    - Expose a public `inputProps` getter/setter for programmatic access.
- **Pseudo-Code**:
    ```typescript
    class HeliosPlayer extends HTMLElement {
      // ...
      private pendingProps: Record<string, any> | null = null;

      static get observedAttributes() {
        return [..., "input-props"];
      }

      attributeChangedCallback(name, oldVal, newVal) {
        // ...
        if (name === "input-props") {
          try {
            const props = JSON.parse(newVal);
            this.pendingProps = props;
            if (this.controller) {
              this.controller.setInputProps(props);
            }
          } catch (e) {
            console.warn("Invalid JSON in input-props", e);
          }
        }
      }

      private setController(controller) {
        // ...
        this.controller = controller;
        if (this.pendingProps) {
          this.controller.setInputProps(this.pendingProps);
        }
        // ...
      }

      public get inputProps() { return this.pendingProps; }
      public set inputProps(val) {
        this.pendingProps = val;
        if (this.controller) this.controller.setInputProps(val);
      }
    }
    ```
- **Public API Changes**:
    - New attribute: `input-props` (JSON string).
    - New property: `inputProps` (Object).
- **Dependencies**: None. `HeliosController` already supports `setInputProps`.

#### 4. Test Plan
- **Verification**: `npm test -w packages/player`
- **Success Criteria**:
    - New tests in `index.test.ts` pass.
    - Test case 1: Attribute change updates controller.
    - Test case 2: Attribute set before connect updates controller on connect.
    - Test case 3: Invalid JSON is handled safely.
- **Edge Cases**:
    - Empty string passed to attribute.
    - Malformed JSON.
    - `null` passed to property.
