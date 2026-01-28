# SolidJS Canvas Animation Example

This example demonstrates how to integrate [SolidJS](https://www.solidjs.com/) with Helios using a custom `createHeliosSignal` adapter.

## Key Concepts

- **Signals**: We adapt the Helios imperative API (`subscribe`, `getState`) into a reactive Solid Signal.
- **Effects**: We use `createEffect` to drive the Canvas rendering loop whenever the frame state updates.
- **Fine-Grained Reactivity**: Solid's fine-grained reactivity ensures efficient updates without Virtual DOM diffing overhead.

## Implementation

The adapter `createHeliosSignal` (in `src/lib/createHeliosSignal.js`) handles the subscription lifecycle:

```javascript
export function createHeliosSignal(helios) {
  const [state, setState] = createSignal(helios.getState());

  onMount(() => {
    const unsub = helios.subscribe(setState);
    onCleanup(() => unsub());
  });

  return state;
}
```

In the component, we consume it:

```javascript
const frame = createHeliosSignal(window.helios);

createEffect(() => {
  const { currentFrame } = frame();
  // Draw to canvas...
});
```
