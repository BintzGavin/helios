---
title: "Caption Examples"
description: "Examples of rendering captions in various frameworks"
---

# Caption Examples

Helios makes it easy to render synchronized captions in any framework. The core principle is subscribing to the `activeCaptions` signal, which provides the list of caption cues active at the current time.

## Vanilla TypeScript

Location: `examples/vanilla-captions-animation`

This example demonstrates how to use the `activeCaptions` signal directly in a Vanilla JS environment.

```typescript
import { Helios } from '@helios-project/core';

const helios = new Helios({
    captions: srtContent,
    // ...
});

const captionContainer = document.getElementById('captions');

helios.subscribe((state) => {
    const active = state.activeCaptions;

    // Efficiently update DOM
    const text = active.map(c => c.text).join('\n');
    if (captionContainer.textContent !== text) {
        captionContainer.textContent = text;
    }
});
```

## React

Location: `examples/react-captions-animation`

Uses a custom hook to expose `activeCaptions` to React components.

```javascript
// useCaptions.js
export function useCaptions(helios) {
  const [captions, setCaptions] = useState(helios.activeCaptions.value);
  useEffect(() => helios.subscribe(s => setCaptions(s.activeCaptions)), [helios]);
  return captions;
}
```

```jsx
// Component
const activeCues = useCaptions(helios);
return <div>{activeCues.map(c => <p key={c.id}>{c.text}</p>)}</div>;
```

## Vue 3

Location: `examples/vue-captions-animation`

Uses Vue's Composition API `ref` and `watchEffect` (or direct subscription).

```javascript
// useCaptions.ts
export function useCaptions(helios) {
    const activeCaptions = ref([]);
    helios.subscribe(state => {
        activeCaptions.value = state.activeCaptions;
    });
    return activeCaptions;
}
```

## Svelte

Location: `examples/svelte-captions-animation`

Uses Svelte stores or signals to track the caption state.

```javascript
// store.js
export const activeCaptions = writable([]);
helios.subscribe(state => activeCaptions.set(state.activeCaptions));
```

```html
<!-- Component.svelte -->
{#each $activeCaptions as cue}
  <p>{cue.text}</p>
{/each}
```

## SolidJS

Location: `examples/solid-captions-animation`

SolidJS is a perfect match for Helios signals. You can often use the Helios signal directly or wrap it in a Solid signal.

```javascript
// useHeliosSignal.ts adapter
const [activeCaptions, setActiveCaptions] = createSignal(helios.activeCaptions.value);
helios.subscribe(state => setActiveCaptions(state.activeCaptions));
```

```jsx
// Component
<For each={activeCaptions()}>{(cue) => <p>{cue.text}</p>}</For>
```
