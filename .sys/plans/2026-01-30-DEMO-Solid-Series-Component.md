# Spec: Implement <Series> component for SolidJS

## 1. Context & Goal
- **Objective**: Implement the `<Series>` component in `examples/solid-animation-helpers` to achieve feature parity with other framework adapters (React, Vue, Svelte).
- **Trigger**: Vision Gap - The SolidJS example (`examples/solid-animation-helpers`) currently lacks the `<Series>` helper component, which is a standard part of the "animation helpers" suite provided for other frameworks.
- **Impact**: This unlocks sequential composition for SolidJS users, allowing them to stack clips in time without manually calculating frame offsets.

## 2. File Inventory
- **Create**:
    - `examples/solid-animation-helpers/src/lib/SeriesContext.js`
    - `examples/solid-animation-helpers/src/lib/Series.jsx`
- **Modify**:
    - `examples/solid-animation-helpers/src/lib/Sequence.jsx` (To consume SeriesContext)
    - `examples/solid-animation-helpers/src/App.jsx` (To demonstrate usage)

## 3. Implementation Spec

### Architecture
The `<Series>` component in SolidJS presents a unique challenge because SolidJS components render once (setup phase) and do not re-render like React components. We cannot use `Children.map` or `cloneElement` to inject props.

Instead, we will use a **Registration Pattern via Context**:
1.  **Series Component**: Provides a `SeriesContext` containing a `register(duration)` function. It maintains a local mutable `accumulatedFrames` counter in its closure scope.
2.  **Sequence Component**: Checks for `SeriesContext` on initialization. If present, it calls `register(duration)` to receive its calculated `startOffset`.
3.  **Execution Order**: Since SolidJS executes component functions in order (synchronously for this case), the registration calls will happen sequentially, ensuring correct offset calculations.

### Pseudo-Code

**1. `examples/solid-animation-helpers/src/lib/SeriesContext.js`**
```javascript
import { createContext } from 'solid-js';

export const SeriesContext = createContext();
```

**2. `examples/solid-animation-helpers/src/lib/Series.jsx`**
```jsx
import { SeriesContext } from './SeriesContext';

export const Series = (props) => {
  // Mutable state for the setup phase.
  // Since Solid component functions run once, this persists for the instance.
  let accumulatedFrames = 0;

  const register = (duration) => {
    const currentOffset = accumulatedFrames;
    accumulatedFrames += duration;
    return currentOffset;
  };

  return (
    <SeriesContext.Provider value={{ register }}>
      {props.children}
    </SeriesContext.Provider>
  );
};
```

**3. `examples/solid-animation-helpers/src/lib/Sequence.jsx`**
```jsx
import { createMemo, useContext, Show } from 'solid-js';
import { FrameContext } from './FrameContext';
import { SeriesContext } from './SeriesContext'; // Import new context

export const Sequence = (props) => {
  const parentFrame = useContext(FrameContext);
  const series = useContext(SeriesContext); // Consume Series context

  let seriesOffset = 0;

  // Register with parent Series if available
  if (series) {
    // Note: This relies on synchronous execution order of children
    seriesOffset = series.register(props.durationInFrames || 0);
  }

  const currentFrame = () => parentFrame ? parentFrame() : (props.frame ? props.frame() : 0);

  const state = createMemo(() => {
    const f = currentFrame();
    // Add seriesOffset to the explicitly provided 'from' prop (default 0)
    const from = (props.from || 0) + seriesOffset;
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

**4. `examples/solid-animation-helpers/src/App.jsx`**
- Import `Series` from `./lib/Series`.
- Add a visual test case demonstrating nested `<Series>` usage.

```jsx
// ... inside App return ...
<div style={{ ... }}>
    <h2>Series Demo</h2>
    <div style={{ position: 'relative', height: '200px', width: '400px', background: '#222' }}>
        <Series>
            <Sequence durationInFrames={30}>
                <div style={{ background: 'red', inset: 0, position: 'absolute' }}>Item 1 (0-30)</div>
            </Sequence>
            <Sequence durationInFrames={30}>
                <div style={{ background: 'blue', inset: 0, position: 'absolute' }}>Item 2 (30-60)</div>
            </Sequence>
        </Series>
    </div>
</div>
```

## 4. Test Plan
- **Verification**: Run `npm run build:examples` to ensure the SolidJS example compiles correctly with the new files.
- **Success Criteria**:
    - The build process completes without error.
    - The code structure follows the SolidJS-idiomatic "Context Registration" pattern described above.
