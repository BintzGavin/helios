# 2026-01-28-DEMO-VueTransitions.md

#### 1. Context & Goal
- **Objective**: Scaffold a new example `examples/vue-transitions` to demonstrate how to synchronize standard CSS animations in Vue using `autoSyncAnimations: true` and a `<Sequence>` component.
- **Trigger**: Vision gap. The README promises "Use What You Know" (standard CSS), but existing Vue examples use manual inline style calculation. React and Svelte have dedicated "Transitions" examples showing the preferred `autoSyncAnimations` pattern.
- **Impact**: Provides Vue developers with a clear pattern for using standard CSS animations (keyframes) that work with the Helios timeline, bridging the gap between Vue's component model and Helios's animation engine.

#### 2. File Inventory
- **Create**:
  - `examples/vue-transitions/vite.config.js`: Vite configuration for Vue.
  - `examples/vue-transitions/index.html`: Entry HTML file.
  - `examples/vue-transitions/package.json`: Dependency definition.
  - `examples/vue-transitions/src/main.js`: Entry point.
  - `examples/vue-transitions/src/App.vue`: Main composition demonstrating sequences.
  - `examples/vue-transitions/src/components/Sequence.vue`: Helper component to inject `--sequence-start`.
  - `examples/vue-transitions/src/style.css`: Global styles (optional, or in App.vue).
- **Modify**:
  - `vite.build-example.config.js`: Add `vue_transitions` entry to `rollupOptions.input` to include it in the build pipeline.
  - `tests/e2e/verify-render.ts`: Add `Vue Transitions` case to the `CASES` array to enable E2E verification.
- **Read-Only**:
  - `examples/react-transitions/src/components/Sequence.jsx`: Reference implementation.

#### 3. Implementation Spec
- **Architecture**:
  - Use `vite` with `@vitejs/plugin-vue`.
  - **`App.vue`**:
    - Initialize `Helios` with `autoSyncAnimations: true` and `bindToDocumentTimeline()`.
    - Provide `currentFrame` to children.
    - Render multiple `<Sequence>` components with CSS classes triggering `@keyframes`.
  - **`Sequence.vue`**:
    - Props: `from` (number, required), `duration` (number, required), `fps` (number, default 30).
    - Logic: Calculate `startTime = from / fps`.
    - Template: Render a wrapper `div` with `style="--sequence-start: ${startTime}s"`.
    - Use `v-if` to conditionally render content based on `currentFrame` being within range `[from, from + duration)`.
    - Inject `currentFrame` (provided by App) to drive the `v-if` logic.
  - **CSS**:
    - Define `@keyframes` (e.g., fade in, slide up).
    - Usage: `.my-class { animation: fadeIn 1s forwards; animation-delay: var(--sequence-start); }`.

- **Pseudo-Code**:
  ```vue
  <!-- Sequence.vue -->
  <script setup>
  const props = defineProps(['from', 'duration', 'fps'])
  const currentFrame = inject('currentFrame')
  const startTime = computed(() => props.from / (props.fps || 30))
  const isActive = computed(() => currentFrame.value >= props.from && currentFrame.value < props.from + props.duration)
  </script>
  <template>
    <div v-if="isActive" :style="{ '--sequence-start': startTime + 's' }">
      <slot />
    </div>
  </template>
  ```

- **Dependencies**:
  - `@helios-engine/core` (local)
  - `vue`
  - `@vitejs/plugin-vue`

#### 4. Test Plan
- **Verification**: `npm run build:examples && npx ts-node tests/e2e/verify-render.ts`
- **Success Criteria**:
  - Build completes without error.
  - `verify-render.ts` outputs "✅ Vue Transitions Passed!".
  - Generated video `output/vue-transitions-render-verified.mp4` shows animations synced to the timeline.
