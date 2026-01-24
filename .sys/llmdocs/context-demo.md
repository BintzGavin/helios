# Context: DEMO Domain

## Section A: Examples
The `examples/` directory contains framework-specific implementations of Helios compositions.

- **`simple-canvas-animation`**: Vanilla JS implementation using direct `Helios` usage and `window.helios` exposure.
- **`react-canvas-animation`**: React implementation using `useVideoFrame` hook.
- **`vue-canvas-animation`**: Vue implementation using `useVideoFrame` composable.
- **`svelte-canvas-animation`**: Svelte implementation using `createHeliosStore` and Svelte `readable` store.

## Section B: Build Config
The project uses Vite for building examples.
- **`vite.build-example.config.js`**: Root build configuration.
  - Inputs: Defines entry points for each example (`composition`, `react_composition`, `vue_composition`, `svelte_composition`).
  - Output: `output/example-build/`.
  - Plugins: Includes React, Vue, and Svelte plugins.

## Section C: E2E Tests
End-to-end tests in `tests/e2e/` verify that examples can be rendered by the `Renderer`.
- **`verify-render.ts`**: Verifies that the Vue example builds and renders a video file.
- **`verify-svelte.ts`**: Verifies that the Svelte example builds and renders a video file.
