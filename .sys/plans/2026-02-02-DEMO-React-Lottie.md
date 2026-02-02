# DEMO: React Lottie Animation Example

## 1. Context & Goal
- **Objective**: Create a new example `examples/react-lottie-animation` that demonstrates how to integrate Lottie animations within a React application using Helios.
- **Trigger**: The `README.md` and memory reference `react-lottie-animation` as a preferred example pattern, but it does not currently exist in the codebase. This fills a gap in the "Framework Agnostic" promise by showing how to wrap a vanilla library (`lottie-web`) in React.
- **Impact**: Provides a reference implementation for React developers using Lottie, ensuring they use the correct `useVideoFrame` subscription pattern instead of context-based updates.

## 2. File Inventory
- **Create**:
    - `examples/react-lottie-animation/composition.html`: Entry point for the example.
    - `examples/react-lottie-animation/src/main.jsx`: React application entry point.
    - `examples/react-lottie-animation/src/App.jsx`: Main component logic integrating `lottie-web` and `Helios`.
    - `examples/react-lottie-animation/src/hooks/useVideoFrame.js`: Helper hook for accessing Helios frame data.
    - `examples/react-lottie-animation/src/animation.json`: Lottie animation data (copied from `examples/lottie-animation`).
- **Modify**: None.
- **Read-Only**:
    - `examples/lottie-animation/src/animation.json`: Source of the Lottie data to copy.
    - `examples/react-dom-animation/src/hooks/useVideoFrame.js`: Reference for the hook implementation.

## 3. Implementation Spec
- **Architecture**:
    - Uses `vite` (via root config) for bundling.
    - Uses `react` and `lottie-web` (from root `node_modules`).
    - Implements the "Subscription Pattern" where `App.jsx` subscribes to `helios` updates and imperatively controls the Lottie instance using `anim.goToAndStop()`.
    - Avoids unnecessary React re-renders by driving the animation in the subscription callback, not via state updates.

- **Pseudo-Code**:
    - **useVideoFrame.js**: Standard hook that returns the current frame (triggering re-renders for consumers) but also exposes the `helios` instance for direct subscription.
    - **App.jsx**:
        - Initialize `Helios` instance.
        - Use `useRef` to reference the container DOM element.
        - Use `useEffect` to:
            - Initialize `lottie.loadAnimation` with `autoplay: false`.
            - Subscribe to `helios` updates.
            - Inside the subscription callback:
                - Calculate time in milliseconds: `(frame / fps) * 1000`.
                - Call `anim.goToAndStop(time, false)`.
            - Cleanup: destroy animation and unsubscribe.

- **Public API Changes**: None.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
    - Run `npm run build:examples` to ensure the example builds.
    - Run `npm run verify:e2e` to verify the example renders correctly (non-black output).
- **Success Criteria**:
    - The build command completes without errors.
    - The E2E test suite discovers `React Lottie Animation` and marks it as PASSED.
- **Edge Cases**:
    - Lottie file missing or invalid (should be handled by standard error boundary or console error).
    - Helios instance not ready (handled by `bindToDocumentTimeline`).
