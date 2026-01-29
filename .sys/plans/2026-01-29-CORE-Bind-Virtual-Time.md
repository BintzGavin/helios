# 2026-01-29 - Bind Helios to Virtual Time When Present

#### 1. Context & Goal
- **Objective**: Ensure `Helios.bindToDocumentTimeline()` uses renderer-provided virtual time when available.
- **Trigger**: Rendered DOM compositions can desync when `document.timeline.currentTime` advances on wall-clock time while the renderer drives `__HELIOS_VIRTUAL_TIME__`.
- **Impact**: Keeps GSAP/JS-driven timelines aligned to the renderer’s frame stepping in DOM mode.

#### 2. File Inventory
- **Create**:
  - `packages/core/src/index.test.ts` (add coverage for virtual-time binding behavior)
- **Modify**:
  - `packages/core/src/index.ts` (prefer `window.__HELIOS_VIRTUAL_TIME__` when present)
  - `packages/core/src/index.test.ts` (new test cases; no existing logic changes)
- **Read-Only**:
  - `packages/renderer/src/drivers/SeekTimeDriver.ts` (virtual time contract)
  - `packages/core/src/drivers/TimeDriver.ts`
  - `README.md`
  - `docs/status/CORE.md`
  - `.jules/CORE.md`

#### 3. Implementation Spec
- **Architecture**: Treat `__HELIOS_VIRTUAL_TIME__` as the authoritative clock when it exists, falling back to `document.timeline.currentTime` for normal browser preview usage.
- **Pseudo-Code**:
  - IN `bindToDocumentTimeline` poll loop:
    - READ `virtualTime = window.__HELIOS_VIRTUAL_TIME__`
    - IF `virtualTime` is a finite number:
      - SET `currentTime = virtualTime`
    - ELSE:
      - SET `currentTime = document.timeline.currentTime`
    - IF `currentTime` is a finite number:
      - CALCULATE `frame = (currentTime / 1000) * fps`
      - UPDATE `currentFrame` when it differs
      - CALL `driver.update(currentTime, playback state)`
  - UPDATE JSDoc to mention the virtual-time override.
- **Public API Changes**: None.
- **Dependencies**:
  - Renderer plan to formalize the virtual-time contract (ensure `__HELIOS_VIRTUAL_TIME__` exists and is updated).

#### 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
  - New test asserts `currentFrame` advances from `__HELIOS_VIRTUAL_TIME__` when defined.
  - Existing tests remain green.
- **Edge Cases**:
  - `__HELIOS_VIRTUAL_TIME__` undefined (fallback to `document.timeline.currentTime`).
  - `__HELIOS_VIRTUAL_TIME__` is `NaN` or non-number (fallback path).
