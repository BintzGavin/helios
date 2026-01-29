# 2026-01-29 - Formalize Virtual Time Contract for DOM Rendering

#### 1. Context & Goal
- **Objective**: Guarantee a stable virtual time source (`__HELIOS_VIRTUAL_TIME__`) for compositions that bind Helios to the document timeline during DOM rendering.
- **Trigger**: DOM renders can desync when Helios reads `document.timeline.currentTime` while the renderer advances its own virtual time.
- **Impact**: Ensures Helios-driven timelines (GSAP/JS) track the renderer’s frame stepping deterministically.

#### 2. File Inventory
- **Create**:
  - `packages/renderer/tests/verify-helios-virtual-time.ts` (integration verification for Helios + SeekTimeDriver)
- **Modify**:
  - `packages/renderer/src/drivers/SeekTimeDriver.ts` (document and enforce the virtual-time contract)
- **Read-Only**:
  - `packages/core/src/index.ts` (bind-to-document-timeline behavior)
  - `packages/renderer/src/index.ts`
  - `README.md`
  - `docs/status/RENDERER.md`
  - `.jules/RENDERER.md`

#### 3. Implementation Spec
- **Architecture**: `SeekTimeDriver` owns the global virtual clock and must update it before any animation synchronization so compositions can read it reliably.
- **Pseudo-Code**:
  - IN `init(page)`:
    - SET `window.__HELIOS_VIRTUAL_TIME__ = 0` before page scripts run
    - OVERRIDE `performance.now`, `Date.now`, and `requestAnimationFrame` to use the virtual time
    - ADD comment describing the contract for Helios integration
  - IN `setTime(page, timeInSeconds)`:
    - CALCULATE `timeInMs = timeInSeconds * 1000`
    - SET `window.__HELIOS_VIRTUAL_TIME__ = timeInMs`
    - APPLY WAAPI sync (iterate animations)
    - WAIT for a render tick (single rAF)
- **Public API Changes**: None.
- **Dependencies**:
  - Core plan to consume `__HELIOS_VIRTUAL_TIME__` when binding to the document timeline.

#### 4. Test Plan
- **Verification**: `npx tsx packages/renderer/tests/verify-helios-virtual-time.ts`
- **Success Criteria**:
  - The test loads a page that calls `helios.bindToDocumentTimeline()`.
  - After `setTime(0)`, `currentFrame` is `0`.
  - After `setTime(7.5)`, `currentFrame` equals `7.5 * fps`.
  - After `setTime(14.966...)`, `currentFrame` equals `(totalFrames - 1)`.
- **Edge Cases**:
  - Multiple `setTime` calls in rapid succession.
  - `document.getAnimations()` missing (should not break virtual time updates).
