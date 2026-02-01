# Plan: Vue Captions Animation Example

## 1. Context & Goal
- **Objective**: Create a Vue 3 example demonstrating how to use Helios captions (SRT) with the `activeCaptions` state.
- **Trigger**: Parity gap. React and Vanilla JS have caption examples, but Vue (a supported framework) does not.
- **Impact**: Ensures "Use What You Know" promise is kept for Vue developers who need subtitle/caption support.

## 2. File Inventory
- **Create**:
    - `examples/vue-captions-animation/composition.html`: Entry point for the composition.
    - `examples/vue-captions-animation/vite.config.js`: Vite configuration (aliases, port).
    - `examples/vue-captions-animation/src/main.js`: Vue app mount point.
    - `examples/vue-captions-animation/src/App.vue`: Main composition component.
    - `examples/vue-captions-animation/src/components/CaptionOverlay.vue`: Component to render the captions.
    - `examples/vue-captions-animation/src/composables/useHeliosCaptions.js`: Composable to expose reactive captions state.
- **Modify**: None.
- **Read-Only**: `packages/core/src/index.ts` (Import target).

## 3. Implementation Spec
- **Architecture**:
    - Use Vue 3 Composition API (`<script setup>`).
    - Use `Helios` singleton pattern (initialized in `App.vue` or external file, bound to window).
    - Create a custom composable `useHeliosCaptions(helios)` that subscribes to `helios` and updates a `ref` with `state.activeCaptions`.
    - **SRT Data**: Embed a sample SRT string directly in the example.
    - **Rendering**: `CaptionOverlay.vue` receives the captions prop (or uses the composable) and renders the text over the video content.
- **Pseudo-Code**:
    ```javascript
    // useHeliosCaptions.js
    export function useHeliosCaptions(helios) {
        const captions = ref([]);
        onMounted(() => {
            const unsub = helios.subscribe(state => captions.value = state.activeCaptions);
            onUnmounted(unsub);
        });
        return captions;
    }

    // App.vue
    const helios = new Helios({ captions: srtString, ... });
    const captions = useHeliosCaptions(helios);
    ```
- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
    1. Run `npm run build:examples` (This builds all examples including the new one).
    2. Run `npx tsx tests/e2e/verify-render.ts "Vue Captions"` (Filters for the new example).
- **Success Criteria**:
    - Build succeeds.
    - `verify-render.ts` outputs `✅ Vue Captions Animation Passed!`.
    - Generated video file in `output/` has correct duration (e.g., 5s) and non-black frames.
- **Edge Cases**:
    - Empty captions array (should render nothing).
    - Multiple active captions (should render both).
    - Ensure `autoSyncAnimations: true` is set for proper timeline syncing.
