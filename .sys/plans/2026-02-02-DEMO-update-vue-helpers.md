# 2026-02-02-DEMO-update-vue-helpers.md

#### 1. Context & Goal
- **Objective**: Update `examples/vue-animation-helpers` to demonstrate `interpolate` and `spring` functions from `@helios-project/core`.
- **Trigger**: Vision gap - "Animation Helpers" are a documented feature but not demonstrated in the Vue example (unlike React), violating the "Use What You Know" principle parity.
- **Impact**: Provides feature parity documentation for Vue users, showing how to use core animation primitives reactively within the Vue Composition API.

#### 2. File Inventory
- **Create**: `examples/vue-animation-helpers/src/components/HelperDemo.vue` (New component demonstrating `interpolate` and `spring` usage)
- **Modify**: `examples/vue-animation-helpers/src/App.vue` (Import and use the new `HelperDemo` component)
- **Read-Only**: `packages/core/src/index.ts` (Reference for imports), `tests/e2e/verify-render.ts` (Verification script)

#### 3. Implementation Spec
- **Architecture**:
  - Use Vue Composition API (`script setup`) pattern.
  - Implement a `HelperDemo` component that consumes the `videoFrame` provider using `inject`.
  - Use `computed` properties to wrap `interpolate` and `spring` calls, ensuring reactivity.
- **Pseudo-Code**:
  - `HelperDemo.vue`:
    - Inject `videoFrame`.
    - Create computed `x` using `interpolate(frame.value, [0, 60], [0, 200])`.
    - Create computed `scale` using `spring({ frame: frame.value, fps: 30, from: 0, to: 1 })`.
    - Render a styled `div` using these values.
  - `App.vue`:
    - Import `HelperDemo`.
    - Add `<HelperDemo />` to the template.
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run build:examples && npx ts-node tests/e2e/verify-render.ts "Vue Helpers"`
- **Success Criteria**:
  - Build succeeds without errors.
  - E2E verification passes, generating `output/vue-helpers-render-verified.mp4`.
- **Edge Cases**:
  - Verify `inject` handles missing provider gracefully (though App.vue provides it).
