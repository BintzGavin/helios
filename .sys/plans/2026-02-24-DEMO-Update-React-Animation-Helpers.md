# Spec: Update React Animation Helpers Example

## 1. Context & Goal
- **Objective**: Update `examples/react-animation-helpers` to verify and demonstrate `interpolate` and `spring` functions from `@helios-project/core`.
- **Trigger**: The current example only demonstrates `<Sequence>` and `<Series>`, but the README promises `interpolate` and `spring` helpers for code-driven animation. This update brings the React example to feature parity with the vanilla JS `animation-helpers` example.
- **Impact**:
  - Provides React developers with a complete reference for using Helios animation helpers.
  - Verifies that `interpolate` and `spring` work correctly within a React component context.

## 2. File Inventory
- **Modify**:
  - `examples/react-animation-helpers/src/App.jsx`: Update to import and use `interpolate` and `spring`.

## 3. Implementation Spec
- **Architecture**:
  - Keep existing `Sequence` and `Series` components.
  - Add new visual elements driven by `interpolate` and `spring`.
- **Pseudo-Code (App.jsx modifications)**:
  ```javascript
  import { Helios, interpolate, spring } from '../../../packages/core/src/index.ts';
  // ... imports

  // New component using helpers
  const HelperDemo = ({ frame }) => {
    // Interpolate x position: 0 -> 200 over frames 0-60
    const x = interpolate(frame, [0, 60], [0, 200], { extrapolateRight: 'clamp' });

    // Spring scale: 0 -> 1
    const scale = spring({ frame, fps: 30, from: 0, to: 1, config: { stiffness: 100 } });

    return (
       <div style={{
         transform: `translateX(${x}px) scale(${scale})`,
         width: 50,
         height: 50,
         background: 'hotpink'
       }}>
         Spring
       </div>
    );
  };

  // ... Update App component to include HelperDemo
  ```
- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
  - Run `npm run build:examples` to ensure the updated example compiles.
  - Run `npx tsx tests/e2e/verify-render.ts` to confirm the example renders successfully without runtime errors.
- **Success Criteria**:
  - `React Helpers` case in `verify-render.ts` passes.
  - Generated video shows the interpolated and spring-animated elements along with the existing sequence demo.
