---
title: "Svelte Examples"
description: "Collection of Svelte animation examples"
---

# Svelte Examples

Svelte's compiler-based approach provides a highly performant way to build compositions.

## Svelte Runes Animation (Svelte 5)

Location: `examples/svelte-runes-animation`

Demonstrates using Svelte 5's new Runes syntax (`$state`, `$derived`, `$effect`) to create reactive animations driven by Helios.

```javascript
let frame = $state(0);
helios.subscribe(s => frame = s.currentFrame);

let x = $derived(frame * 10);
```

## Svelte Three.js Animation

Location: `examples/svelte-threejs-canvas-animation`

Integrates Three.js with Svelte. Svelte's lifecycle functions (`onMount`) are used to initialize the Three.js scene, and reactive statements update the scene on every frame.

## Svelte Transitions

Location: `examples/svelte-transitions`

Synchronizes Svelte's built-in transition engine (`transition:fade`, `animate:flip`) with the Helios timeline. *Note: Svelte transitions are JS-based, so `autoSyncAnimations` supports them best when they map to CSS, but custom seeking logic is often required.*

## Svelte Captions

Location: `examples/svelte-captions-animation`

Renders subtitles using Svelte's `{#each}` block and a store bound to `helios.activeCaptions`.

## Svelte Animation Helpers

Location: `examples/svelte-animation-helpers`

Demonstrates creating `<Sequence>` and `<Series>` components using slots to organize complex timelines.
