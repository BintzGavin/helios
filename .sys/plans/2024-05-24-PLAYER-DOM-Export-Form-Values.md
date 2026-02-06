# Plan: DOM Export Form Values

#### 1. Context & Goal
- **Objective**: Ensure dynamic form input values (text, checkbox, radio, select, textarea) are preserved during client-side DOM export.
- **Trigger**: The current `dom-capture` implementation uses `cloneNode` which only copies attributes, ignoring user-interaction states like typed text or checked boxes.
- **Impact**: Improves robustness of "DOM Export" mode, ensuring interactive compositions (e.g. dashboards, forms) export exactly as they look.

#### 2. File Inventory
- **Modify**: `packages/player/src/features/dom-capture.ts` (Add `inlineFormValues` logic)
- **Modify**: `packages/player/src/features/dom-capture.test.ts` (Add verification tests)

#### 3. Implementation Spec
- **Architecture**: Introduce a new traversal function `inlineFormValues(original, clone)` in the capture pipeline. This function will synchronize the DOM *properties* (`value`, `checked`, `selected`) from the source elements to the *attributes* (`value`, `checked`, `selected`) of the cloned elements, ensuring `XMLSerializer` includes them.
- **Pseudo-Code**:
  ```typescript
  async function captureDomToBitmap(...) {
    let clone = cloneWithShadow(element);
    // ... existing inlining ...
    inlineFormValues(element, clone); // <--- NEW STEP
    // ... serialization ...
  }

  function inlineFormValues(original: Node, clone: Node) {
    // 1. Check matching nodes
    if (original instanceof HTMLInputElement && clone instanceof HTMLInputElement) {
        clone.setAttribute('value', original.value);
        if (original.type === 'checkbox' || original.type === 'radio') {
             if (original.checked) clone.setAttribute('checked', '');
             else clone.removeAttribute('checked');
        }
    }
    else if (original instanceof HTMLTextAreaElement && clone instanceof HTMLTextAreaElement) {
        clone.textContent = original.value;
    }
    else if (original instanceof HTMLSelectElement && clone instanceof HTMLSelectElement) {
         const options = Array.from(clone.options);
         for (let i = 0; i < options.length; i++) {
             if (i === original.selectedIndex) {
                 options[i].setAttribute('selected', '');
             } else {
                 options[i].removeAttribute('selected');
             }
         }
    }

    // 2. Recurse Children
    const originalChildren = Array.from(original.childNodes);
    const cloneChildren = Array.from(clone.childNodes);

    // Handle Shadow DOM (if cloneWithShadow structure is maintained)
    // Note: cloneWithShadow wraps shadow content in a template with shadowrootmode.
    // We need to peek inside that template if present.
    if (original instanceof Element && original.shadowRoot) {
       const template = cloneChildren.find(n => n instanceof HTMLTemplateElement && n.hasAttribute('shadowrootmode'));
       if (template) {
          inlineFormValues(original.shadowRoot, template.content);
       }
    }

    for (let i = 0; i < Math.min(originalChildren.length, cloneChildren.length); i++) {
        inlineFormValues(originalChildren[i], cloneChildren[i]);
    }
  }
  ```
- **Public API Changes**: None. Internal fix.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm test -w packages/player`
- **Success Criteria**: New unit tests in `dom-capture.test.ts` pass, confirming that:
    - Text inputs retain value.
    - Checkboxes/Radios retain checked state.
    - Textareas retain text.
    - Selects retain selected option.
- **Edge Cases**:
    - `select-multiple` (Should loop and check `selected` property on options)
    - Shadow DOM inputs
    - Nested forms
