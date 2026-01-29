# Implement SolidJS Series Component

## 1. Context & Goal
- **Objective**: Implement the `<Series>` component for SolidJS in `examples/solid-animation-helpers` to enable sequential composition of animations without manual frame offsets.
- **Trigger**: The current SolidJS example manually calculates offsets, whereas React, Vue, and Svelte examples provide a `<Series>` abstraction. This is a functionality gap identified during "Vision vs Reality" analysis.
- **Impact**: Enables "Use What You Know" for SolidJS developers by providing idiomatic sequential layout tools. Also fixes a verification gap by adding this example to the E2E registry.

## 2. File Inventory
- **Create**:
    - `examples/solid-animation-helpers/src/lib/SeriesContext.js`: Context definition for Series communication.
    - `examples/solid-animation-helpers/src/lib/Series.jsx`: The implementation of the Series container component.
- **Modify**:
    - `examples/solid-animation-helpers/src/lib/Sequence.jsx`: Update to consume `SeriesContext` and auto-calculate start frame.
    - `examples/solid-animation-helpers/src/App.jsx`: Refactor to use `<Series>` instead of manual sequences.
    - `tests/e2e/verify-render.ts`: Add `Solid Animation Helpers` to the verification registry.
- **Read-Only**:
    - `examples/solid-animation-helpers/src/lib/FrameContext.js`

## 3. Implementation Spec

### Architecture
- **State Management**: Use SolidJS reactive primitives (`createSignal`) in the `<Series>` component to maintain an ordered list of children items (containing ID and duration).
- **Registration Pattern**: Use the Context API for child-to-parent communication. `<Sequence>` components (children) will register themselves with the parent `<Series>` component upon mounting and unregister upon cleanup.
- **Reactivity**: The `<Series>` component will compute a derived map of start offsets (`createMemo`) based on the ordered list of children. `<Sequence>` components will reactively read their specific offset from this map.

### Pseudo-Code Logic

**Series Component (`Series.jsx`)**:
1.  Initialize a signal to store a list of registered items (each with a unique ID and duration).
2.  Define a `register` function that accepts an ID and duration, appending a new item to the list.
3.  Define an `unregister` function that removes an item by ID from the list.
4.  Define an `update` function that modifies the duration of an existing item by ID.
5.  Create a computed value (Memo) that:
    -   Iterates through the list of items.
    -   Calculates the cumulative sum of durations.
    -   Returns a Map where keys are IDs and values are the calculated start offsets.
6.  Render a Context Provider passing the `register`, `unregister`, `update` functions and the `offsets` map.
7.  Render `props.children` inside the Provider.

**Sequence Component (`Sequence.jsx`)**:
1.  Access the Series Context using `useContext`.
2.  Generate a unique Symbol/ID for this component instance.
3.  **If Context exists**:
    -   Call `register(id, duration)` immediately (or on mount).
    -   Set up a cleanup function to call `unregister(id)`.
    -   Set up an effect to call `update(id, duration)` whenever the `durationInFrames` prop changes.
    -   Define `startFrame` as a function that reads from the Context's `offsets` map using the ID.
4.  **If Context is missing**:
    -   Define `startFrame` as a function that returns `props.from` (defaulting to 0).
5.  Proceed with the existing logic to calculate relative frame and active state, using `startFrame()` instead of the raw prop.

## 4. Test Plan
- **Verification**: Run `npx tsx tests/e2e/verify-render.ts`
- **Success Criteria**:
    - The script executes without errors.
    - The output includes "✅ Solid Animation Helpers Passed!".
    - The generated video (`output/solid-animation-helpers-render-verified.mp4`) visually matches the expected sequential behavior (Red square, then Blue square, then Green square, each appearing after the previous one ends).
- **Edge Cases**:
    - **Single Child**: A Series with one Sequence should start at 0.
    - **Missing Duration**: If a Sequence lacks duration, subsequent items might overlap or start immediately (depending on implementation logic, but pseudo-code implies accumulation).
    - **Standalone Usage**: `<Sequence>` used outside `<Series>` must still work using `props.from`.
