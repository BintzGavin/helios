# Plan: Scaffold Svelte Lottie Example

## 1. Context & Goal
- **Objective**: Create `examples/svelte-lottie-animation` to demonstrate Lottie integration with Svelte 5.
- **Trigger**: Vision gap - README claims "Any Animation Library" (including Lottie) support for all frameworks, but the Svelte example is missing.
- **Impact**: Unlocks Lottie usage for Svelte users, improves feature parity across frameworks, and verifies Svelte 5 compatibility with the `lottie-web` adapter pattern.

## 2. File Inventory
- **Create**:
    - `examples/svelte-lottie-animation/package.json`: Dependency manifest (svelte, lottie-web).
    - `examples/svelte-lottie-animation/composition.html`: Entry point for the example.
    - `examples/svelte-lottie-animation/vite.config.js`: Vite configuration using `@sveltejs/vite-plugin-svelte`.
    - `examples/svelte-lottie-animation/src/main.js`: Svelte 5 application entry point using `mount`.
    - `examples/svelte-lottie-animation/src/App.svelte`: Main component containing Helios and Lottie integration logic.
    - `examples/svelte-lottie-animation/src/animation.json`: Animation data file (content copied from `examples/lottie-animation/src/animation.json`).
- **Read-Only**:
    - `examples/lottie-animation/src/animation.json`: Source of the Lottie animation data.

## 3. Implementation Spec
- **Architecture**:
    - Uses **Svelte 5** (`mount` API) and **Vite**.
    - Integrates `lottie-web` imperatively within component lifecycle.
    - Uses `helios.subscribe()` to drive the Lottie animation frame-by-frame.
    - Handles proper cleanup (destroy animation, unsubscribe) on component unmount.
- **Pseudo-Code (App.svelte)**:
    - Import `onMount` from Svelte, `Helios` from core, and `lottie-web`.
    - Import animation data.
    - Initialize `Helios` instance.
    - Define a container reference variable.
    - In `onMount`:
        - Initialize Lottie animation instance targeting the container (autoplay: false).
        - Subscribe to Helios updates.
        - inside subscription: Calculate milliseconds from frame/fps and call `anim.goToAndStop`.
        - Return a cleanup function that:
            - Unsubscribes from Helios.
            - Destroys the Lottie animation instance.
    - Render a div bound to the container reference.

## 4. Test Plan
- **Verification**:
    - Run `npm run build:examples` to verify the new example compiles correctly with the root build configuration.
    - Run `npx vite build examples/svelte-lottie-animation` to verify isolated build.
- **Success Criteria**:
    - The build commands exit with code 0.
    - The output directory contains the compiled assets.
- **Edge Cases**:
    - Verify that `package.json` correctly resolves dependencies from the root workspace or installs them locally.
