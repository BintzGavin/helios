# DEMO Domain Context

## A. Examples

| Example | Description | Strategy |
| :--- | :--- | :--- |
| `examples/simple-canvas-animation` | Vanilla JS canvas animation. | Canvas |
| `examples/simple-animation` | Vanilla JS DOM animation using CSS `@keyframes`. | DOM |
| `examples/gsap-animation` | Integration with GSAP timelines. | DOM |
| `examples/framer-motion-animation` | Integration with Framer Motion via `useMotionValue`. | DOM |
| `examples/lottie-animation` | Integration with Lottie (`lottie-web`) via frame seeking. | DOM |
| `examples/motion-one-animation` | Integration with Motion One via `autoSyncAnimations`. | DOM |
| `examples/captions-animation` | Integration with built-in SRT captions. | DOM |
| `examples/signals-animation` | Vanilla JS signals (`signal`, `computed`, `effect`). | DOM |
| `examples/dynamic-props-animation` | React example for `inputProps` and schema validation. | DOM |
| `examples/animation-helpers` | Vanilla JS reference for `interpolate`, `spring`, `sequence`, `series`. | Canvas |
| `examples/react-canvas-animation` | React canvas animation. | Canvas |
| `examples/react-dom-animation` | React DOM animation. | DOM |
| `examples/react-css-animation` | React CSS animation via `autoSyncAnimations`. | DOM |
| `examples/react-animation-helpers` | React helpers (`<Sequence>`, `<Series>`) for composition. | DOM |
| `examples/vue-canvas-animation` | Vue canvas animation. | Canvas |
| `examples/vue-dom-animation` | Vue DOM animation. | DOM |
| `examples/vue-animation-helpers` | Vue helpers (`<Sequence>`, `<Series>`) for composition. | DOM |
| `examples/svelte-canvas-animation` | Svelte canvas animation. | Canvas |
| `examples/svelte-dom-animation` | Svelte DOM animation. | DOM |
| `examples/svelte-animation-helpers` | Svelte helpers (`<Sequence>`, `<Series>`) for composition. | DOM |
| `examples/threejs-canvas-animation` | Three.js integration. | Canvas |
| `examples/pixi-canvas-animation` | Pixi.js integration. | Canvas |

## B. Build Config

- **Root Config**: `vite.config.js` (dev server), `vite.build-example.config.js` (production build).
- **Tooling**: Vite, Rollup.
- **Output**: `output/example-build/`
- **Pattern**: Examples reference core via relative paths (`../../packages/core/dist/index.js`) to verify local builds.

## C. E2E Tests

- **Script**: `tests/e2e/verify-render.ts`
- **Runner**: Playwright + FFmpeg
- **Verification**:
  - Builds all examples via `npm run build:examples`.
  - Renders each example using `packages/renderer`.
  - Checks for successful video generation (`.mp4`).
  - Covers both Canvas and DOM strategies.
  - **Note**: Must run with `ts-node` to avoid `__name` reference errors in DOM strategy.
