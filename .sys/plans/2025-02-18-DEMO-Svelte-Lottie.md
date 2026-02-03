# Spec: Svelte Lottie Animation Example

## 1. Context & Goal
- **Objective**: Create a new example project `examples/svelte-lottie-animation` demonstrating how to use Lottie animations within a Svelte application using Helios.
- **Trigger**: The README promises "Any Framework" support and "Lottie Integration", but while React and Vue have Lottie examples, Svelte does not. This is a gap in the documented vision.
- **Impact**: Demonstrates feature parity for Svelte users and validates that Helios works correctly with Svelte 5 and external animation libraries.

## 2. File Inventory

### Create
- `examples/svelte-lottie-animation/composition.html`: Entry point for the composition.
- `examples/svelte-lottie-animation/src/main.js`: Svelte application entry point (using Svelte 5 `mount`).
- `examples/svelte-lottie-animation/src/App.svelte`: Main component containing logic to bind Helios to Lottie.
- `examples/svelte-lottie-animation/src/animation.json`: Lottie animation data (copied from `examples/lottie-animation`).

### Read-Only
- `examples/lottie-animation/src/animation.json`: Source of the animation data.
- `packages/core/src/index.ts`: Core library source.

## 3. Implementation Spec

### Architecture
- **Framework**: Svelte 5 (using `mount`).
- **Bundler**: Vite (via `vite.build-example.config.js`).
- **Animation Library**: `lottie-web` (already in devDependencies).
- **Integration Pattern**:
  - Initialize `Helios` instance.
  - Load Lottie animation using `lottie.loadAnimation` in `onMount`.
  - Subscribe to `helios.subscribe` to get `currentFrame` and `fps`.
  - Convert frame to milliseconds: `(currentFrame / fps) * 1000`.
  - Drive Lottie frame: `anim.goToAndStop(ms, false)`.

### Pseudo-Code / Logic

**`src/main.js`**:
```javascript
import { mount } from 'svelte';
import App from './App.svelte';

const app = mount(App, {
  target: document.getElementById('app'),
});

export default app;
```

**`src/App.svelte`**:
```svelte
<script>
  import { onMount } from 'svelte';
  import { Helios } from '../../../packages/core/src/index.ts'; // Use relative path
  import lottie from 'lottie-web';
  import animationData from './animation.json';

  let container;

  const helios = new Helios({
    duration: 5,
    fps: 30
  });

  onMount(() => {
    // 1. Initialize Lottie
    const anim = lottie.loadAnimation({
      container,
      renderer: 'svg',
      loop: false,
      autoplay: false,
      animationData
    });

    // 2. Subscribe to Helios
    helios.subscribe(({ currentFrame, fps }) => {
      const timeMs = (currentFrame / fps) * 1000;
      anim.goToAndStop(timeMs, false); // false = frame based on time
    });
  });
</script>

<div bind:this={container} style="width: 100%; height: 100%;"></div>
```

**`src/animation.json`**:
(Copy content from `examples/lottie-animation/src/animation.json`)

## 4. Test Plan

### Verification
1.  Run the build command for examples:
    ```bash
    npm run build:examples
    ```
2.  Check for successful build output:
    ```bash
    ls -F output/example-build/examples/svelte-lottie-animation/composition/
    ```
    Should show `index.html` and assets.

### Success Criteria
- The build process completes without error.
- The `vite.build-example.config.js` automatically picks up the new example (because it scans directories with `composition.html`).
- No changes to config files are required.

### Edge Cases
- **Svelte Version**: Ensure `mount` import works (project uses Svelte 5).
- **Types**: Since we use `.js` and `<script>` (no ts), strict type checking is skipped, which avoids `lottie-web` type issues.
