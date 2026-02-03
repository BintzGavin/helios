# 2026-08-13-DEMO-React-Lottie.md

#### 1. Context & Goal
- **Objective**: Create a React example demonstrating `lottie-web` integration driven by Helios.
- **Trigger**: Vision gap - Lottie is a key format for high-fidelity vector animation, and while a Vanilla example exists, React users often struggle with the imperative/declarative mismatch.
- **Impact**: Provides a canonical pattern for using Lottie in React-based Helios videos, preventing common errors like desync or double-rendering.

#### 2. File Inventory
- **Create**:
  - `examples/react-lottie-animation/composition.html`: Entry point.
  - `examples/react-lottie-animation/vite.config.js`: Vite configuration.
  - `examples/react-lottie-animation/src/main.jsx`: Mount point.
  - `examples/react-lottie-animation/src/App.jsx`: Main component with Lottie integration logic.
  - `examples/react-lottie-animation/src/hooks/useVideoFrame.js`: Hook to bind Helios state to React state.
  - `examples/react-lottie-animation/src/animation.json`: Sample Lottie animation data.
- **Modify**: None. (Relies on root `package.json` dependencies).
- **Read-Only**:
  - `examples/lottie-animation/src/animation.json`: Source of the animation data.

#### 3. Implementation Spec
- **Architecture**:
  - **Framework**: React.
  - **Dependencies**: `lottie-web`, `@helios-project/core`.
  - **Logic**:
    - `useVideoFrame`: Subscribes to Helios updates.
    - `App.jsx`:
      - Initializes `lottie.loadAnimation` on mount with `autoplay: false`.
      - Updates animation frame imperatively in `useLayoutEffect` based on `frame / fps`.
- **Pseudo-Code**:
  ```javascript
  // src/hooks/useVideoFrame.js
  export function useVideoFrame(helios) {
    const [frame, setFrame] = useState(helios.getState().currentFrame);
    useEffect(() => helios.subscribe(state => setFrame(state.currentFrame)), [helios]);
    return frame;
  }

  // src/App.jsx
  import { useEffect, useLayoutEffect, useRef } from 'react';
  import lottie from 'lottie-web';
  import { Helios } from '@helios-project/core';
  import { useVideoFrame } from './hooks/useVideoFrame';
  import animationData from './animation.json';

  const helios = new Helios({ duration: 2, fps: 30 });
  // Ensure we bind to the timeline for automated drivers (Renderer/Playwright)
  helios.bindToDocumentTimeline();

  export default function App() {
    const containerRef = useRef(null);
    const animRef = useRef(null);
    const frame = useVideoFrame(helios);

    useEffect(() => {
      animRef.current = lottie.loadAnimation({
        container: containerRef.current,
        animationData,
        autoplay: false,
        loop: false,
        renderer: 'svg' // or canvas
      });
      return () => animRef.current?.destroy();
    }, []);

    useLayoutEffect(() => {
      if (animRef.current) {
        // Lottie uses milliseconds if second arg is false
        const timeMs = (frame / helios.fps) * 1000;
        animRef.current.goToAndStop(timeMs, false);
      }
    }, [frame]);

    return <div ref={containerRef} style={{ width: 400, height: 400 }} />;
  }
  ```
- **Dependencies**: All dependencies (`lottie-web`, `react`, etc.) are managed by the root `package.json`. No local `package.json` is needed.

#### 4. Test Plan
- **Verification**:
  1. `npm run build:examples`: Verify the build completes successfully.
  2. `npx vite examples/react-lottie-animation`: Manually verify the animation plays and scrubs.
- **Success Criteria**:
  - Build succeeds.
  - Animation frame corresponds 1:1 with Helios frame.
- **Edge Cases**:
  - Ensure `anim.destroy()` is called to prevent memory leaks during HMR.
