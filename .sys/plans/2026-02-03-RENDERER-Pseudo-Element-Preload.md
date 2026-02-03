# Context & Goal
- **Objective**: Implement asset preloading for CSS pseudo-elements (`::before` and `::after`) in `DomStrategy` to resolve status hallucination and prevent visual artifacts.
- **Trigger**: Journal entry `[1.62.1]` identified that this feature was claimed as "Completed" in 1.62.0 but missing from the codebase.
- **Impact**: Ensures "Zero-Artifact Rendering" for advanced CSS compositions that use pseudo-elements for backgrounds or masks (e.g., stylized frames, overlays).

# File Inventory
- **Create**: `packages/renderer/tests/verify-pseudo-element-preload.ts`
  - **Purpose**: A regression test that renders a page with a `::before` background image and asserts it is preloaded.
- **Modify**: `packages/renderer/src/strategies/DomStrategy.ts`
  - **Change**: Update the injected `prepare()` script to inspect pseudo-element styles.
- **Read-Only**: `packages/renderer/src/utils/dom-scanner.ts`

# Implementation Spec
- **Architecture**: Expand the existing DOM traversal logic in `DomStrategy.prepare` to explicitly query `window.getComputedStyle(el, '::before')` and `window.getComputedStyle(el, '::after')`.
- **Pseudo-Code**:
  ```text
  FUNCTION prepare(page):
    INJECT SCRIPT:
      FUNCTION findAllElements(root):
        RECURSIVELY gather all DOM elements (including Shadow DOM)

      SET backgroundUrls = NEW Set()

      FOR EACH element IN allElements:
        DEFINE targets = [null, '::before', '::after']

        FOR EACH pseudo IN targets:
          SET style = window.getComputedStyle(element, pseudo)

          FOR EACH prop IN ['backgroundImage', 'maskImage', 'webkitMaskImage']:
            SET value = style[prop]
            IF value exists AND value != 'none':
              EXTRACT urls using regex /url\((['"]?)(.*?)\1\)/
              ADD urls TO backgroundUrls

      IF backgroundUrls.size > 0:
        LOG "Preloading X background images..."
        WAIT for all images to load (new Image().src = url)
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

# Test Plan
- **Verification**: `npx ts-node packages/renderer/tests/verify-pseudo-element-preload.ts`
- **Success Criteria**:
  - The test script intercepts network requests.
  - It confirms that `http://example.com/pseudo-bg.png` (defined in a `::before` style) is requested *during* the `prepare()` phase.
  - The script outputs "✅ Verification Passed".
- **Edge Cases**:
  - Elements with no pseudo-elements (should not error).
  - Pseudo-elements with no background images.
  - Multiple URLs in one property (already handled by existing regex logic).
