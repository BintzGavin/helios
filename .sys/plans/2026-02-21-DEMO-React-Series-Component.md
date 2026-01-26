# Plan: Implement React Series Component

#### 1. Context & Goal
- **Objective**: Implement the `<Series>` component in `examples/react-animation-helpers`.
- **Trigger**: The README promises a `<Series>` component for sequential composition, and the Journal (2025-02-19) identified it as a missing gap in the React examples.
- **Impact**: Enables sequential layout of sequences without manual `from` offset calculations, fulfilling the "Animation Helpers" vision for React.

#### 2. File Inventory
- **Create**:
  - `examples/react-animation-helpers/src/components/Series.jsx`: The new Series component.
- **Modify**:
  - `examples/react-animation-helpers/src/App.jsx`: Update to use `<Series>` instead of manual offsets.
- **Read-Only**:
  - `examples/react-animation-helpers/src/components/Sequence.jsx`: To ensure prop compatibility.

#### 3. Implementation Spec
- **Architecture**:
  - The `<Series>` component will be a functional component that inspects its children.
  - It will iterate over `children` using `React.Children.map`.
  - It will maintain a running accumulator `currentFrom` (starting at 0).
  - For each child, it will:
    - Clone the element using `React.cloneElement`.
    - Inject `from={currentFrom}` into the cloned element.
    - Read `durationInFrames` from the child's props to increment `currentFrom`.
  - This effectively stacks sequences back-to-back.
- **Pseudo-Code**:
  ```javascript
  import React from 'react';

  export const Series = ({ children }) => {
    let currentFrom = 0;
    return React.Children.map(children, child => {
      // Validate child is a valid React element
      if (!React.isValidElement(child)) return child;

      const duration = child.props.durationInFrames || 0;
      const newProps = { from: currentFrom };
      currentFrom += duration;
      return React.cloneElement(child, newProps);
    });
  };
  ```
- **Public API Changes**: Exports `Series` component.
- **Dependencies**: React (already installed).

#### 4. Test Plan
- **Verification**:
  - Run the example build and verification script.
  ```bash
  npm run build:examples && npx tsx tests/e2e/verify-render.ts
  ```
- **Success Criteria**:
  - Build succeeds.
  - `verify-render.ts` output contains `✅ React Helpers Passed!`.
  - Output video shows the sequenced elements appearing at the correct times (e.g., Title first, then Content).
- **Edge Cases**:
  - Nested Sequences (Sequence inside Series inside Sequence) should work if context propagates correctly (which it should via `FrameContext` in `Sequence.jsx`).
