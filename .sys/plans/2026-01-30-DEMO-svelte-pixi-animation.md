#### 1. Context & Goal
- **Objective**: Create a Svelte 5 example demonstrating integration with PixiJS v8.
- **Trigger**: The project vision ("Use What You Know") promises framework-agnostic support, but while React and Vue have PixiJS examples, Svelte does not.
- **Impact**: This unlocks the ability for Svelte developers to use high-performance WebGL rendering within Helios, closing a feature gap in the example matrix.

#### 2. File Inventory
- **Create**:
    - `examples/svelte-pixi-animation/package.json`: Defines dependencies (`svelte`, `pixi.js`, `@helios-project/core`) and build scripts.
    - `examples/svelte-pixi-animation/vite.config.js`: Configures Vite with `@sveltejs/vite-plugin-svelte` and path aliases.
    - `examples/svelte-pixi-animation/composition.html`: The entry point for the Helios Player.
    - `examples/svelte-pixi-animation/index.html`: The entry point for local development (dev server).
    - `examples/svelte-pixi-animation/src/main.ts`: The application entry point mounting the Svelte app.
    - `examples/svelte-pixi-animation/src/App.svelte`: The main component containing the Helios + Pixi logic.
- **Modify**: None.
- **Read-Only**: `examples/svelte-lottie-animation/vite.config.js` (for reference pattern).

#### 3. Implementation Spec
- **Architecture**:
    - **Framework**: Svelte 5 (using Composition API/Runes or standard `script lang="ts"`).
    - **Rendering**: PixiJS v8 (`Application`, `Graphics`).
    - **Engine**: Helios Core (`Helios`, `bindToDocumentTimeline`).
    - **Pattern**: The `App.svelte` component manages the lifecycle. `onMount` initializes the async Pixi Application and appends its canvas. `helios.subscribe` updates the scene (e.g., rotating a rectangle) based on `currentTime`. `onDestroy` cleans up the Pixi instance.
- **Pseudo-Code**:
    - **App.svelte**:
        - Import `onMount`, `onDestroy` from Svelte.
        - Import `Application`, `Graphics` from PixiJS.
        - Import `Helios` from Core.
        - Instantiate `helios` with `duration: 5`, `fps: 30`.
        - Create a `container` ref.
        - `onMount`:
            - Create `app = new Application()`.
            - `await app.init({ resizeTo: window, ... })`.
            - Append `app.canvas` to `container`.
            - Create a `rect` Graphics object and add to stage.
            - `helios.subscribe(state => { rect.rotation = state.currentTime * ... })`.
        - `onDestroy`:
            - `app.destroy({ removeView: true })`.
- **Public API Changes**: None.
- **Dependencies**: Requires `svelte` (v5+), `pixi.js` (v8+), `@helios-project/core` (root workspace).

#### 4. Test Plan
- **Verification**:
    - Run `npm run build:examples` from the project root.
    - Verify that `output/example-build/examples/svelte-pixi-animation/composition.html` is generated.
    - (Manual) Run `npx vite serve examples/svelte-pixi-animation` and observe a rotating rectangle that seeks correctly.
- **Success Criteria**: The build completes without errors, and the example is included in the output directory.
- **Edge Cases**: Ensure `app.destroy()` is called to prevent WebGL context leaks if the component is unmounted.
