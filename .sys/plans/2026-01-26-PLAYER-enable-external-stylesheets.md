# 2026-01-26-PLAYER-enable-external-stylesheets.md

#### 1. Context & Goal
- **Objective**: Update the DOM capture logic to fetch and inline external stylesheets (`<link rel="stylesheet">`) so they appear in exported videos.
- **Trigger**: "Use What You Know" vision gap. Currently, DOM export only captures inline `<style>` blocks, breaking compositions using external CSS (e.g., Tailwind CDN, `style.css`).
- **Impact**: Enables high-fidelity client-side exports for standard web projects, significantly improving the "Canva-like" user experience.

#### 2. File Inventory
- **Create**: `packages/player/src/features/dom-capture.test.ts` - Unit tests for DOM capture logic.
- **Modify**: `packages/player/src/features/dom-capture.ts` - Implement fetching and inlining logic.
- **Read-Only**: `packages/player/src/features/exporter.ts` - Consumer of the capture logic.

#### 3. Implementation Spec
- **Architecture**:
  - Enhance `captureDomToBitmap` to iterate over `document.querySelectorAll('link[rel="stylesheet"]')`.
  - Use `fetch()` to retrieve the CSS content from the `href`.
  - Create a new string containing the gathered external CSS.
  - Prepend these styles to the gathered inline styles in the SVG `<foreignObject>`.
  - Handle failures gracefully (e.g., CORS errors, 404s) by logging a warning and skipping the stylesheet.
- **Pseudo-Code**:
  ```typescript
  async function getExternalStyles(doc) {
    const links = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'));
    const promises = links.map(async link => {
      try {
        const response = await fetch(link.href);
        if (!response.ok) throw new Error(response.statusText);
        return await response.text();
      } catch (e) {
        console.warn('Helios: Failed to inline stylesheet:', link.href, e);
        return '';
      }
    });
    return (await Promise.all(promises)).join('\n');
  }

  // Inside captureDomToBitmap:
  const externalStyles = await getExternalStyles(doc);
  // ... existing inline style collection ...
  // const styles = externalStyles + '\n' + inlineStyles;
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  - Run `npm test -w packages/player` to ensure no regressions and verify the new test file passes.
- **Success Criteria**:
  - `dom-capture.test.ts` passes, verifying that `captureDomToBitmap` attempts to `fetch` linked stylesheets and includes their content in the output SVG.
  - Existing tests in `packages/player` pass.
- **Edge Cases**:
  - Network failure / 404 for stylesheet (should warn and continue).
  - CORS failure (should warn and continue).
  - Mixed content (http vs https) - standard fetch rules apply.
