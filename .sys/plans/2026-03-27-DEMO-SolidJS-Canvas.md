#### 1. Context & Goal
- **Objective**: Scaffold a new example `examples/solid-canvas-animation` demonstrating SolidJS integration with Helios.
- **Trigger**: "Use What You Know" promise requires broad framework support; SolidJS is a major modern framework with no example.
- **Impact**: Provides a reference implementation for SolidJS users and demonstrates Helios's compatibility with signal-based architectures (a key roadmap item).

#### 2. File Inventory
- **Modify**:
    - `package.json`: Add `solid-js` and `vite-plugin-solid` to devDependencies.
    - `vite.build-example.config.js`: Add `solidPlugin` and new input entry.
    - `tests/e2e/verify-render.ts`: Add `Solid Canvas` test case.
- **Create**:
    - `examples/solid-canvas-animation/package.json`: Local config.
    - `examples/solid-canvas-animation/vite.config.js`: Local Vite config for dev.
    - `examples/solid-canvas-animation/composition.html`: Entry point.
    - `examples/solid-canvas-animation/src/index.jsx`: Mount point.
    - `examples/solid-canvas-animation/src/App.jsx`: Main composition logic.
    - `examples/solid-canvas-animation/src/lib/createHeliosSignal.js`: Adapter hook.
- **Read-Only**: `packages/core/src/index.ts` (Import source).

#### 3. Implementation Spec
- **Architecture**:
    - Use Vite with `vite-plugin-solid`.
    - Create a custom `createHeliosSignal` hook that bridges `helios.subscribe` to a Solid Signal.
    - Use `createEffect` to drive a Canvas rendering loop reactively.
- **Pseudo-Code**:
    - `createHeliosSignal`:
      ```javascript
      import { createSignal, onCleanup, onMount } from 'solid-js';

      export function createHeliosSignal(helios) {
        const [state, setState] = createSignal(helios.getState());
        onMount(() => {
          const unsub = helios.subscribe(setState);
          onCleanup(unsub);
        });
        return state;
      }
      ```
    - `App.jsx`:
      ```javascript
      import { createEffect } from 'solid-js';
      import { createHeliosSignal } from './lib/createHeliosSignal';

      const frame = createHeliosSignal(window.helios);

      createEffect(() => {
        // Draw to canvas based on frame().currentFrame
      });
      ```
- **Public API Changes**: None (Example only).
- **Dependencies**:
    - `solid-js`: `^1.8.0`
    - `vite-plugin-solid`: `^2.8.0`

#### 4. Test Plan
- **Verification**: `npm install && npm run build:examples`
- **Success Criteria**:
    - Build completes without error.
    - `output/example-build/examples/solid-canvas-animation/composition.html` exists.
    - `npx tsx tests/e2e/verify-render.ts` passes for "Solid Canvas" case.
- **Edge Cases**: Verify HMR works during `vite serve`.
