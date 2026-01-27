# 2025-02-23-DEMO-ReactTransitions

#### 1. Context & Goal
- **Objective**: Create `examples/react-transitions` to demonstrate manual video transitions (Crossfade, Slide) using React and CSS animations.
- **Trigger**: The README lists "Transitions library" as a "Not yet" feature; users need a pattern for implementing this with current capabilities.
- **Impact**: Unlocks multi-scene video composition capabilities for React users.

#### 2. File Inventory
- **Create**:
  - `examples/react-transitions/package.json`: Dependencies (`react`, `react-dom`).
  - `examples/react-transitions/vite.config.js`: Vite config with React plugin.
  - `examples/react-transitions/composition.html`: HTML Entry point.
  - `examples/react-transitions/src/main.jsx`: Mounts the App.
  - `examples/react-transitions/src/App.jsx`: Main composition with overlapping `Sequence` components.
  - `examples/react-transitions/src/components/Sequence.jsx`: Reusable component for time-window rendering and context.
  - `examples/react-transitions/src/styles.css`: CSS for `fadeIn`, `slideIn`, etc.
- **Modify**:
  - `vite.build-example.config.js`: Add `react_transitions: resolve(__dirname, "examples/react-transitions/composition.html")`.
  - `tests/e2e/verify-render.ts`: Add `{ name: 'React Transitions', relativePath: 'examples/react-transitions/composition.html', mode: 'dom' }`.
- **Read-Only**:
  - `packages/core/dist/index.js` (for import).

#### 3. Implementation Spec
- **Architecture**:
  - Use `Helios` with `autoSyncAnimations: true`.
  - `Sequence` component:
    - Uses `useVideoFrame()` (custom hook around `helios.subscribe`) to get current frame.
    - Renders children if `frame >= from && frame < from + duration`.
    - Provides `FrameContext` with `from` value.
  - `App` component:
    - Defines `Helios` instance.
    - Renders `Sequence`s with overlapping frames (e.g., Seq 1: 0-100, Seq 2: 70-170).
  - **Transition Pattern**:
    - Child elements use CSS `animation-delay` calculated as: `calc(var(--start-time) * 1s)`.
    - Or passed as inline style: `animationDelay: ${from / fps}s`.
    - This ensures animations start exactly when the sequence starts on the global timeline.
- **Pseudo-Code**:
  ```jsx
  // Sequence.jsx
  const frame = useVideoFrame();
  if (frame >= from && frame < from + duration) {
    return <FrameContext.Provider value={{ from }}>{children}</FrameContext.Provider>;
  }

  // App.jsx
  <Sequence from={0} duration={100}><SceneA /></Sequence>
  <Sequence from={70} duration={100}><SceneB /></Sequence> // Overlap 30 frames

  // SceneB.jsx
  const { from } = useContext(FrameContext);
  const startTime = from / 30; // 30fps
  <div style={{ animation: `fadeIn 1s ${startTime}s` }}>...</div>
  ```
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  - Run `npm run build:examples`.
  - Run `npx ts-node tests/e2e/verify-render.ts`.
- **Success Criteria**:
  - Build succeeds.
  - Verification script passes for "React Transitions".
  - Output video shows Scene A fading out while Scene B fades in.
- **Edge Cases**:
  - Check if animations glitch when seeking backwards (Helios handles this via WAAPI).
