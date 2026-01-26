# DEMO Context

## Section A: Examples
- `examples/simple-canvas-animation`: Vanilla JS Canvas API.
- `examples/simple-animation`: Vanilla JS DOM (native CSS Animations).
- `examples/gsap-animation`: Vanilla JS DOM driving GSAP timelines.
- `examples/animation-helpers`: Vanilla JS Canvas demonstrating `interpolate`, `spring`, `sequence`, and `series`.
- `examples/react-canvas-animation`: React with Canvas.
- `examples/react-dom-animation`: React with DOM elements.
- `examples/react-animation-helpers`: React demonstrating `<Sequence>` and `<Series>` components.
- `examples/vue-canvas-animation`: Vue with Canvas.
- `examples/vue-dom-animation`: Vue with DOM elements.
- `examples/vue-animation-helpers`: Vue demonstrating `<Sequence>` and `<Series>` components.
- `examples/svelte-canvas-animation`: Svelte with Canvas.
- `examples/svelte-dom-animation`: Svelte with DOM elements.
- `examples/svelte-animation-helpers`: Svelte demonstrating `<Sequence>` and `<Series>` components.
- `examples/threejs-canvas-animation`: Three.js integration.
- `examples/pixi-canvas-animation`: Pixi.js integration.

## Section B: Build Config
- `vite.build-example.config.js`: Root configuration for building all examples.
- Output directory: `output/example-build/`.
- Entry points defined in `rollupOptions.input`.

## Section C: E2E Tests
- `tests/e2e/verify-render.ts`: Script using Playwright and Renderer to verify that examples render correctly to video.
- Verified cases: Canvas, DOM, React, React DOM, Vue, Vue DOM, Svelte, Svelte DOM, ThreeJS, Pixi, Helpers, React Helpers, Svelte Helpers, Vue Helpers, GSAP.
