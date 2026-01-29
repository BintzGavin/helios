# Plan: Scaffold SolidJS Animation Helpers Example

## 1. Context & Goal
- **Objective**: Create `examples/solid-animation-helpers` to demonstrate idiomatic video composition in SolidJS using a `<Sequence>` component.
- **Trigger**: Vision gap - "Animation Helpers" pattern exists for React, Vue, and Svelte, but is missing for SolidJS.
- **Impact**: Enables SolidJS users to easily compose multi-clip videos using the standard "Use What You Know" patterns (`<Sequence>`), bringing SolidJS support to parity with other frameworks.

## 2. File Inventory

### Create
- `examples/solid-animation-helpers/package.json`:
  - Fields: `name` ("solid-animation-helpers"), `private` (true), `type` ("module").
- `examples/solid-animation-helpers/vite.config.js`:
  - Content: Standard Vite config using `vite-plugin-solid`.
- `examples/solid-animation-helpers/composition.html`:
  - Content: Standard HTML entry point importing `./src/index.jsx`.
- `examples/solid-animation-helpers/src/index.jsx`:
  - Purpose: Mount point. Initializes `Helios` instance and renders `App`.
- `examples/solid-animation-helpers/src/App.jsx`:
  - Purpose: Main composition demo using `<Sequence>`. Should render 2-3 sequential blocks (e.g., colored boxes or text) to prove timing works.
- `examples/solid-animation-helpers/src/lib/createHeliosSignal.js`:
  - Purpose: Adapter hook. Creates a SolidJS signal that updates on every Helios frame.
- `examples/solid-animation-helpers/src/lib/FrameContext.js`:
  - Purpose: Context definition. Exports `FrameContext`.
- `examples/solid-animation-helpers/src/lib/Sequence.jsx`:
  - Purpose: The implementation of the Sequence component.

### Modify
- `vite.build-example.config.js`:
  - Update `solidPlugin` configuration.
  - **Change**: Update the `include` (and `react` plugin's `exclude`) regex to match the new directory.
  - **Target**: Change `/examples\/solid-(canvas|dom)-animation/` to `/examples\/solid-(canvas|dom)-animation|examples\/solid-animation-helpers/`.
  - **Add Input**: Add `solid_helpers: resolve(__dirname, "examples/solid-animation-helpers/composition.html")` to `rollupOptions.input`.

## 3. Implementation Spec

### Architecture
- **Framework**: SolidJS + Vite.
- **State Management**: `createHeliosSignal` (Signal) + Context API.
- **Pattern**:
    - `FrameContext` provides a signal accessor `() => number` for the *relative* frame count.
    - `<Sequence>` reads parent frame, calculates offset, conditionally renders (`<Show>`), and provides new relative frame to children.
    - `App` initializes `Helios` and renders multiple `<Sequence>` blocks.

### Pseudo-Code

**src/lib/Sequence.jsx**:
```javascript
import { createMemo, useContext, Show } from 'solid-js';
import { FrameContext } from './FrameContext';

export const Sequence = (props) => {
  const parentFrame = useContext(FrameContext); // accessor function

  // Resolve current frame: use parent context if available, otherwise fallback to props.frame()
  // Note: props.frame should be a signal accessor passed from App if it's the root
  const currentFrame = () => parentFrame ? parentFrame() : props.frame();

  const state = createMemo(() => {
    const f = currentFrame();
    const from = props.from || 0;
    const duration = props.durationInFrames;

    const rel = f - from;
    const isActive = rel >= 0 && (duration === undefined || rel < duration);

    return { rel, isActive };
  });

  return (
    <Show when={state().isActive}>
      <FrameContext.Provider value={() => state().rel}>
        {props.children}
      </FrameContext.Provider>
    </Show>
  );
};
```

**src/App.jsx**:
```javascript
import { createHeliosSignal } from './lib/createHeliosSignal';
import { Sequence } from './lib/Sequence';

// ... init helios ...

function App() {
  const frame = createHeliosSignal(window.helios); // returns accessor

  return (
    <div>
      <Sequence frame={frame} from={0} durationInFrames={30}>
        <div class="box red">Step 1</div>
      </Sequence>
      <Sequence frame={frame} from={30} durationInFrames={30}>
        <div class="box blue">Step 2</div>
      </Sequence>
    </div>
  );
}
```

### Dependencies
- `solid-js` (Dev dependency in root).
- `@helios-project/core` (Local).

## 4. Test Plan
- **Verification Command**: `npm run build:examples`
- **Success Criteria**:
    - Build process completes successfully.
    - `output/example-build/examples/solid-animation-helpers/composition.html` is generated.
    - `output/example-build/assets` contains `solid_helpers` chunks.
- **Runtime Verification**:
    - Open `examples/solid-animation-helpers/composition.html` in browser (via `vite preview` or direct file if possible, though module loading requires server).
    - Observe sequential rendering of elements.
