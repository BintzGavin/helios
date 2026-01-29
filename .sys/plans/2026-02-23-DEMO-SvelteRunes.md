# Plan: Scaffold Svelte 5 Runes Example

## 1. Context & Goal
- **Objective**: Create a new example `examples/svelte-runes-animation` that demonstrates how to use Helios with Svelte 5's new "Runes" reactivity syntax (`$state`, `$derived`, `$effect`).
- **Trigger**: The current Svelte example uses Svelte 3/4 legacy syntax (`export let`, `$: `), but the project uses Svelte 5. Users adhering to the "Use What You Know" principle need a reference for the modern Svelte API.
- **Impact**: Unlocks proper support for Svelte 5 developers and closes a gap between the installed dependency version and the example implementation.

## 2. File Inventory

### Create
- `examples/svelte-runes-animation/vite.config.js`: Vite configuration with `@sveltejs/vite-plugin-svelte`.
- `examples/svelte-runes-animation/index.html`: Standard web entry point.
- `examples/svelte-runes-animation/composition.html`: Helios composition entry point.
- `examples/svelte-runes-animation/src/main.ts`: Application entry point mounting the Svelte app.
- `examples/svelte-runes-animation/src/App.svelte`: Main component demonstrating `$state` and `$derived` driven by Helios.
- `examples/svelte-runes-animation/src/lib/helios.svelte.ts`: A reusable Svelte 5 adapter class that wraps `Helios` and exposes reactive state.

### Modify
- `vite.build-example.config.js`: Add the new example to the `rollupOptions.input` map to ensure it's included in the build.
- `tests/e2e/verify-render.ts`: Add a new test case `Svelte Runes` to the `CASES` array to verify rendering.

### Read-Only
- `examples/svelte-canvas-animation/**`: Reference for the legacy implementation.
- `package.json`: To confirm Svelte 5 dependency (already confirmed).

## 3. Implementation Spec

### Architecture
- **Framework**: Svelte 5 (using Runes).
- **Build**: Vite (using shared root plugins where possible, but local config for dev).
- **State Management**: A wrapper class `HeliosState` (in `.svelte.ts`) that calls `helios.subscribe()` and updates public `$state` fields.
- **Rendering**: DOM-based animation (e.g., a moving div) to cleanly demonstrate reactivity without Canvas overhead/complexity, ensuring the focus is on the *glue* code.

### Pseudo-Code

#### `src/lib/helios.svelte.ts`
```typescript
import { Helios } from '@helios-project/core';

export class HeliosState {
    currentFrame = $state(0);
    fps = $state(0);
    duration = $state(0);
    isPlaying = $state(false);

    constructor(helios: Helios) {
        this.fps = helios.fps;
        this.duration = helios.duration;
        this.isPlaying = helios.isPlaying;

        helios.subscribe((state) => {
            this.currentFrame = state.currentFrame;
            this.isPlaying = state.isPlaying;
        });
    }
}
```

#### `src/App.svelte`
```html
<script lang="ts">
  import { onMount } from 'svelte';
  import { Helios } from '@helios-project/core';
  import { HeliosState } from './lib/helios.svelte.ts';

  // Initialize Helios
  const helios = new Helios({
    duration: 5,
    fps: 30,
    autoSyncAnimations: true
  });

  // Create reactive state wrapper
  const state = new HeliosState(helios);

  // Expose to window for player
  onMount(() => {
    if (typeof window !== 'undefined') {
      (window as any).helios = helios;
    }
  });

  // Derived state for animation logic
  // Progress 0..1
  let progress = $derived(state.currentFrame / (state.duration * state.fps));

  // Animation values
  let x = $derived(progress * 300);
  let rotation = $derived(progress * 360);
</script>

<div class="scene">
  <div
    class="box"
    style="transform: translate({x}px, 0) rotate({rotation}deg);"
  >
    {state.currentFrame}
  </div>
</div>

<style>
  .scene {
    width: 100%;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #111;
    color: white;
  }
  .box {
    width: 100px;
    height: 100px;
    background: linear-gradient(45deg, #ff3e00, #ff8c00);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: sans-serif;
    font-weight: bold;
    font-size: 24px;
  }
</style>
```

#### `vite.build-example.config.js`
- Import `resolve` from `path`.
- Add `svelte_runes: resolve(__dirname, "examples/svelte-runes-animation/composition.html")` to `build.rollupOptions.input` object.

#### `tests/e2e/verify-render.ts`
- Add entry to `CASES` array:
```typescript
{ name: 'Svelte Runes', relativePath: 'examples/svelte-runes-animation/composition.html', mode: 'dom' as const },
```

### Dependencies
- No new npm packages needed (Svelte 5 is in root).

## 4. Test Plan
- **Verification**:
    1. Run `npm run build:examples` to ensure the new entry point builds.
    2. Run `npx tsx tests/e2e/verify-render.ts` (which will now include the new case).
- **Success Criteria**:
    - Build succeeds.
    - `verify-render.ts` reports "✅ Svelte Runes Passed!".
    - Generated video `output/svelte-runes-render-verified.mp4` shows the expected animation.
- **Edge Cases**:
    - Verify `helios.svelte.ts` correctly cleans up or handles subscription (though for this simple example, memory leaks aren't the primary concern, correctness is).
