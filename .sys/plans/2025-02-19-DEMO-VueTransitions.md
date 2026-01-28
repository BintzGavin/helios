# Context & Goal
- **Objective**: Scaffold a new example `examples/vue-transitions` demonstrating how to synchronize standard CSS animations with the Helios timeline in Vue.
- **Trigger**: The README promotes "Use What You Know" and framework-agnostic support. While React and Svelte have "Transitions" examples demonstrating `autoSyncAnimations` with `animation-delay`, Vue lacks this specific example, creating a gap in the documentation.
- **Impact**: Provides Vue developers with a clear pattern for creating complex sequences using standard CSS animations, without needing heavy JavaScript animation libraries.

# File Inventory
- **Create**:
    - `examples/vue-transitions/vite.config.js`: Vue-specific build config.
    - `examples/vue-transitions/composition.html`: HTML entry point.
    - `examples/vue-transitions/src/main.js`: Entry script initializing Vue app.
    - `examples/vue-transitions/src/App.vue`: Main composition using `autoSyncAnimations` and standard CSS.
    - `examples/vue-transitions/src/components/Sequence.vue`: Helper component to inject `--sequence-start` CSS variable.
- **Modify**:
    - `vite.build-example.config.js`: Add `vue_transitions` to input.
    - `tests/e2e/verify-render.ts`: Add verification case for `vue-transitions`.
- **Read-Only**:
    - `examples/vue-canvas-animation/vite.config.js` (reference)
    - `examples/react-transitions/src/App.jsx` (reference logic)

# Implementation Spec
- **Architecture**:
    - Use `vite` with `@vitejs/plugin-vue`.
    - `Helios` instance initialized with `autoSyncAnimations: true`.
    - `Sequence.vue` component that renders a `<div>` with `display: contents` and a style attribute setting `--sequence-start: ${from / fps}s`.
    - `App.vue` defines standard CSS animations (`@keyframes`) and applies them to elements wrapped in `<Sequence>`.
    - Animated elements use `animation-delay: var(--sequence-start)` to sync their start time relative to the sequence.
- **Dependencies**: `vue`, `@helios-engine/core`.
- **Modifications**:
    - **`vite.build-example.config.js`**:
      ```javascript
      // Add inside rollupOptions.input:
      vue_transitions: resolve(__dirname, "examples/vue-transitions/composition.html"),
      ```
    - **`tests/e2e/verify-render.ts`**:
      ```typescript
      // Add to CASES array:
      { name: 'Vue Transitions', relativePath: 'examples/vue-transitions/composition.html', mode: 'dom' as const },
      ```

# Test Plan
- **Verification**:
    1.  Run `npm install` (to ensure deps).
    2.  Run `npm run build:examples` to verify build config.
    3.  Run `npx ts-node tests/e2e/verify-render.ts` to verify the new example renders correctly.
- **Success Criteria**:
    - Build completes without error.
    - Verification script passes for `vue-transitions` (outputs "PASS").
- **Edge Cases**:
    - Verify that `display: contents` in `Sequence.vue` prevents layout shifts.
    - Ensure `autoSyncAnimations` works correctly with Vue's reactivity system.

# Pre-commit Steps
- Ensure proper testing, verification, review, and reflection are done.
