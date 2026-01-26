#### 1. Context & Goal
- **Objective**: Implement the `<Series>` component for Svelte and update `examples/svelte-animation-helpers` to use it.
- **Trigger**: The README promises `<Series>` support, but the Svelte example lacks it (gap between vision and reality).
- **Impact**: Enables sequential layouts in Svelte without manual frame math, bringing parity with React/Vue examples and fulfilling the "Use What You Know" promise for Svelte users.

#### 2. File Inventory
- **Create**: `examples/svelte-animation-helpers/src/lib/Series.svelte`
- **Modify**:
    - `examples/svelte-animation-helpers/src/lib/context.js` (Add `SERIES_CONTEXT_KEY`)
    - `examples/svelte-animation-helpers/src/lib/Sequence.svelte` (Integrate Series context)
    - `examples/svelte-animation-helpers/src/App.svelte` (Demonstrate `<Series>`)
- **Read-Only**: `examples/svelte-animation-helpers/src/lib/store.js`

#### 3. Implementation Spec
- **Architecture**:
    - **Context Registration Pattern**: Svelte slots are opaque. `<Series>` cannot inspect children props. Instead, children (`<Sequence>`) must register themselves with the parent `<Series>` context to "ask" for their start offset.
    - **Reactivity**: Uses Svelte Stores (`writable`, `derived`) to track the list of children durations and calculate cumulative offsets. This ensures that if a child's duration changes, all subsequent siblings adjust automatically.
    - **API Compatibility**: `<Sequence>` will prioritize the Series-assigned offset over its `from` prop if a Series context is present.
- **Pseudo-Code (Series.svelte)**:
    - `items` = writable array of `{id, duration}`
    - `offsets` = derived map from `items` (cumulative sum)
    - `setContext` with:
        - `register(id, duration)`: adds item, returns unregister fn
        - `update(id, duration)`: updates item
        - `getOffset(id)`: returns derived store for that id
- **Pseudo-Code (Sequence.svelte)**:
    - `id` = unique symbol
    - Check `getContext(Series)`
    - If exists:
        - `register(id, duration)`
        - `actualFrom` = derived from `getOffset(id)`
        - Reactive: `$: if (series) series.update(id, duration)`
    - Else:
        - `actualFrom` = `from` prop
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
    - Run `npm run build:examples` to ensure successful compilation.
    - Run `npx tsx tests/e2e/verify-render.ts` to render the `Svelte Helpers` example.
- **Success Criteria**:
    - The `App.svelte` example compiles with `<Series>` usage.
    - The output video `output/svelte-helpers-render-verified.mp4` is generated.
    - The sequences play in order (Red -> Blue -> Nested) without overlap, verifying the offset logic.
- **Edge Cases**:
    - Dynamic duration changes (Reactivity handles this).
