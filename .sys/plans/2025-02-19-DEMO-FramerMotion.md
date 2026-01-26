# 📋 Plan: Scaffold Framer Motion Example

## 1. Context & Goal
- **Objective**: Create a new example `examples/framer-motion-animation` demonstrating integration with `framer-motion` in a React environment.
- **Trigger**: The README claims "Framer Motion... work out of the box", but no example exists to verify this.
- **Impact**: Validates Helios's compatibility with a major React animation library and provides a reference implementation for users.

## 2. File Inventory
- **Modify**: `package.json` (Add `framer-motion` dependency to devDependencies)
- **Modify**: `vite.build-example.config.js` (Add `framer_motion` entry to `rollupOptions.input`)
- **Modify**: `tests/e2e/verify-render.ts` (Add test case for `framer_motion`)
- **Create**: `examples/framer-motion-animation/package.json` (Project config)
- **Create**: `examples/framer-motion-animation/vite.config.js` (Vite config)
- **Create**: `examples/framer-motion-animation/composition.html` (Entry HTML)
- **Create**: `examples/framer-motion-animation/src/main.jsx` (Helios initialization)
- **Create**: `examples/framer-motion-animation/src/App.jsx` (React App with Framer Motion)
- **Create**: `examples/framer-motion-animation/src/hooks/useVideoFrame.js` (Adapter hook)

## 3. Implementation Spec
- **Architecture**:
  - **Framework**: React 18+ (bundled via Vite)
  - **Library**: `framer-motion`
  - **Pattern**: Manual Driver
    - Since Framer Motion springs are JS-driven, we cannot rely on `autoSyncAnimations: true` (which targets CSS/WAAPI).
    - We will use `useMotionValue` to bridge Helios time to Framer Motion's reactive state.
- **Public API Changes**: None (Example only).
- **Dependencies**: None.

### Pseudo-Code: `src/App.jsx`
```jsx
import { useEffect } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { useVideoFrame } from './hooks/useVideoFrame';

export default function App() {
  const { currentFrame, duration, fps } = useVideoFrame();

  // 1. Create a MotionValue to represent "time" or "progress"
  const progress = useMotionValue(0);

  // 2. Sync MotionValue to Helios frame on every update
  useEffect(() => {
    const p = currentFrame / (duration * fps);
    progress.set(p);
  }, [currentFrame, duration, fps]);

  // 3. Drive animations using useTransform
  // Example: Rotate 360 degrees over the full duration
  const rotate = useTransform(progress, [0, 1], [0, 360]);

  // Example: Scale up and down
  const scale = useTransform(progress, [0, 0.5, 1], [1, 1.5, 1]);

  return (
    <div style={{ ...styles.container }}>
      <motion.div
        style={{
          width: 100,
          height: 100,
          background: '#09f',
          rotate,
          scale
        }}
      />
    </div>
  );
}
```

### Pseudo-Code: `src/hooks/useVideoFrame.js`
(Standard implementation using `useState` and `helios.subscribe`)

## 4. Test Plan
- **Verification**:
  1. `npm install` (Install new dependency).
  2. `npm run build:examples` (Verify build success).
  3. `npx ts-node tests/e2e/verify-render.ts` (Verify render output).
- **Success Criteria**:
  - `output/example-build/examples/framer-motion-animation/composition.html` exists.
  - E2E test passes and produces a valid video file.
