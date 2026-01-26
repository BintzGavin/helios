#### 1. Context & Goal
- **Objective**: Refactor `examples/simple-animation` to use native CSS `@keyframes` and `autoSyncAnimations: true`.
- **Trigger**: The current example uses JS-driven CSS variables, which contradicts the project's "Drive the Browser" thesis stated in the README.
- **Impact**: Correctly demonstrates the core value proposition of Helios (native animation support) and simplifies the "Hello World" example.

#### 2. File Inventory
- **Modify**: `examples/simple-animation/composition.html` (Replace JS animation logic with CSS `@keyframes` and enable `autoSyncAnimations`).
- **Read-Only**: `packages/core/dist/index.js` (Import reference).

#### 3. Implementation Spec
- **Architecture**: Use `autoSyncAnimations: true` in `Helios` config to enable the `DomDriver`. Use standard CSS `@keyframes` for the animation logic instead of manual JS updates.
- **Pseudo-Code**:
    - HTML: Keep the container div (e.g., `.animated-box`).
    - CSS:
        - Define a `@keyframes` rule (e.g., `moveAndScale`) that animates `opacity` from 0 to 1 and `transform` (scale/translate) over the duration.
        - Apply this animation to the container class with `linear` easing and `forwards` fill mode.
    - JS:
        - Import `Helios` from core.
        - Instantiate `Helios` with `duration`, `fps`, and `autoSyncAnimations: true`.
        - Call `helios.bindToDocumentTimeline()` to allow external control.
        - Remove the manual `helios.subscribe` loop and the CSS variable setup code.
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm run build:examples` followed by `npx ts-node tests/e2e/verify-render.ts`.
- **Success Criteria**: The `DOM` verification case in `verify-render.ts` passes (i.e., it successfully renders the composition to a video file without errors).
- **Edge Cases**: Ensure the animation seeks correctly during the frame capture process (handled by `DomDriver`).
