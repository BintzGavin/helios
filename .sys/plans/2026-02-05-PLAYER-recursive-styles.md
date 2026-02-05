#### 1. Context & Goal
- **Objective**: Implement recursive inlining of external stylesheets for DOM exports.
- **Trigger**: Vision Gap - "Robust DOM Export" fails to capture styles linked inside Shadow DOM.
- **Impact**: Enables correct visual export of Web Components that rely on external CSS.

#### 2. File Inventory
- **Create**: (None)
- **Modify**:
  - `packages/player/src/features/dom-capture.ts`: Implement recursive style inlining logic.
  - `packages/player/src/features/dom-capture.test.ts`: Add test case for Shadow DOM external styles.
- **Read-Only**: `packages/player/src/features/dom-capture.ts`

#### 3. Implementation Spec
- **Architecture**: Extend `captureDomToBitmap` pipeline to include a new recursive pass `inlineStyles` that traverses Shadow DOM templates.
- **Pseudo-Code**:
  ```typescript
  async function inlineStyles(original, clone) {
      // 1. Traverse clone (and templates for Shadow DOM)
      // 2. If <link rel="stylesheet"> found:
      //    a. Fetch CSS
      //    b. Process CSS (inline assets)
      //    c. Replace <link> with <style>
  }
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run test:player`
- **Success Criteria**: New test case "should inline external stylesheets in shadow DOM" passes.
- **Edge Cases**: Network errors (handled by catch), Relative URLs in CSS (handled by `processCss`).
