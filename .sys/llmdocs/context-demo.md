# Context: DEMO Domain

## A. Examples
- `examples/web-component-animation`: Native Web Components (Shadow DOM + CSS).
- `examples/simple-canvas-animation`: Vanilla JS Canvas API.
- `examples/simple-animation`: Vanilla JS DOM + CSS Animations.
- `examples/variable-font-animation`: Variable Font animation using CSS.
- `examples/waapi-animation`: Web Animations API (element.animate()).
- `examples/procedural-generation`: Deterministic `random` and `interpolateColors` (Canvas).
- `examples/audio-visualization`: Raw audio data visualization (Canvas).
- `examples/media-element-animation`: Native `<video>`/`<audio>` synchronization.
- `examples/podcast-visualizer`: Multi-track audio mixing (volume, muted, offset) and synchronization.
- `examples/gsap-animation`: GreenSock Animation Platform (GSAP).
- `examples/framer-motion-animation`: React Framer Motion.
- `examples/lottie-animation`: Airbnb Lottie (lottie-web).
- `examples/motion-one-animation`: Motion One (motion).
- `examples/d3-animation`: D3.js data visualization.
- `examples/chartjs-animation`: Chart.js data visualization.
- `examples/social-media-story`: React-based social media story (9:16) with video sync.
- `examples/captions-animation`: Built-in SRT captions.
- `examples/signals-animation`: Fine-grained reactivity (signals).
- `examples/dynamic-props-animation`: Input props and schema validation.
- `examples/animation-helpers`: Core helpers (interpolate, spring).
- `examples/react-canvas-animation`: React Canvas.
- `examples/react-dom-animation`: React DOM.
- `examples/react-css-animation`: React CSS Animations.
- `examples/react-transitions`: React transitions (CSS animation synchronization).
- `examples/react-styled-components`: React Styled Components (CSS-in-JS).
- `examples/react-animation-helpers`: React `<Sequence>`, `<Series>`.
- `examples/vue-canvas-animation`: Vue Canvas.
- `examples/vue-dom-animation`: Vue DOM.
- `examples/vue-animation-helpers`: Vue `<Sequence>`, `<Series>`.
- `examples/vue-transitions`: Vue transitions (CSS animation synchronization).
- `examples/svelte-canvas-animation`: Svelte Canvas.
- `examples/svelte-dom-animation`: Svelte DOM.
- `examples/svelte-animation-helpers`: Svelte `<Sequence>`, `<Series>`.
- `examples/svelte-transitions`: Svelte transitions (CSS animation synchronization).
- `examples/svelte-runes-animation`: Svelte 5 Runes ($state, $derived).
- `examples/solid-canvas-animation`: SolidJS Canvas (Signals adapter).
- `examples/solid-dom-animation`: SolidJS DOM (Signals + CSS).
- `examples/solid-animation-helpers`: SolidJS Helpers (`<Sequence>`, `<Series>`).
- `examples/solid-transitions`: SolidJS transitions (CSS animation synchronization).
- `examples/map-animation`: Leaflet Maps (DOM).
- `examples/text-effects-animation`: Text Effects (Typewriter, Staggered Reveal).
- `examples/promo-video`: Promo video (Multi-scene GSAP animation).
- `examples/threejs-canvas-animation`: Three.js (3D).
- `examples/react-three-fiber`: React Three Fiber (R3F) integration.
- `examples/pixi-canvas-animation`: PixiJS (2D).
- `examples/p5-canvas-animation`: P5.js (Instance Mode).
- `examples/tailwind-animation`: Tailwind CSS v3 integration.
- `examples/stress-test-animation`: Stress test with 2500+ animated elements (Signals).

## B. Build Config
- **Root Config**: `vite.config.js` (shared settings).
- **Example Build**: `vite.build-example.config.js` defines entry points for all examples.
- **Frameworks**: React, Vue, Svelte, Solid supported via Vite plugins.
- **PostCSS/Tailwind**: Root `postcss.config.js` and `tailwind.config.js` (scoped content).

## C. E2E Tests
- **File**: `tests/e2e/verify-render.ts`
- **Methodology**: Builds all examples using `vite.build-example.config.js`, then uses `Renderer` (headless browser + FFmpeg) to render a 5-second video for each, supporting both 'canvas' and 'dom' modes.
- **Verification**: Checks that render completes without error and output file exists. Does NOT verify visual content correctness (opacity, etc).
