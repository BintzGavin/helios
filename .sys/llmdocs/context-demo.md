# Context: DEMO Domain

## A. Examples
The `examples/` directory contains reference implementations for various frameworks and use cases.

### Vanilla JS
- **simple-animation**: Basic DOM animation using CSS.
- **vanilla-typescript**: Basic TypeScript example with Vite.
- **vanilla-transitions**: Sequenced scene transitions using core utilities.
- **simple-canvas-animation**: Basic Canvas animation.
- **waapi-animation**: Web Animations API integration.
- **vanilla-animation-helpers**: Sequencing utilities for Vanilla JS.
- **vanilla-captions-animation**: Integration with Helios SRT captions in Vanilla JS.
- **web-component-animation**: Helios inside a Shadow DOM web component.
- **client-export-api**: Programmatic client-side export using `ClientSideExporter` and `BridgeController` without the default player UI.
- **code-walkthrough**: Syntax highlighting and line focusing.
- **media-element-animation**: Sync of `<video>` and `<audio>` elements.
- **diagnostics**: System capability and WebCodecs support checker.
- **stress-test-animation**: High-element count stress test (2500+ elements).
- **text-effects-animation**: Typewriter and reveal effects.
- **variable-font-animation**: Animating variable font axes.

### React
- **react-dom-animation**: Basic React + DOM.
- **react-canvas-animation**: Basic React + Canvas.
- **react-captions-animation**: React hooks for Helios SRT captions.
- **react-css-animation**: Standard CSS animations in React.
- **react-styled-components**: Styled Components integration.
- **react-three-fiber**: 3D animation with React Three Fiber.
- **react-transitions**: `react-transition-group` integration.
- **react-animation-helpers**: Helper components for sequencing.
- **react-audio-visualization**: Real-time audio frequency analysis visualization.
- **react-lottie-animation**: Rendering Lottie JSON animations.

### Vue
- **vue-dom-animation**: Basic Vue + DOM.
- **vue-canvas-animation**: Basic Vue + Canvas.
- **vue-audio-visualization**: Real-time audio frequency analysis visualization.
- **vue-captions-animation**: Vue Composition API for Helios SRT captions.
- **vue-threejs-canvas-animation**: 3D animation with Three.js and Vue.
- **vue-transitions**: Vue `<Transition>` component.
- **vue-animation-helpers**: Helper components for sequencing.
- **vue-lottie-animation**: Rendering Lottie JSON animations.

### Svelte
- **svelte-dom-animation**: Basic Svelte + DOM.
- **svelte-canvas-animation**: Basic Svelte + Canvas.
- **svelte-audio-visualization**: Real-time audio frequency analysis visualization.
- **svelte-captions-animation**: Svelte stores for Helios SRT captions.
- **svelte-threejs-canvas-animation**: 3D animation with Three.js and Svelte.
- **svelte-transitions**: Svelte native transition directives.
- **svelte-runes-animation**: Svelte 5 Runes syntax.
- **svelte-animation-helpers**: Helper components for sequencing.

### Solid
- **solid-dom-animation**: Basic SolidJS + DOM.
- **solid-canvas-animation**: Basic SolidJS + Canvas.
- **solid-captions-animation**: SolidJS signals for Helios SRT captions.
- **solid-threejs-canvas-animation**: 3D animation with Three.js and SolidJS.
- **solid-transitions**: Solid Transition Group.
- **solid-animation-helpers**: Helper components for sequencing.

### Integrations
- **threejs-canvas-animation**: 3D scenes with Three.js (Vanilla).
- **pixi-canvas-animation**: 2D graphics with PixiJS.
- **p5-canvas-animation**: Creative coding with P5.js.
- **d3-animation**: Data visualization with D3.js.
- **chartjs-animation**: Animated charts with Chart.js.
- **excalidraw-animation**: Whiteboard animation with Excalidraw.
- **lottie-animation**: Rendering Lottie JSON animations.
- **framer-motion-animation**: React motion library integration.
- **gsap-animation**: GreenSock Animation Platform integration.
- **motion-one-animation**: Motion One library integration.
- **tailwind-animation**: Styling and animation with Tailwind CSS.

### Advanced
- **podcast-visualizer**: Multi-track audio visualization using `AudioContext` analysis.
- **promo-video**: Marketing promo video template.
- **social-media-story**: Vertical video format.
- **audio-visualization**: Real-time frequency analysis.
- **map-animation**: Animated maps with Leaflet.
- **procedural-generation**: Deterministic random generation.

### Core Concepts
- **animation-helpers**: Core utilities (legacy/reference).
- **dynamic-props-animation**: Input props and schema validation.
- **signals-animation**: Signals architecture for performance.

## B. Build Config
The build system uses Vite with a custom configuration `vite.build-example.config.js`.

### Key Features
- **Dynamic Discovery**: Scans `examples/` directory for `composition.html` files.
- **Aliases**: Maps `@helios-project/*` packages to local source files for development.
- **Framework Plugins**:
  - `react()`: Excludes SolidJS examples to avoid conflicts.
  - `vue()`: Supports Vue SFCs.
  - `svelte()`: Supports Svelte components.
  - `solidPlugin()`: Explicitly includes SolidJS examples.
- **Assets**: Copies Excalidraw fonts to output directory.

### Commands
- `npm run build:examples`: Builds all examples to `output/example-build`.
- `npm run dev`: Starts dev server for `simple-canvas-animation`.
- `npm run dev:[name]`: Starts dev server for specific examples (e.g., `dev:react`, `dev:vue`).

## C. E2E Tests
E2E tests are located in `tests/e2e/` and use Playwright + FFmpeg.

- **verify-all.ts**: Orchestrator script that builds dependencies, builds examples, and runs all verification steps.
- **verify-render.ts**: Verifies that examples render correctly to video.
  - Dynamically discovers examples in `examples/`.
  - Supports `dom` and `canvas` modes (auto-detected or overridden).
  - Supports custom duration and brightness thresholds per example (e.g., `promo-video`).
  - Checks for video duration and non-black frames (using FFmpeg `signalstats`).
  - Usage: `npx tsx tests/e2e/verify-render.ts [filter]`
- **verify-client-export.ts**: Verifies client-side export functionality using `ClientSideExporter`.
- **verify-player.ts**: Verifies the `<helios-player>` Web Component.
