# Plan: React Animation Helpers Example

#### 1. Context & Goal
- **Objective**: Scaffold a new example project `examples/react-animation-helpers` that demonstrates "Planned" features: `<Sequence>` and `<Series>` components using React.
- **Trigger**: The `README.md` envisions "Animation Helpers" like `<Sequence>` as a key feature ("Use What You Know"), but currently no implementation or example exists for them in React.
- **Impact**: closes the gap between the vision of component-based sequencing and current reality; provides a reference implementation for React users to build complex timelines.

#### 2. File Inventory
- **Create**:
  - `examples/react-animation-helpers/vite.config.js`: Vite configuration enabling React support.
  - `examples/react-animation-helpers/composition.html`: Entry point HTML file.
  - `examples/react-animation-helpers/src/main.jsx`: React application mount point.
  - `examples/react-animation-helpers/src/App.jsx`: Main component demonstrating `<Sequence>` usage.
  - `examples/react-animation-helpers/src/hooks/useVideoFrame.js`: Custom hook implementing Context-aware frame subscription.
  - `examples/react-animation-helpers/src/components/FrameContext.js`: React Context definition for frame propagation.
  - `examples/react-animation-helpers/src/components/Sequence.jsx`: Component implementing time-shifting logic using `@helios-project/core`.
- **Modify**:
  - `vite.build-example.config.js`: Add `react_helpers` to the `rollupOptions.input` map.
  - `tests/e2e/verify-render.ts`: Add `React Helpers` case to the verification array.
- **Read-Only**:
  - `packages/core/src/sequencing.ts`: Reference for `sequence` function behavior.

#### 3. Implementation Spec
- **Architecture**:
  - **Context-Based Time**: Unlike the simple React example which binds directly to Helios, this example will use a `FrameContext` to pass the *current relative frame* down the component tree.
  - **Root Provider**: `App.jsx` subscribes to `Helios` and provides the global frame to the top-level `FrameContext.Provider`.
  - **Sequence Component**: Consumes `FrameContext`, calls `sequence()` from core to calculate `localFrame` and `isActive`. If active, renders children wrapped in a *new* `FrameContext.Provider` with the `localFrame`.
  - **useVideoFrame Hook**: Consumes `FrameContext` instead of subscribing to Helios directly. This ensures components inside a `<Sequence>` see time starting from 0 relative to the sequence.
- **Pseudo-Code**:
  ```javascript
  // src/components/Sequence.jsx
  import { sequence } from '@helios-project/core';
  import { FrameContext } from './FrameContext';

  export const Sequence = ({ from, durationInFrames, children }) => {
    const parentFrame = useContext(FrameContext);
    const { isActive, relativeFrame } = sequence({ frame: parentFrame, from, durationInFrames });

    if (!isActive) return null;

    return (
      <FrameContext.Provider value={relativeFrame}>
        {children}
      </FrameContext.Provider>
    );
  };
  ```
- **Dependencies**: None (Uses existing `react`, `react-dom`, `@helios-project/core`).

#### 4. Test Plan
- **Verification**: Run the example build and verification script.
  ```bash
  npm run build:examples && ts-node tests/e2e/verify-render.ts
  ```
- **Success Criteria**:
  - Build succeeds.
  - `verify-render.ts` output contains `✅ React Helpers Passed!`.
  - Output video shows the sequenced elements appearing at the correct times (e.g., Title first, then Content).
- **Edge Cases**:
  - Nested Sequences (Sequence inside Sequence) should calculate time relative to the immediate parent.
