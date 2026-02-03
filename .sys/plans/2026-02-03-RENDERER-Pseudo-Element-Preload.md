# 📋 Spec: Enable Pseudo-Element Preloading in DomStrategy

#### 1. Context & Goal
- **Objective**: Implement discovery and preloading of background images defined in `::before` and `::after` pseudo-elements within `DomStrategy`.
- **Trigger**: Identified a gap where `DomStrategy` preloads standard element backgrounds but misses pseudo-elements, contradicting the documented status and potentially causing visual artifacts (FOUC) in detailed CSS compositions.
- **Impact**: Ensures "Zero-artifact rendering" for advanced CSS techniques used in modern web design (e.g., stylized overlays, complex decorations).

#### 2. File Inventory
- **Modify**: `packages/renderer/src/strategies/DomStrategy.ts`
  - Update `prepare` method to scan pseudo-elements.
- **Create**: `packages/renderer/tests/verify-pseudo-element-preload.ts`
  - New verification script to test this specific scenario.
- **Modify**: `packages/renderer/tests/run-all.ts`
  - Register the new test script.

#### 3. Implementation Spec
- **Architecture**: Extend the existing `DomStrategy.prepare` injection script to iterate over pseudo-elements.
- **Pseudo-Code**:
  - In `DomStrategy.prepare()`:
    - Define `pseudos = [null, '::before', '::after']`.
    - Iterate over `allElements`.
    - For each `element`:
      - For each `pseudo` in `pseudos`:
        - CALL `window.getComputedStyle(element, pseudo)`.
        - EXTRACT `backgroundImage`, `maskImage`, `webkitMaskImage`.
        - IF valid URL found, ADD to `backgroundUrls` Set.
    - PROCEED to existing preloading logic (Promise.all over `backgroundUrls`).

#### 4. Test Plan
- **Verification**: `npx tsx packages/renderer/tests/verify-pseudo-element-preload.ts`
- **Success Criteria**:
  - The verification script creates an HTML page with:
    - `div#test { content: ''; width: 100px; height: 100px; }`
    - `div#test::before { background-image: url('data:image/png;base64,...'); }`
  - The script intercepts network requests (or mocks the image load) and verifies that `DomStrategy` attempts to load the image URL.
  - The renderer log output should confirm "[DomStrategy] Preloading X background images".
