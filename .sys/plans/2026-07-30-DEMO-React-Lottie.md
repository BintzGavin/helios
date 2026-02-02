# Spec: Scaffold React Lottie Animation Example

## 1. Context & Goal
- **Objective**: Create `examples/react-lottie-animation` to demonstrate Lottie integration with React and Helios.
- **Trigger**: Vision gap—React + Lottie is a primary use case (Remotion parity) but currently only a vanilla example exists.
- **Impact**: Enables React developers to easily use Lottie animations, reinforcing the "Use What You Know" promise.

## 2. File Inventory
- **Create**:
    - `examples/react-lottie-animation/vite.config.js`: Build config (adapted from `examples/react-animation-helpers/vite.config.js`).
    - `examples/react-lottie-animation/composition.html`: Entry point.
    - `examples/react-lottie-animation/src/main.jsx`: React mount point.
    - `examples/react-lottie-animation/src/App.jsx`: Main composition.
    - `examples/react-lottie-animation/src/Lottie.jsx`: Reusable Lottie wrapper.
    - `examples/react-lottie-animation/src/hooks/useVideoFrame.js`: Standalone hook for frame subscription.
    - `examples/react-lottie-animation/src/animation.json`: Animation data.
- **Modify**:
    - `package.json`: Add `dev:react-lottie` script.
- **Read-Only**:
    - `examples/lottie-animation/src/animation.json`: Source of the animation data.

## 3. Implementation Spec
- **Architecture**:
    - Standard Vite + React setup using root `node_modules` (Single Version Policy).
    - `useVideoFrame` hook: Subscribes to `helios` instance and manages local state (simple `useState` + `useEffect` pattern).
    - `Lottie` component:
        - Accepts `animationData` prop.
        - Uses `useRef` for container.
        - Uses `useEffect` to initialize `lottie.loadAnimation`.
        - Uses `useEffect` dependent on `frame` (from `useVideoFrame`) to seek animation: `anim.goToAndStop((frame / fps) * 1000)`.
- **Logic Flow**:
    1. `main.jsx` initializes `Helios`, binds to document timeline, and mounts `App`.
    2. `App` renders `<Lottie animationData={animationData} />`.
    3. `Lottie` receives current frame via hook and updates internal Lottie instance imperatively.
- **Dependencies**:
    - `react`, `react-dom`, `lottie-web`, `@helios-project/core` (all present in root `package.json`).

## 4. Test Plan
- **Verification**:
    1. Run `npm run build:examples` to ensure compilation success.
    2. Run `npm run verify:e2e` to execute the full test suite.
        - The suite automatically discovers `examples/react-lottie-animation/composition.html`.
        - It will render the composition and check for non-black frames.
- **Success Criteria**:
    - `build:examples` exits with code 0.
    - `verify:e2e` logs successful verification for `react-lottie-animation`.
