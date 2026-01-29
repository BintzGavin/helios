# Plan: Implement SolidJS Series Component

#### 1. Context & Goal
- **Objective**: Implement the `<Series>` component in `examples/solid-animation-helpers` to provide sequential layout capabilities for SolidJS.
- **Trigger**: Vision gap identified—React, Vue, and Svelte examples have `<Series>`, but SolidJS lacks it despite the status claiming parity.
- **Impact**: Unlocks idiomatic sequential animation composition for SolidJS users, completing the "Animation Helpers" feature set across all supported frameworks.

#### 2. File Inventory
- **Create**:
  - `examples/solid-animation-helpers/src/lib/Series.jsx`: New component for managing sequence timing.
- **Modify**:
  - `examples/solid-animation-helpers/src/lib/Sequence.jsx`: Update to consume `SeriesContext` and calculate offsets.
  - `examples/solid-animation-helpers/src/App.jsx`: Update example to demonstrate `<Series>` wrapping `<Sequence>` items.
  - `tests/e2e/verify-render.ts`: Add `Solid Helpers` to the verification test suite.
- **Read-Only**:
  - `examples/solid-animation-helpers/src/lib/FrameContext.js`

#### 3. Implementation Spec
- **Architecture**:
  - Use SolidJS `createContext` to share timing data from `<Series>` to `<Sequence>`.
  - Use a "Reactive Registration" pattern where children register their durations via `createEffect`.
  - `<Series>` maintains a signal of registered items and computes cumulative offsets via `createMemo`.
- **Pseudo-Code**:
  ```javascript
  // Series.jsx
  export const SeriesContext = createContext();
  export const Series = (props) => {
    // State: List of { id, duration }
    const [items, setItems] = createSignal([]);

    // Register/Update item
    const register = (id, duration) => {
       setItems(prev => { ...update logic... });
    };
    const unregister = (id) => { ...remove logic... };

    // Compute offsets: map id -> startFrame
    const offsets = createMemo(() => {
       let acc = 0;
       return items().reduce((map, item) => {
          map[item.id] = acc;
          acc += item.duration;
          return map;
       }, {});
    });

    return <Provider value={{ register, unregister, offsets }}>{children}</Provider>
  }

  // Sequence.jsx
  // ... inside component ...
  const id = createUniqueId();
  const series = useContext(SeriesContext);

  createEffect(() => {
    if (series) series.register(id, props.durationInFrames);
  });
  onCleanup(() => series?.unregister(id));

  const offset = () => series ? series.offsets()[id] || 0 : 0;
  // absoluteFrom = (props.from || 0) + offset()
  ```
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  - Run `npm run build:examples` to ensure the Solid example compiles.
  - Run `npx tsx tests/e2e/verify-render.ts` to verify the output video is generated and matches expectations.
- **Success Criteria**:
  - Build succeeds.
  - `verify-render.ts` output shows `✅ Solid Helpers Passed!`.
- **Edge Cases**:
  - Nested Series (not required for this task but good to keep in mind).
  - Dynamic addition/removal of Sequence items (handled by `createEffect` and `onCleanup`).
