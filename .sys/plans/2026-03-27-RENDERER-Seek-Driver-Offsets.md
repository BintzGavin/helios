# Plan: Implement Offset and Seek Support in SeekTimeDriver

## 1. Context & Goal
- **Objective**: Update `SeekTimeDriver` to correctly calculate `currentTime` for media elements (`<video>`, `<audio>`) that use `data-helios-offset` and `data-helios-seek` attributes.
- **Trigger**: "Vision Gap" - `DomStrategy` supports these attributes for audio mixing, but the visual rendering (driven by `SeekTimeDriver`) ignores them, causing video elements to play out of sync (always starting from 0).
- **Impact**: This unlocks correct sequencing of video clips in "DOM Mode" compositions, essential for multi-clip editing.

## 2. File Inventory
- **Modify**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
  - Update `setTime` method to include offset/seek calculation logic in the injected script.
- **Create**: `packages/renderer/tests/verify-seek-driver-offsets.ts`
  - A new test script to verify that video elements with offsets/seeks are at the correct `currentTime` for a given global time.

## 3. Implementation Spec

### Architecture
- The logic resides entirely within the `setTime` method of `SeekTimeDriver`.
- It executes inside the browser context (via `page.evaluate`) to manipulate DOM elements directly.
- It iterates over all `<video>` and `<audio>` elements.

### Pseudo-Code
```javascript
// Inside SeekTimeDriver.setTime(page, t) script injection:

FOR EACH element in document.querySelectorAll('video, audio'):
  PAUSE element

  // Parse attributes (default to 0)
  parsedOffset = parseFloat(element.dataset.heliosOffset) OR 0
  parsedSeek = parseFloat(element.dataset.heliosSeek) OR 0

  // Calculate target time
  // Formula: GlobalTime - Offset + InPoint
  targetTime = MAX(0, t - parsedOffset + parsedSeek)

  SET element.currentTime = targetTime
```

### Dependencies
- None.

## 4. Test Plan

### Verification
- **Command**: `npx tsx packages/renderer/tests/verify-seek-driver-offsets.ts`
- **Test Logic**:
  1. Launch Playwright.
  2. Inject HTML with 4 video elements:
     - `v1`: `offset="2"`
     - `v2`: `seek="5"`
     - `v3`: `offset="2" seek="5"`
     - `v4`: `(default)`
  3. `driver.setTime(1.0)`:
     - Expect `v1` = 0 (before start)
     - Expect `v2` = 6 (1 + 5)
     - Expect `v3` = 4 (1 - 2 + 5)
     - Expect `v4` = 1
  4. `driver.setTime(3.0)`:
     - Expect `v1` = 1 (3 - 2)
     - Expect `v2` = 8 (3 + 5)
     - Expect `v3` = 6 (3 - 2 + 5)
     - Expect `v4` = 3

### Success Criteria
- The test script outputs "✅ SUCCESS: SeekTimeDriver respects offsets and seeks." and exits with code 0.
