# Spec: Scaffold Vue Example

## 1. Context & Goal
- **Objective**: Create a new example directory `examples/vue-canvas-animation` that demonstrates how to use Helios with Vue 3.
- **Trigger**: The `README.md` promises a Vue adapter, but it is currently missing.
- **Impact**: Enables Vue developers to use Helios, fulfilling the "Use What You Know" promise.

## 2. File Inventory

### Create
- `examples/vue-canvas-animation/package.json` (Optional, or just rely on root) - *Decision: Rely on root for simplicity, but need to install deps in root.*
- `examples/vue-canvas-animation/index.html`: The development entry point hosting `<helios-player>`.
- `examples/vue-canvas-animation/composition.html`: The composition entry point for the player iframe.
- `examples/vue-canvas-animation/vite.config.js`: Local Vite config for `dev:vue`.
- `examples/vue-canvas-animation/src/main.js`: Vue app mount point.
- `examples/vue-canvas-animation/src/App.vue`: Main Vue component using Helios.
- `examples/vue-canvas-animation/src/useVideoFrame.js`: The Vue composable adapter.

### Modify
- `package.json`: Add `vue` and `@vitejs/plugin-vue` to `devDependencies`. Add `dev:vue` script.
- `vite.build-example.config.js`: Add `vue_composition` entry point and `@vitejs/plugin-vue`.

## 3. Implementation Spec

### Dependencies
The executor must first install the required Vue dependencies in the **root** `package.json`:
```bash
npm install -D vue @vitejs/plugin-vue
```

### Architecture
The example will follow the **Headless Adapter** pattern described in the README.
- **State**: `packages/core` (`Helios` class) manages the source of truth.
- **Adapter**: `useVideoFrame.js` subscribes to Helios and provides a reactive `ref` to the Vue component.
- **View**: `App.vue` reacts to the frame change and draws to the canvas.

### Pseudo-Code / Logic

#### 1. `examples/vue-canvas-animation/src/useVideoFrame.js`
```javascript
import { ref, onUnmounted } from 'vue';

export function useVideoFrame(helios) {
  // 1. Create a reactive ref initialized with current frame
  const frame = ref(helios.getState().currentFrame);

  // 2. Subscribe to Helios updates
  const unsubscribe = helios.subscribe((state) => {
    frame.value = state.currentFrame;
  });

  // 3. Cleanup on unmount
  onUnmounted(() => unsubscribe());

  return frame;
}
```

#### 2. `examples/vue-canvas-animation/src/App.vue`
```vue
<script setup>
import { ref, watchEffect, onMounted } from 'vue';
import { Helios } from '../../../packages/core/dist/index.js';
import { useVideoFrame } from './useVideoFrame';

// Initialize Helios singleton
const helios = new Helios({ duration: 5, fps: 30 });
helios.bindToDocumentTimeline();
window.helios = helios;

const canvasRef = ref(null);
const frame = useVideoFrame(helios);

watchEffect(() => {
  if (!canvasRef.value) return;
  const ctx = canvasRef.value.getContext('2d');
  // Draw logic based on frame.value
  // ... (Draw a Green Vue logo or similar)
});
</script>

<template>
  <canvas ref="canvasRef"></canvas>
</template>
```

#### 3. `examples/vue-canvas-animation/vite.config.js`
Must replicate the alias configuration from React example to allow importing from `packages/`:
```javascript
export default defineConfig({
  plugins: [vue()],
  server: {
    fs: { allow: [searchForWorkspaceRoot(process.cwd())] }
  },
  resolve: {
    alias: [
      { find: /^\/packages\/(.*)/, replacement: path.resolve(process.cwd(), 'packages') + '/$1' }
    ]
  }
});
```

#### 4. `vite.build-example.config.js`
- Import `vue` from `@vitejs/plugin-vue`.
- Add `vue()` to `plugins` array.
- Add `vue_composition: resolve(__dirname, "examples/vue-canvas-animation/composition.html")` to `input`.

## 4. Test Plan

### Verification
1.  **Install & Build**:
    ```bash
    npm install
    npm run build:examples
    ```
2.  **Dev Server**:
    ```bash
    npm run dev:vue
    ```
    - Open browser to displayed URL.
    - Verify `<helios-player>` loads the composition.
    - Verify animation plays.

### Success Criteria
- `npm run build:examples` succeeds without error.
- The `output/example-build/assets` directory contains Vue-related chunks.
- The dev server shows a spinning animation (e.g., Green Vue-colored object).
