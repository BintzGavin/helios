# P-2026-03-27-RENDERER-DomTransparency

## 1. Context & Goal
- **Objective**: Enable transparent video export in DOM mode by configuring Playwright to capture screenshots with `omitBackground: true` when the output format supports alpha.
- **Trigger**: Gap in Vision ("Versatile" rendering) vs Reality (`DomStrategy` ignores transparency). The current implementation renders opaque backgrounds even when `yuva420p` is requested.
- **Impact**: Unlocks the creation of transparent overlays, lower-thirds, and HUDs using standard HTML/CSS, a key feature for video composition.

## 2. File Inventory
- **Create**: `packages/renderer/tests/verify-dom-transparency.ts`
- **Modify**: `packages/renderer/src/strategies/DomStrategy.ts`
- **Read-Only**: `packages/renderer/src/types.ts`

## 3. Implementation Spec
- **Architecture**:
  - Update `DomStrategy.capture` to inspect `this.options.pixelFormat`.
  - Use a heuristic to detect if the requested pixel format supports alpha (e.g., contains "yuva", "rgba", "bgra", "argb", "abgr").
  - If alpha is supported AND `intermediateImageFormat` is NOT 'jpeg' (which doesn't support transparency), pass `omitBackground: true` to `page.screenshot()`.

- **Pseudo-Code**:
  ```typescript
  // packages/renderer/src/strategies/DomStrategy.ts

  async capture(page, frameTime) {
      CALCULATE format = options.intermediateImageFormat OR 'png'
      CALCULATE pixelFormat = options.pixelFormat OR 'yuv420p'

      // Check for alpha capability in the output format
      CALCULATE hasAlpha = pixelFormat startsWith 'yuva' OR
                           pixelFormat includes 'rgba' OR
                           pixelFormat includes 'bgra' OR
                           pixelFormat includes 'argb' OR
                           pixelFormat includes 'abgr'

      IF format IS 'jpeg' THEN
          // JPEGs do not support transparency
          RETURN CALL page.screenshot({ type: 'jpeg', quality: ... })
      ELSE
          // PNG supports transparency
          SET screenshotOptions = { type: 'png' }

          IF hasAlpha THEN
              SET screenshotOptions.omitBackground = true
          END IF

          RETURN CALL page.screenshot(screenshotOptions)
      END IF
  }
  ```

- **Dependencies**: None.

## 4. Test Plan
- **Verification**: Run the new verification script which renders a transparent DOM composition and inspects the output format.
  - Command: `npx ts-node --esm packages/renderer/tests/verify-dom-transparency.ts`
- **Success Criteria**:
  - The script successfully renders a video using `pixelFormat: 'yuva420p'` and `mode: 'dom'`.
  - The script invokes `ffprobe` on the output file.
  - The `pix_fmt` field in the probe output MUST be `yuva420p`.
- **Edge Cases**:
  - `pixelFormat: 'yuv420p'` (default) -> `omitBackground` should be false.
  - `intermediateImageFormat: 'jpeg'` -> `omitBackground` should be false (implied).
