# 1. Context & Goal
- **Objective**: Create `examples/solid-animation-helpers` to provide standard `<Sequence>` and `<Series>` components for SolidJS, completing the "Animation Helpers" roadmap item across all major frameworks.
- **Trigger**: Vision gap - "Animation Helpers" are promised and implemented for React, Vue, and Svelte, but missing for SolidJS.
- **Impact**: Enables SolidJS developers to use compositional timing primitives, a core value proposition of Helios ("Use What You Know").

# 2. File Inventory
- **Create**: `examples/solid-animation-helpers/vite.config.js`
  - Solid plugin config required for compilation.
- **Create**: `examples/solid-animation-helpers/composition.html`
  - Entry HTML file matching standard example pattern.
- **Create**: `examples/solid-animation-helpers/src/index.jsx`
  - Mount point for the Solid application.
- **Create**: `examples/solid-animation-helpers/src/App.jsx`
  - Main composition demonstrating `<Sequence>` and `<Series>` usage.
- **Create**: `examples/solid-animation-helpers/src/FrameContext.jsx`
  - Context to propagate relative frame time to children.
- **Create**: `examples/solid-animation-helpers/src/SeriesContext.jsx`
  - Context to handle sequential layout registration.
- **Create**: `examples/solid-animation-helpers/src/components/Sequence.jsx`
  - Component that shifts time based on start frame or series offset.
- **Create**: `examples/solid-animation-helpers/src/components/Series.jsx`
  - Component that manages sequential layout of children.
- **Create**: `examples/solid-animation-helpers/src/lib/createHeliosSignal.js`
  - Adapter to expose Helios state as a Solid signal.
- **Modify**: `vite.build-example.config.js`
  - Add `solid_helpers` entry to `rollupOptions.input`.
  - Update `solidPlugin` include regex to match `/examples\/solid-(canvas|dom|animation-helpers)/`.
- **Modify**: `package.json`
  - Add `"dev:solid-helpers": "vite serve examples/solid-animation-helpers"`.

# 3. Implementation Spec
- **Architecture**:
  - Uses SolidJS fine-grained reactivity (Signals).
  - `createHeliosSignal` adapts `helios.subscribe` to a Solid signal.
  - `FrameContext` provides `currentFrame` as an **accessor function** to children to ensure reactivity.
  - `Sequence` calculates local frame (`parent - offset`) and uses `<Show>` for conditional rendering.
  - `Series` uses a **Registration Pattern**: Children register their duration via Context on mount, parent calculates cumulative offsets and exposes them via Context.

- **Pseudo-Code (Sequence)**:
  ```javascript
  // Sequence.jsx
  import { useContext, createUniqueId, onMount } from 'solid-js';
  import { sequence } from '@helios-project/core';
  import { FrameContext } from '../FrameContext';
  import { SeriesContext } from '../SeriesContext';

  export const Sequence = (props) => {
    const parentFrameAccessor = useContext(FrameContext);
    const series = useContext(SeriesContext);
    const id = createUniqueId();

    // Register with Series if present
    if (series) {
      onMount(() => series.register(id, props.durationInFrames));
    }

    const offsetAccessor = () => series ? series.getOffset(id)() : (props.from || 0);

    // Core logic
    const state = () => sequence({
      frame: parentFrameAccessor(),
      from: offsetAccessor(),
      durationInFrames: props.durationInFrames
    });

    return (
      <Show when={state().isActive}>
        <FrameContext.Provider value={() => state().relativeFrame}>
          {props.children}
        </FrameContext.Provider>
      </Show>
    );
  };
  ```

- **Pseudo-Code (Series)**:
  ```javascript
  // Series.jsx
  import { createSignal, onCleanup } from 'solid-js';
  import { SeriesContext } from '../SeriesContext';

  export const Series = (props) => {
    const [items, setItems] = createSignal([]); // [{id, duration}]

    const register = (id, duration) => {
      setItems(prev => [...prev, { id, duration }]);
      onCleanup(() => setItems(prev => prev.filter(i => i.id !== id)));
    };

    const getOffset = (id) => () => {
      let acc = 0;
      for (const item of items()) {
        if (item.id === id) return acc;
        acc += item.duration;
      }
      return 0;
    };

    return (
      <SeriesContext.Provider value={{ register, getOffset }}>
        {props.children}
      </SeriesContext.Provider>
    );
  };
  ```

- **Dependencies**: None (SolidJS is already in root).

# 4. Test Plan
- **Verification**:
  1.  Run `npm run build:examples`.
  2.  Check for existence of `output/example-build/examples/solid-animation-helpers/composition.html`.
- **Success Criteria**:
  - Build completes without errors.
  - Output file exists.
- **Edge Cases**:
  - `Series` with nested `Sequence` components.
  - Conditional rendering of `Sequence` (handled by `Show`).
