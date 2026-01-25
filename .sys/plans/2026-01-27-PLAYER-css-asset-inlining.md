# Plan: Implement Robust CSS Asset Inlining

#### 1. Context & Goal
- **Objective**: Implement parsing and inlining of external assets (Fonts, Images) within CSS stylesheets for robust Client-Side DOM Export.
- **Trigger**: Current DOM export fails to render Custom Fonts and Class-based Background Images because browsers block external resources in `<foreignObject>`/SVG.
- **Impact**: Enables "Standard CSS" support for export, ensuring fonts and background images appear in the output MP4.

#### 2. File Inventory
- **Modify**: `packages/player/src/features/dom-capture.ts`
- **Read-Only**: `packages/player/src/features/dom-capture.test.ts`

#### 3. Implementation Spec
- **Architecture**: Extend the `getExternalStyles` and style collection logic to parse CSS text using Regex, identify `url(...)` tokens, resolve their absolute URLs, fetch them as Data URIs, and replace them in the CSS string before embedding in SVG.
- **Pseudo-Code**:
```typescript
async function processCss(css: string, baseUrl: string): Promise<string> {
  // Find all url(...) patterns
  const matches = Array.from(css.matchAll(/url\((?:['"]?)(.*?)(?:['"]?)\)/g));

  // Use a map to handle duplicates and replacements
  const replacements: { original: string, replacement: string }[] = [];

  for (const match of matches) {
     const originalUrl = match[1];
     if (originalUrl.startsWith('data:')) continue;

     try {
       const absoluteUrl = new URL(originalUrl, baseUrl).href;
       const dataUri = await fetchAsDataUri(absoluteUrl);
       replacements.push({
         original: match[0],
         replacement: `url("${dataUri}")`
       });
     } catch (e) {
       console.warn("Failed to inline asset:", originalUrl, e);
     }
  }

  // Apply replacements
  let processedCss = css;
  for (const { original, replacement } of replacements) {
     processedCss = processedCss.split(original).join(replacement);
  }

  return processedCss;
}

// Update getExternalStyles to use processCss
// Update inlineStyles collection in captureDomToBitmap to use processCss (async)
```
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run build -w packages/player` and `npm test -w packages/player`.
- **Success Criteria**:
  - Existing tests pass.
  - New test case in `dom-capture.test.ts` (mocked) verifies that `url()` inside a `<style>` block is replaced with a Data URI.
- **Edge Cases**:
  - Malformed URLs.
  - Network failures (should warn and keep original URL).
  - Data URIs (should skip).
  - Relative URLs in external stylesheets (should resolve against stylesheet URL).
  - Relative URLs in inline styles (should resolve against document base).
