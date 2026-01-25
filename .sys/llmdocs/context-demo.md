# DEMO Context

## A. Examples
- **simple-canvas-animation**: Vanilla JS example using the Canvas Strategy.
- **simple-animation**: Vanilla JS example using the DOM Strategy (HTML/CSS).
- **react-canvas-animation**: React example using `useVideoFrame` hook and Canvas Strategy.
- **vue-canvas-animation**: Vue example using Canvas Strategy.
- **svelte-canvas-animation**: Svelte example using Canvas Strategy.
- **threejs-canvas-animation**: Three.js example using WebGL and Canvas Strategy.

## B. Build Config
- **Root**: `vite.config.js` for dev server.
- **Examples Build**: `vite.build-example.config.js` builds all examples into `output/example-build/`.
  - Inputs: `simple_canvas`, `simple_dom`, `react_composition`, `vue_composition`, `svelte_composition`, `threejs_composition`.
  - Output: `output/example-build/examples/<example>/composition.html`.

## C. E2E Tests
- **verify-render.ts**: Verifies that all examples can be rendered to MP4 (Canvas and DOM modes).
  - Usage: `npm run build:examples && npx tsx tests/e2e/verify-render.ts`
  - Output: `output/<example>-render-verified.mp4`
