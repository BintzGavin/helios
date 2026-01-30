# Plan: Verify Promo Video Example

## 1. Context & Goal
- **Objective**: Officially integrate the `examples/promo-video` example into the verification pipeline and documentation.
- **Trigger**: The example exists but is effectively "orphaned" (not verified in CI, not listed in status), leaving a gap in the "Realistic Examples" backlog item.
- **Impact**: Ensures the "flagship" promo video is maintained and verifies the engine's capability to handle complex, multi-scene GSAP animations.

## 2. File Inventory
- **Modify**: `tests/e2e/verify-render.ts` (Add to `CASES` registry)
- **Modify**: `package.json` (Add `dev:promo` convenience script)
- **Modify**: `docs/status/DEMO.md` (Update status and version)
- **Read-Only**: `examples/promo-video/composition.html`

## 3. Implementation Spec
- **Verification Script**:
  - Add the following object to the `CASES` array in `tests/e2e/verify-render.ts`:
    ```typescript
    { name: 'Promo Video', relativePath: 'examples/promo-video/composition.html', mode: 'dom' as const },
    ```
- **NPM Scripts**:
  - Add `"dev:promo": "vite serve examples/promo-video"` to the `scripts` object in `package.json`.
- **Documentation**:
  - Update `docs/status/DEMO.md`:
    - Increment version to `v1.60.0`.
    - Add `[v1.60.0] ✅ Completed: Verify Promo Video - Integrated examples/promo-video into verification pipeline and documentation.` to the Log.
    - Add `Promo Video: ✅ examples/promo-video exists and works (Demonstrates complex multi-scene GSAP animation).` to the Current State list.

## 4. Test Plan
- **Verification**:
  1. Run `npm run build:examples` to ensure the example builds.
  2. Run `npx tsx tests/e2e/verify-render.ts` to execute the verification suite.
- **Success Criteria**:
  - `verify-render.ts` output includes `✅ Promo Video Passed!`.
  - `output/promo-video-render-verified.mp4` is generated and contains the video.
- **Edge Cases**:
  - **Network Dependency**: The example uses Google Fonts. If the verification environment is offline, fonts may fallback or fail. This is acceptable for a demo but should be noted if verification fails with network errors.
