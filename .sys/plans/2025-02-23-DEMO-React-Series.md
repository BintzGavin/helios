# Plan: Update React Animation Helpers with Series Component

#### 1. Context & Goal
- **Objective**: Implement the `<Series>` component in `examples/react-animation-helpers` and update the example to demonstrate it.
- **Trigger**: The README envisions `<Series>` as a key Animation Helper ("Planned"), but it is currently missing from the React example, leaving a gap between vision and reality.
- **Impact**: Provides a reference implementation for sequential animation composition in React, fulfilling the "Use What You Know" promise.

#### 2. File Inventory
- **Create**:
  - `examples/react-animation-helpers/src/components/Series.jsx`: New component that orchestrates child sequences.
- **Modify**:
  - `examples/react-animation-helpers/src/App.jsx`: Update to import and use `<Series>` to layout the sequences automatically.
  - `package.json`: Add `"dev:react-helpers": "vite serve examples/react-animation-helpers"` to scripts for easier development.
- **Read-Only**:
  - `examples/react-animation-helpers/src/components/Sequence.jsx`: To ensure compatibility with Series.

#### 3. Implementation Spec
- **Architecture**:
  - **Series Component**: Accepts `children` and optional `startFrame` (default 0).
  - **Logic**:
    - Iterates over `children` using `React.Children.map`.
    - Maintains a running `currentFrame` offset, starting from `props.startFrame`.
    - Clones each valid React element and injects a `from` prop equal to the current offset.
    - Reads `durationInFrames` from the child's props to increment the offset for the next child.
    - If a child lacks `durationInFrames`, it warns (or treats as 0 duration) but still renders it.
    - Wraps the result in a Fragment.
  - **Pseudo-Code**:
    ```javascript
    import React from 'react';

    export const Series = ({ children, startFrame = 0 }) => {
      let currentFrame = startFrame;
      return (
        <>
          {React.Children.map(children, (child) => {
            if (!React.isValidElement(child)) return child;
            const from = currentFrame;
            const duration = child.props.durationInFrames || 0;
            currentFrame += duration;
            return React.cloneElement(child, { from });
          })}
        </>
      );
    };
    ```
- **App.jsx Changes**:
  - Import `Series` from `./components/Series`.
  - Replace the manual `from={0}` and `from={60}` props on `<Sequence>` with a wrapping `<Series>` block.
  - Remove `from` props from `<Sequence>` children inside `<Series>`.

#### 4. Test Plan
- **Verification**:
  1. Run `npm run dev:react-helpers` and check http://localhost:5173 to ensure the animation plays sequentially (Seq 1 then Seq 2).
  2. Run `npm run build:examples` to ensure it compiles.
  3. Run `npx ts-node tests/e2e/verify-render.ts` to ensure the "React Helpers" test case still passes (visual verification that output video matches expectation).
- **Success Criteria**:
  - `npm run dev:react-helpers` works.
  - E2E verification passes with `✅ React Helpers Passed!`.
  - The rendered video shows the sequences playing one after another, identical to the previous manual timing.
