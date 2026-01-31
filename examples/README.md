# Helios Examples

This directory contains reference implementations and examples for **Helios**, demonstrating how to use the engine with various frameworks, libraries, and techniques.

## Vanilla JS
These examples use plain JavaScript without any framework, demonstrating the core API directly.

- **[simple-animation](./simple-animation/)**: A basic DOM animation example using CSS.
- **[vanilla-typescript](./vanilla-typescript/)**: A basic TypeScript example with Vite integration.
- **[simple-canvas-animation](./simple-canvas-animation/)**: A basic Canvas animation example.
- **[waapi-animation](./waapi-animation/)**: Integration with the Web Animations API (WAAPI).
- **[web-component-animation](./web-component-animation/)**: Using Helios inside a Shadow DOM web component.
- **[client-export-api](./client-export-api/)**: Programmatic client-side export using `ClientSideExporter` and `BridgeController` without the default player UI.
- **[code-walkthrough](./code-walkthrough/)**: Syntax highlighting and line focusing for developer content.
- **[media-element-animation](./media-element-animation/)**: Synchronization of `<video>` and `<audio>` elements.
- **[diagnostics](./diagnostics/)**: System capability and WebCodecs support checker.
- **[stress-test-animation](./stress-test-animation/)**: High-element count stress test (2500+ elements).
- **[text-effects-animation](./text-effects-animation/)**: Typewriter and reveal effects.
- **[variable-font-animation](./variable-font-animation/)**: Animating variable font axes.

## React
Examples using the React adapter (`useVideoFrame`, hooks).

- **[react-dom-animation](./react-dom-animation/)**: Basic React + DOM example.
- **[react-canvas-animation](./react-canvas-animation/)**: Basic React + Canvas example.
- **[react-captions-animation](./react-captions-animation/)**: Integration with Helios SRT captions.
- **[react-css-animation](./react-css-animation/)**: Using standard CSS animations in React.
- **[react-styled-components](./react-styled-components/)**: Integration with Styled Components.
- **[react-three-fiber](./react-three-fiber/)**: 3D animation with React Three Fiber (R3F).
- **[react-transitions](./react-transitions/)**: Using `react-transition-group` for enter/exit animations.
- **[react-animation-helpers](./react-animation-helpers/)**: Helper components for sequencing and timing.

## Vue
Examples using the Vue adapter (Composition API).

- **[vue-dom-animation](./vue-dom-animation/)**: Basic Vue + DOM example.
- **[vue-canvas-animation](./vue-canvas-animation/)**: Basic Vue + Canvas example.
- **[vue-transitions](./vue-transitions/)**: Using Vue's `<Transition>` component.
- **[vue-animation-helpers](./vue-animation-helpers/)**: Helper components for sequencing.

## Svelte
Examples using the Svelte adapter (Stores, Runes).

- **[svelte-dom-animation](./svelte-dom-animation/)**: Basic Svelte + DOM example.
- **[svelte-canvas-animation](./svelte-canvas-animation/)**: Basic Svelte + Canvas example.
- **[svelte-transitions](./svelte-transitions/)**: Using Svelte's native transition directives.
- **[svelte-runes-animation](./svelte-runes-animation/)**: Example using Svelte 5 Runes syntax.
- **[svelte-animation-helpers](./svelte-animation-helpers/)**: Helper components for sequencing.

## Solid
Examples using the SolidJS adapter (Signals).

- **[solid-dom-animation](./solid-dom-animation/)**: Basic SolidJS + DOM example.
- **[solid-canvas-animation](./solid-canvas-animation/)**: Basic SolidJS + Canvas example.
- **[solid-transitions](./solid-transitions/)**: Using Solid Transition Group.
- **[solid-animation-helpers](./solid-animation-helpers/)**: Helper components for sequencing.

## Integrations
Integration with popular third-party animation and graphics libraries.

- **[threejs-canvas-animation](./threejs-canvas-animation/)**: 3D scenes with Three.js.
- **[pixi-canvas-animation](./pixi-canvas-animation/)**: 2D graphics with PixiJS.
- **[p5-canvas-animation](./p5-canvas-animation/)**: Creative coding with P5.js.
- **[d3-animation](./d3-animation/)**: Data visualization with D3.js.
- **[chartjs-animation](./chartjs-animation/)**: Animated charts with Chart.js.
- **[lottie-animation](./lottie-animation/)**: Rendering Lottie JSON animations.
- **[framer-motion-animation](./framer-motion-animation/)**: React motion library integration.
- **[gsap-animation](./gsap-animation/)**: GreenSock Animation Platform integration.
- **[motion-one-animation](./motion-one-animation/)**: Motion One library integration.
- **[tailwind-animation](./tailwind-animation/)**: Styling and animation with Tailwind CSS.

## Advanced & Complete Compositions
Realistic, complex examples demonstrating full use cases.

- **[podcast-visualizer](./podcast-visualizer/)**: Multi-track audio visualization with waveforms.
- **[promo-video](./promo-video/)**: A marketing promo video template.
- **[social-media-story](./social-media-story/)**: Vertical video format for stories/reels.
- **[audio-visualization](./audio-visualization/)**: Real-time frequency analysis visualization.
- **[map-animation](./map-animation/)**: Animated maps with Leaflet.
- **[procedural-generation](./procedural-generation/)**: Deterministic random generation for visuals.

## Core Concepts
Examples focusing on specific Helios engine features.

- **[animation-helpers](./animation-helpers/)**: Core utilities like `interpolate` and `spring`.
- **[dynamic-props-animation](./dynamic-props-animation/)**: Using `inputProps` and schema validation for dynamic content.
- **[signals-animation](./signals-animation/)**: Using the signals architecture for fine-grained performance.

---

## How to Run

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Build examples**:
   ```bash
   npm run build:examples
   ```

3. **Preview**:
   Most examples include a `composition.html` that can be loaded in the Helios Player.

   To run the E2E verification for all examples:
   ```bash
   npm run verify:e2e
   ```
