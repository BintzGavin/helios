#### 1. Context & Goal
- **Objective**: Implement the `<Series>` component for Vue to enable automatic sequential layout of animations.
- **Trigger**: The README promises `<Series>` support as a core "Animation Helper", but the current Vue example (`examples/vue-animation-helpers`) relies on manual frame offsets.
- **Impact**: This bridges the gap between the vision ("Use What You Know" + Helpers) and reality, providing Vue developers with the same compositional power as React users.

#### 2. File Inventory
- **Create**: `examples/vue-animation-helpers/src/components/Series.vue`
  - Purpose: New component that orchestrates child `<Sequence>` timing.
- **Modify**: `examples/vue-animation-helpers/src/App.vue`
  - Purpose: Update the example to demonstrate `<Series>` instead of manual chaining.
- **Read-Only**: `examples/vue-animation-helpers/src/components/Sequence.vue`
  - Purpose: Reference for prop definitions (`durationInFrames`, `from`).

#### 3. Implementation Spec
- **Architecture**:
  - Use a **Functional Component** (or `setup` with render function) to gain full control over VNode manipulation.
  - Utilize `cloneVNode` from Vue core to inject the `from` prop into children.
- **Pseudo-Code (`Series.vue`)**:
  ```javascript
  import { h, cloneVNode } from 'vue';

  // Helper to flatten Fragment children if necessary
  function getChildren(slot) {
    const children = slot ? slot() : [];
    // Handle generic flattening if Vue returns arrays of arrays or fragments
    return children.flat();
  }

  export default {
    setup(props, { slots }) {
      return () => {
        let currentFrom = 0;
        const children = getChildren(slots.default);

        return children.map(child => {
          // Robustly check for durationInFrames in props
          // Note: In VNodes, props might be in 'props' or flattened in some contexts
          const duration = child.props?.durationInFrames || 0;

          // Calculate new 'from' for this child
          const newFrom = currentFrom;

          // Advance accumulator
          currentFrom += duration;

          // Clone and inject 'from'
          return cloneVNode(child, { from: newFrom });
        });
      };
    }
  }
  ```
- **Public API Changes**: None (Internal example addition).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  ```bash
  npm run build:examples && ts-node tests/e2e/verify-render.ts
  ```
- **Success Criteria**:
  - The build completes without error.
  - The E2E test `Vue Helpers` passes.
  - The generated video (`output/vue-helpers-render-verified.mp4`) renders correctly (implied by test pass).
- **Edge Cases**:
  - Mixed children types (text nodes should be ignored or handled gracefully, but for this example, we assume valid `<Sequence>` children).
