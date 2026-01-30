# Plan: Enable Shadow DOM Media Sync in CdpTimeDriver

## 1. Context & Goal
- **Objective**: Implement recursive Shadow DOM traversal in `CdpTimeDriver` to synchronize media elements inside Web Components during Canvas Mode rendering.
- **Trigger**: Gap identified in `.jules/RENDERER.md`: `[1.44.0] - CdpTimeDriver Shadow DOM Gap`.
- **Impact**: Enables accurate Canvas Mode rendering for compositions using Web Components with internal media, ensuring deterministic output.

## 2. File Inventory
- **Create**: `packages/renderer/tests/verify-cdp-shadow-dom-sync.ts`
- **Modify**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
- **Read-Only**: `packages/renderer/src/utils/dom-scanner.ts`

## 3. Implementation Spec
- **Architecture**: Update `CdpTimeDriver.setTime` to use a recursive `findAllMedia` function (inlined in the evaluated string) instead of `document.querySelectorAll`.
- **Pseudo-Code**:
  - Define `findAllMedia(root)` within the injected script using `TreeWalker` to traverse Shadow roots recursively.
  - Replace `document.querySelectorAll('video, audio')` with `findAllMedia(document)`.
  - Iterate over discovered elements.
  - Parse `data-helios-offset` and `data-helios-seek` attributes.
  - Calculate `targetTime` based on global `t` and offsets.
  - Set `el.currentTime = targetTime`.
  - **Constraint**: Do not await `seeked` event to avoid CDP deadlock (as per journal `[2026-03-27]`).
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: `npx tsx packages/renderer/tests/verify-cdp-shadow-dom-sync.ts`
- **Success Criteria**:
  - Test script launches browser with `CdpTimeDriver`.
  - Injects a Web Component with a `<video>` element inside Shadow DOM.
  - Sets virtual time.
  - Verifies that `video.currentTime` inside Shadow DOM matches the expected virtual time (within acceptable delta).
- **Edge Cases**:
  - Nested Shadow DOMs.
  - Media elements with `data-helios-offset`.
