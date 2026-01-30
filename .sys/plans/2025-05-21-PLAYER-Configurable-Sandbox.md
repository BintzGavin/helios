# 2025-05-21-PLAYER-Configurable-Sandbox

#### 1. Context & Goal
- **Objective**: Implement a configurable `sandbox` attribute on `<helios-player>` to allow users to customize iframe security flags.
- **Trigger**: Vision gap "Sandboxed iframe" - the current implementation hardcodes `allow-scripts allow-same-origin`, preventing strict isolation (Bridge Mode only) or other security configurations.
- **Impact**: Enables "Strict Mode" (no `allow-same-origin`) for secure embedding of untrusted content, and allows enabling other flags (e.g., `allow-forms`) if needed.

#### 2. File Inventory
- **Create**: `packages/player/src/sandbox.test.ts` (New test file for sandbox logic)
- **Modify**: `packages/player/src/index.ts` (Implement sandbox attribute logic)
- **Read-Only**: `packages/player/src/index.test.ts` (Reference for test structure)

#### 3. Implementation Spec
- **Architecture**:
  - Standard Web Component `observedAttributes` pattern.
  - Logic to merge default flags if attribute is missing, or use user-provided flags if present.
  - Iframe reload mechanism to apply new sandbox flags (since changing the attribute on an existing iframe requires navigation/reload to take effect).
- **Pseudo-Code**:
  ```typescript
  // In HeliosPlayer class
  static get observedAttributes() {
      return [..., "sandbox"];
  }

  // Getter/Setter
  get sandbox() { return this.getAttribute("sandbox") || ""; }
  set sandbox(val) { this.setAttribute("sandbox", val); }

  // In attributeChangedCallback
  if (name === "sandbox") {
      const newVal = this.getAttribute("sandbox");
      // If attribute is missing (null), use default "allow-scripts allow-same-origin"
      // If attribute is present (even empty), use it as is (empty means strict sandbox)
      const flags = newVal === null ? "allow-scripts allow-same-origin" : newVal;

      if (this.iframe.getAttribute("sandbox") !== flags) {
          this.iframe.setAttribute("sandbox", flags);
          // Reload if src is set to apply new flags
          if (this.getAttribute("src")) {
              this.loadIframe(this.getAttribute("src"));
          }
      }
  }

  // In connectedCallback or constructor
  // Ensure default is set if attribute is missing
  if (!this.hasAttribute("sandbox")) {
      this.iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");
  }
  ```
- **Public API Changes**:
  - New attribute `sandbox` on `<helios-player>`.
  - New property `sandbox` on `HeliosPlayer` class.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm test -w packages/player`
- **Success Criteria**:
  - `packages/player/src/sandbox.test.ts` passes.
  - Tests should verify:
    1. Default behavior: `iframe` has `allow-scripts allow-same-origin`.
    2. Custom attribute: `<helios-player sandbox="allow-scripts">` results in `iframe` having `allow-scripts`.
    3. Removal: Removing `sandbox` attribute reverts `iframe` to default.
    4. Reload: Changing `sandbox` attribute triggers `loadIframe` (mock or spy check).
- **Edge Cases**:
  - Empty string `sandbox=""` (should be applied as empty string, strict sandbox).
  - Removing attribute should restore default.
