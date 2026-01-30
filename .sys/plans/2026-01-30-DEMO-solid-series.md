# Plan: SolidJS Series Component

## 1. Context & Goal
- **Objective**: Add `Series` component to `examples/solid-animation-helpers` to enable idiomatic sequential composition in SolidJS.
- **Trigger**: Vision gap—README and other frameworks support `Series`, but SolidJS implementation is missing. Memory falsely claims it exists.
- **Impact**: Aligns SolidJS developer experience with other frameworks; enables complex timeline composition without manual `from` props calculation.

## 2. File Inventory
- **Create**:
  - `examples/solid-animation-helpers/src/lib/SeriesContext.js`: Define the Context for Series parent.
  - `examples/solid-animation-helpers/src/lib/Series.jsx`: Implement the Series component with registration logic.
- **Modify**:
  - `examples/solid-animation-helpers/src/lib/Sequence.jsx`: Consume Series context to offset start frame.
  - `examples/solid-animation-helpers/src/App.jsx`: Update usage to demonstrate `<Series>` wrapping `<Sequence>` components.
- **Read-Only**:
  - `examples/solid-animation-helpers/src/lib/FrameContext.js`: Existing frame context.
  - `examples/solid-animation-helpers/src/lib/createHeliosSignal.js`: Existing signal helper.

## 3. Implementation Spec
- **Architecture**:
  - Use `createContext` to provide a registration mechanism from `Series` to `Sequence`.
  - `Series` maintains an ordered list of children durations (using `createStore` or `createSignal`).
  - `Sequence` registers its duration on mount and receives an ID/index.
  - `Series` exposes a reactive `getOffset(id)` function.
  - `Sequence` computes its effective `from` frame by adding its props `from` to the context offset.

- **Pseudo-Code**:
  ```javascript
  // SeriesContext.js
  export const SeriesContext = createContext();

  // Series.jsx
  export function Series(props) {
    const [items, setItems] = createStore([]); // [{ id, durationAccessor }]

    const register = (id, durationAccessor) => {
      setItems(prev => [...prev, { id, durationAccessor }]);
      return () => setItems(prev => prev.filter(i => i.id !== id));
    };

    const getOffset = (id) => {
      // sum durations of all items before index of id
      // return memo/accessor
    };

    return <SeriesContext.Provider value={{ register, getOffset }}>{props.children}</SeriesContext.Provider>;
  }

  // Sequence.jsx
  export function Sequence(props) {
    const series = useContext(SeriesContext);
    const id = createUniqueId();

    // Register on mount
    createEffect(() => {
      if (series) {
        const cleanup = series.register(id, () => props.durationInFrames);
        onCleanup(cleanup);
      }
    });

    const offset = createMemo(() => series ? series.getOffset(id)() : 0);
    const effectiveFrom = () => (props.from || 0) + offset();

    // ... use effectiveFrom() instead of props.from in existing logic
  }
  ```

- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
  - Run `npm run build:examples` to ensure compilation succeeds.
  - Run `npx tsx tests/e2e/verify-render.ts` (or filter for `Solid Helpers`) to verify render output.
- **Success Criteria**:
  - Build artifact `output/example-build/examples/solid-animation-helpers/composition.html` exists.
  - Verification script passes for 'Solid Helpers'.
  - Visual output shows sequential rectangles (Red -> Blue -> Green) without overlap.
- **Edge Cases**:
  - Nested Series? (Should work if Context uses closest Provider).
  - Dynamic children? (Store updates should handle it).
