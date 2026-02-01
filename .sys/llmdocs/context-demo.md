# DEMO Domain Context

## A. Examples
The `examples/` directory contains reference implementations for various frameworks and techniques. See `examples/README.md` for a categorized list.

- **animation-helpers**: Demonstrates core animation utilities (`interpolate`, `spring`).
- **audio-visualization**: Visualizes audio data using Canvas.
- **captions-animation**: Renders SRT captions.
- **chartjs-animation**: Integration with Chart.js.
- **client-export-api**: Demonstrates programmtic client-side export using `ClientSideExporter` and `BridgeController` without the default player UI.
- **code-walkthrough**: Demonstrates syntax highlighting and line focusing for developer content.
- **d3-animation**: Integration with D3.js.
- **diagnostics**: System capability and WebCodecs support checker.
- **dynamic-props-animation**: Demonstrates `inputProps` and schema validation.
- **framer-motion-animation**: Integration with Framer Motion.
- **gsap-animation**: Integration with GSAP.
- **lottie-animation**: Integration with Lottie.
- **map-animation**: Integration with Leaflet maps.
- **media-element-animation**: Synchronization of `<video>` and `<audio>` elements.
- **motion-one-animation**: Integration with Motion One.
- **p5-canvas-animation**: Integration with P5.js.
- **pixi-canvas-animation**: Integration with PixiJS.
- **podcast-visualizer**: Complex example with multi-track audio mixing.
- **procedural-generation**: Deterministic randomness and procedural content.
- **promo-video**: A comprehensive marketing video example demonstrating multi-scene GSAP animations.
- **react-animation-helpers**: React components for sequencing and timing.
- **react-canvas-animation**: Basic React + Canvas example.
- **react-captions-animation**: React integration with Helios SRT captions.
- **react-css-animation**: React with CSS animations.
- **react-dom-animation**: Basic React + DOM example.
- **react-styled-components**: React with Styled Components.
- **react-three-fiber**: Integration with React Three Fiber (R3F).
- **react-transitions**: React transition group integration.
- **signals-animation**: Fine-grained reactivity using Helios signals.
- **simple-animation**: Vanilla JS DOM animation.
- **simple-canvas-animation**: Vanilla JS Canvas animation.
- **social-media-story**: Social media story format example.
- **solid-animation-helpers**: SolidJS components for sequencing and core utilities.
- **solid-canvas-animation**: SolidJS + Canvas integration.
- **solid-dom-animation**: SolidJS + DOM integration.
- **solid-threejs-canvas-animation**: SolidJS + Three.js integration using reactive frame updates.
- **solid-transitions**: SolidJS CSS transitions.
- **stress-test-animation**: High-element count stress test.
- **svelte-animation-helpers**: Svelte components for sequencing and core utilities.
- **svelte-canvas-animation**: Svelte + Canvas example.
- **svelte-captions-animation**: Svelte integration with Helios SRT captions.
- **svelte-dom-animation**: Svelte + DOM example.
- **svelte-runes-animation**: Svelte 5 Runes example.
- **svelte-threejs-canvas-animation**: Integration with Three.js using Svelte 5 and reactive updates.
- **svelte-transitions**: Svelte CSS transitions.
- **tailwind-animation**: Tailwind CSS integration.
- **text-effects-animation**: Typewriter and reveal effects.
- **threejs-canvas-animation**: Integration with Three.js.
- **vanilla-typescript**: Vanilla TypeScript example.
- **variable-font-animation**: Animating variable fonts.
- **vue-animation-helpers**: Vue components for sequencing and core utilities.
- **vue-canvas-animation**: Vue + Canvas example.
- **vue-captions-animation**: Vue integration with Helios SRT captions.
- **vue-dom-animation**: Vue + DOM example.
- **vue-threejs-canvas-animation**: Vue 3 + Three.js integration using reactive frame updates.
- **vue-transitions**: Vue CSS transitions.
- **waapi-animation**: Web Animations API integration.
- **web-component-animation**: Shadow DOM and Web Component integration.

## B. Build Config
- **Root**: `vite.config.js` (for dev) and `vite.build-example.config.js` (for build).
- **Aliases**: Configured to point `@helios-project/core`, `@helios-project/player`, etc., to their source files (`packages/*/src`) to allow developing examples against the latest source without rebuilding packages.
- **Discovery**: `vite.build-example.config.js` dynamically discovers examples by looking for `composition.html` in subdirectories of `examples/`. It also includes `index.html` for specific examples like `client-export-api`.

## C. E2E Tests
Tests are located in `tests/e2e/`.

- **verify-all.ts**: The master script (`npm run verify:e2e`). Builds Core/Renderer/Examples and runs all verifications.
- **verify-render.ts**: Verifies server-side rendering using the `Renderer` class.
    - Scans `output/example-build` for compositions.
    - Renders each example to MP4 using `Renderer`.
    - STRICTLY verifies output content using FFmpeg: checks video duration and ensures non-black frames (YMAX > 0).
    - Supports filtering via command line arguments.
- **verify-client-export.ts**: Verifies the client-side export pipeline.
    - Dynamically discovers all examples in `examples/`.
    - Spawns a local Node.js HTTP server.
    - Launches Playwright (Chromium).
    - Iterates through examples, loading each into a generic `<helios-player>` fixture (`tests/e2e/fixtures/dynamic-player.html`).
    - Triggers export via the player UI and verifies the download event.
- **verify-player.ts**: Verifies the `<helios-player>` Web Component.
    - Spawns a static file server.
    - Launches Playwright.
    - Navigates to a fixture page loading the player and a simple composition.
    - Verifies playback controls and time advancement.
