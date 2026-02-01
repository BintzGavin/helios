# 2026-06-22-PLAYER-Shadow-DOM-Export

#### 1. Context & Goal
- **Objective**: Implement Shadow DOM support in `dom-capture` to allow exporting Web Components using Declarative Shadow DOM (DSD).
- **Trigger**: The current `XMLSerializer` implementation ignores Shadow DOM, causing encapsulated styles and markup to be lost during client-side export (DOM mode). This is a known limitation documented in the journal.
- **Impact**: Unlocks support for exporting compositions that use Web Components, aligning with the "Runs on web standards" vision.

#### 2. File Inventory
- **Modify**: `packages/player/src/features/dom-capture.ts` (Implement `serializeNode` to replace `XMLSerializer`)
- **Modify**: `packages/player/src/features/dom-capture.test.ts` (Add test case for Shadow DOM capture)

#### 3. Implementation Spec
- **Architecture**:
  - Replace the use of `XMLSerializer` with a custom recursive `serializeNode` function.
  - The function will traverse the DOM tree and manually construct the HTML string.
  - It will detect elements with open `shadowRoot` and inject `<template shadowrootmode="open">` containing the serialized shadow content.
- **Pseudo-Code**:
  ```typescript
  function serializeNode(node): string {
    if (node is Text) return escape(node.textContent);
    if (node is Comment) return "<!--" + node.textContent + "-->";
    if (node is Element) {
      string html = "<" + tagName;
      // Attributes
      for each attr in attributes:
        html += " " + attr.name + "=\"" + escape(attr.value) + "\"";
      html += ">";

      // Shadow DOM
      if (node.shadowRoot && node.shadowRoot.mode === 'open') {
        html += "<template shadowrootmode=\"open\">";
        for each child in node.shadowRoot.childNodes:
          html += serializeNode(child);
        html += "</template>";
      }

      // Light DOM
      for each child in node.childNodes:
        html += serializeNode(child);

      html += "</" + tagName + ">";
      return html;
    }
    return "";
  }
  ```
- **Public API Changes**: None. Internal change to `dom-capture.ts`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm test -w packages/player`
- **Success Criteria**:
  - New test case in `dom-capture.test.ts` passes.
  - The test should create a generic HTMLElement with an open shadow root, attach styles and content to it, capture it, and verify the output string contains `<template shadowrootmode="open">` and the inner content.
- **Edge Cases**:
  - Closed shadow roots (cannot be accessed, should be ignored).
  - Nested shadow roots (should be handled recursively).
  - Void elements (e.g. `<img>`, `<input>`) should self-close or not have closing tag (or standard HTML5 serialization).
