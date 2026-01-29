# 2026-01-29-DEMO-SolidAnimationHelpers

## 1. Context & Goal
- **Objective**: Create `examples/solid-animation-helpers` demonstrating `<Sequence>` and `<Series>` components using SolidJS.
- **Trigger**: Vision gap (Animation Helpers + Framework Support) and completing framework matrix.
- **Impact**: Enables SolidJS users to use timeline helpers, aligning Solid support with React/Vue/Svelte.

## 2. File Inventory

**Create:**
- `examples/solid-animation-helpers/vite.config.js`: Vite config using `vite-plugin-solid`.
- `examples/solid-animation-helpers/composition.html`: Entry point.
- `examples/solid-animation-helpers/src/index.jsx`: Mounts App to DOM.
- `examples/solid-animation-helpers/src/style.css`: Basic styling.
- `examples/solid-animation-helpers/src/lib/createHeliosSignal.js`: Adapter for Helios <-> Solid Signals.
- `examples/solid-animation-helpers/src/components/Series.jsx`: Container component managing sequential timing via Context.
- `examples/solid-animation-helpers/src/components/Sequence.jsx`: Component for timed sequences using Core `sequence` utility.
- `examples/solid-animation-helpers/src/components/FrameContext.jsx`: Context for passing relative frame time.
- `examples/solid-animation-helpers/src/App.jsx`: Demo composition using Series and Sequence.

**Modify:**
- `vite.build-example.config.js`: Update **BOTH** the `solidPlugin` include regex **AND** the `react` plugin exclude regex to match `/examples\/solid-((canvas|dom)-animation|animation-helpers)/`, and add the new example to `rollupOptions.input`.
- `tests/e2e/verify-render.ts`: Add `{ name: 'Solid Helpers', ... }` to the `CASES` array.

**Read-Only:**
- `examples/solid-dom-animation/src/lib/createHeliosSignal.js`: Reference implementation.
- `packages/core/src/index.ts`: Reference for `sequence` utility.

## 3. Implementation Spec

**Architecture:**
- Uses **SolidJS** signals and context.
- **Series Pattern**: Uses "Context Registration" pattern (similar to Svelte example) where children register themselves to a parent store/signal to calculate cumulative offsets, as Solid lacks `cloneElement`.
- **Sequence Pattern**: Uses `sequence()` from `@helios-project/core` to determine activity and relative time.

**Pseudo-Code:**

*Series.jsx*:
```javascript
createContext()
export Series = (props) => {
  const [items, setItems] = createSignal([])
  const register = (id, duration) => setItems(prev => [...prev, {id, duration}])
  const offsets = createMemo(() => calculateOffsets(items()))

  provide(Context, { register, getOffset: id => offsets()[id] })
  return props.children
}
```

*Sequence.jsx*:
```javascript
export Sequence = (props) => {
  const id = createUniqueId()
  const context = useContext(SeriesContext)

  onMount(() => context?.register(id, props.duration))
  onCleanup(() => context?.unregister(id))

  const offset = createMemo(() => context ? context.getOffset(id) : 0)
  const actualFrom = () => props.from + offset()

  // Use helios state
  const { isActive, relativeFrame } = deriveSequenceState(actualFrom, props.duration)

  return <Show when={isActive}><FrameProvider frame={relativeFrame}>{props.children}</FrameProvider></Show>
}
```

**Dependencies:**
- `vite-plugin-solid` (existing in root).
- `solid-js` (existing in root).

## 4. Test Plan

**Verification:**
- Run `npm run build:examples` to ensure the new example compiles.
- Run `npx ts-node tests/e2e/verify-render.ts` to verify the rendering pipeline.

**Success Criteria:**
- Build completes without error.
- `verify-render.ts` outputs `✅ Solid Helpers Passed!`.
