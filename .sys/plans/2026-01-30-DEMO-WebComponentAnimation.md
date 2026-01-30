# Plan: Scaffold Web Component Animation Example

## 1. Context & Goal
- **Objective**: Create a new example `examples/web-component-animation` that demonstrates how to use Helios with native Web Components and Shadow DOM.
- **Trigger**: "Use What You Know" promise implies support for the Web Platform standard (Web Components), but no example exists.
- **Impact**: Validates Helios integration with Shadow DOM CSS animations and `autoSyncAnimations`. This also serves as a regression test for `DomDriver`'s ability to handle Shadow DOM boundaries.

## 2. File Inventory
- **Create**:
  - `examples/web-component-animation/composition.html`: Entry point.
  - `examples/web-component-animation/src/main.ts`: Main logic and Helios initialization.
  - `examples/web-component-animation/src/components/MyCard.ts`: Custom Element with Shadow DOM and CSS animations.
  - `examples/web-component-animation/vite.config.js`: Configuration for local dev server.
- **Modify**:
  - `vite.build-example.config.js`: Add the new example to the build pipeline.
  - `tests/e2e/verify-render.ts`: Add a verification test case for the new example.

## 3. Implementation Spec
- **Architecture**: Vanilla TypeScript with Native Web Components. No framework dependencies.
- **Pseudo-Code**:
  - `MyCard.ts`:
    - Extend `HTMLElement`.
    - `attachShadow({ mode: 'open' })`.
    - Define template with styles (CSS `@keyframes`) and markup.
    - Animate a visual element (e.g., a pulsing card) using standard CSS animations.
  - `main.ts`:
    - Import `Helios` from core.
    - Register `customElements.define('my-card', MyCard)`.
    - Initialize `new Helios({ fps: 30, duration: 5, autoSyncAnimations: true })`.
    - `helios.bindToDocumentTimeline()`.
- **Public API Changes**: None.
- **Dependencies**: None (uses existing Core).

## 4. Test Plan
- **Verification**:
  - Run `npm run build:examples`.
  - Run `npx tsx tests/e2e/verify-render.ts`.
- **Success Criteria**:
  - The build succeeds.
  - The `verify-render.ts` script successfully renders the web component example to an MP4.
  - The MP4 shows the animation moving (verifying `autoSyncAnimations` works or finding that it fails, which is also a valuable result).
- **Edge Cases**:
  - Shadow DOM isolation preventing `document.getAnimations()` from finding the animations. (If this happens, the verification might produce a static video, which is acceptable for this task as it identifies a Core gap).
