# Context & Goal
- **Objective**: Create `examples/gsap-animation` to demonstrate how to drive GSAP timelines using Helios.
- **Trigger**: The README promises "Your GSAP timelines... work", but no example demonstrates the required integration pattern (seeking vs playing).
- **Impact**: Validates the "Use What You Know" thesis and provides a copy-pasteable reference for users integrating imperative animation libraries.

# File Inventory
- **Modify**: `package.json`
  - Add `"gsap": "^3.12.0"` to `devDependencies`.
- **Create**: `examples/gsap-animation/composition.html`
  - New example file.
- **Modify**: `vite.build-example.config.js`
  - Add `gsap_animation: resolve(__dirname, "examples/gsap-animation/composition.html")` to `input`.
- **Modify**: `tests/e2e/verify-render.ts`
  - Add `{ name: 'GSAP', relativePath: 'examples/gsap-animation/composition.html', mode: 'dom' }` to `CASES`.

# Implementation Spec
- **Architecture**:
  - Standalone HTML/JS composition (Vanilla JS) rendering DOM elements.
  - Uses `gsap.timeline({ paused: true })` to define animations on standard HTML elements.
  - Subscribes to `helios.subscribe()` to update `tl.seek(time)` on every frame, converting frame number to seconds.
  - Binds to `helios.bindToDocumentTimeline()` for external control.
- **Pseudo-Code (composition.html)**:
  - Create basic HTML structure with a target element (e.g., `.box`).
  - Import `Helios` and `gsap`.
  - Initialize `Helios` with `duration` and `fps`.
  - Call `helios.bindToDocumentTimeline()`.
  - Initialize `gsap.timeline` with `paused: true`.
  - Add tweens to the timeline (e.g., move x, rotate).
  - Subscribe to `helios` state updates:
    - inside callback, calculate `time = currentFrame / fps`.
    - call `tl.seek(time)`.
  - Expose `window.helios` for debugging/player.
- **Dependencies**: `npm install gsap`

# Test Plan
- **Verification**:
  - Run `npm install` (to fetch gsap).
  - Run `npm run build:examples`.
  - Run `npx ts-node tests/e2e/verify-render.ts`.
- **Success Criteria**:
  - `verify-render.ts` passes for GSAP case (using `mode: 'dom'`).
  - `output/gsap-render-verified.mp4` exists and has size > 0.
