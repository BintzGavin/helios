#### 1. Context & Goal
- **Objective**: Create a `react-animation-helpers` example to demonstrate advanced composition patterns (`Sequence`, `Series`) and bring React to parity with other frameworks.
- **Trigger**: Vision gap identified: React lacks a consolidated "Animation Helpers" example while Vue, Svelte, and Solid have them.
- **Impact**: Enables React developers to easily build complex timelines without manual math, fulfilling the "Use What You Know" promise.

#### 2. File Inventory
- **Create**:
  - `examples/react-animation-helpers/package.json`: Minimal dependencies.
  - `examples/react-animation-helpers/vite.config.js`: Local dev config.
  - `examples/react-animation-helpers/index.html`: Dev entry point.
  - `examples/react-animation-helpers/composition.html`: Build entry point.
  - `examples/react-animation-helpers/src/main.jsx`: Mounts the app.
  - `examples/react-animation-helpers/src/App.jsx`: Main composition.
  - `examples/react-animation-helpers/src/components/Sequence.jsx`: Context-aware Sequence component.
  - `examples/react-animation-helpers/src/components/Series.jsx`: Layout component for chaining Sequences.
  - `examples/react-animation-helpers/src/hooks/useVideoFrame.js`: Hook for frame subscription.
  - `examples/react-animation-helpers/src/context/FrameContext.js`: Context definition.

#### 3. Implementation Spec
- **Architecture**:
  - Use React Context (`FrameContext`) to pass `frame` down the tree.
  - `App` provides the root `FrameContext` from `Helios` state.
  - `Sequence` consumes `FrameContext`, calculates relative frame, and provides a new `FrameContext` for children.
  - `Series` iterates children and clones them with `from` prop calculated from previous sibling's duration.
  - Demonstrate `interpolate` and `spring` from `@helios-project/core`.
- **Pseudo-Code**:
  - `FrameContext`: `createContext({ frame: 0, from: 0 })`
  - `Sequence`: Consumes context. `localFrame = parentFrame - props.from`. Renders children if `0 <= localFrame < duration`. Provides `{ frame: localFrame, from: 0 }`.
  - `Series`: `Children.map`. Accumulate `currentFrom`. Clone child with `from={currentFrom}`. `currentFrom += child.props.durationInFrames`.
- **Public API Changes**: None (Example only).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run build:examples && npx tsx tests/e2e/verify-render.ts "react animation helpers"`
- **Success Criteria**: Build succeeds, and E2E verification passes (video duration matches, content is not black).
- **Edge Cases**: Nested Sequences, empty Series, invalid children in Series.
