# 1. Context & Goal
- **Objective**: Create a new example `examples/vue-components-demo` that demonstrates how to build reusable Vue components (`Timer`, `ProgressBar`, `Watermark`) for Helios compositions.
- **Trigger**: The `AGENTS.md` roadmap emphasizes a "Component Registry" for V2, and while React has a `react-components-demo` showing this pattern, Vue lacks an equivalent example.
- **Impact**: This provides a reference implementation for Vue developers to build and share Helios components, supporting the V2 vision of a component ecosystem.

# 2. File Inventory
- **Create**:
  - `examples/vue-components-demo/composition.html`: Entry point for the example.
  - `examples/vue-components-demo/vite.config.ts`: Build configuration.
  - `examples/vue-components-demo/package.json`: Project metadata.
  - `examples/vue-components-demo/tsconfig.json`: TypeScript configuration.
  - `examples/vue-components-demo/src/main.ts`: Application entry point.
  - `examples/vue-components-demo/src/App.vue`: Main composition component.
  - `examples/vue-components-demo/src/composables/useVideoFrame.ts`: Composable to access video frame.
  - `examples/vue-components-demo/src/components/Timer.vue`: Reusable Timer component.
  - `examples/vue-components-demo/src/components/ProgressBar.vue`: Reusable ProgressBar component.
  - `examples/vue-components-demo/src/components/Watermark.vue`: Reusable Watermark component.
- **Modify**: None.
- **Read-Only**: `examples/react-components-demo/**`, `examples/vue-dom-animation/**`.

# 3. Implementation Spec
- **Architecture**:
  - Use Vite for bundling (standard for examples).
  - Use Vue 3 with Composition API and `<script setup>`.
  - `useVideoFrame` composable will accept a `Helios` instance and manage subscription to frame updates, returning a reactive `ref`.
  - Components (`Timer`, `ProgressBar`) will accept a `helios` prop and use `useVideoFrame` to drive their state.
  - `Watermark` will be a static component for positioning overlays.
  - `App.vue` will instantiate `Helios`, bind it to the document timeline, and pass the instance to child components.
- **Pseudo-Code**:
  - `useVideoFrame(helios)`: `ref(currentFrame)`, `helios.subscribe(updateRef)`, `onUnmounted(unsubscribe)`.
  - `Timer.vue`: `props: { helios }`, `frame = useVideoFrame(helios)`, render formatted time.
  - `ProgressBar.vue`: `props: { helios }`, `frame = useVideoFrame(helios)`, render progress bar based on `frame / totalFrames`.
  - `App.vue`: `new Helios()`, `<Timer :helios="helios" />`, `<ProgressBar :helios="helios" />`.
- **Public API Changes**: None.
- **Dependencies**: None.

# 4. Test Plan
- **Verification**: `npm run build && npm test tests/e2e/verify-render.ts -- vue-components-demo`
- **Success Criteria**: Build succeeds, `verify-render.ts` passes (video generated with content).
- **Edge Cases**: Components handle missing `helios` prop gracefully.
