# Plan: Add Animation Helpers to Vue Example

#### 1. Context & Goal
- **Objective**: Update the `examples/vue-animation-helpers` example to demonstrate the `interpolate` and `spring` core functions.
- **Trigger**: Vision Gap - The "Animation Helpers" (interpolate, spring) are documented as core features but only demonstrated in the React example, leaving Vue users without a reference implementation.
- **Impact**: Ensures parity between framework examples and verifies that core animation helpers work correctly within the Vue Composition API context.

#### 2. File Inventory
- **Create**:
  - `examples/vue-animation-helpers/src/components/HelperDemo.vue`: A new component demonstrating `interpolate` and `spring` usage.
- **Modify**:
  - `examples/vue-animation-helpers/src/App.vue`: Import and render the new `HelperDemo` component.
- **Read-Only**:
  - `examples/react-animation-helpers/src/App.jsx` (Reference implementation)

#### 3. Implementation Spec
- **Architecture**:
  - Use Vue's `computed` properties to wrap the reactive `frame` injection and pass values to `interpolate` and `spring`.
  - The `frame` is already provided by `App.vue` via `provide('videoFrame', frame)`.
- **Pseudo-Code**:
  ```vue
  <!-- HelperDemo.vue -->
  <script setup>
  import { computed, inject } from 'vue';
  import { interpolate, spring } from '../../../packages/core/src/index.ts';

  const frame = inject('videoFrame');

  // Interpolate: 0 -> 200 over frames 0-60
  const x = computed(() => interpolate(frame.value, [0, 60], [0, 200], { extrapolateRight: 'clamp' }));

  // Spring: 0 -> 1 starting at frame 0
  const scale = computed(() => spring({
    frame: frame.value,
    fps: 30,
    from: 0,
    to: 1,
    config: { stiffness: 100 }
  }));
  </script>

  <template>
    <div class="helper-box" :style="{ transform: `translateX(${x}px) scale(${scale})` }">
        Helpers
    </div>
  </template>

  <style scoped>
  .helper-box {
      /* Copy styles from React example for consistency */
      position: absolute;
      top: 250px;
      left: 50px;
      width: 100px;
      height: 100px;
      background: hotpink;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      border: 2px solid white;
  }
  </style>
  ```
  ```vue
  <!-- App.vue Modification -->
  <script setup>
  // ... existing imports
  import HelperDemo from './components/HelperDemo.vue';
  // ...
  </script>

  <template>
    <div class="container">
      <!-- ... existing content ... -->
      <Series>...</Series>

      <!-- Add HelperDemo at the end -->
      <HelperDemo />
    </div>
  </template>
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  - Run `npm run build:examples` to ensure type safety and compilation.
- **Success Criteria**:
  - The build completes without errors.
  - The Vue example source code clearly demonstrates `interpolate` and `spring` usage.
- **Edge Cases**:
  - Ensure `frame.value` is handled correctly (it is a Ref<number>).
