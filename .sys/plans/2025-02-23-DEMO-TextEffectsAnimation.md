# 2025-02-23-DEMO-TextEffectsAnimation

## 1. Context & Goal
- **Objective**: Create `examples/text-effects-animation` to demonstrate advanced text motion patterns (Typewriter, Staggered Reveal) using Helios and React.
- **Trigger**: Vision gap - "Use What You Know" implies support for common motion graphics needs. Text effects are high-demand but currently missing from examples.
- **Impact**: Unlocks a reusable pattern for titles and kinetic typography, closing a functional gap with competitors and enhancing the "Agent Experience" by providing copy-pasteable components.

## 2. File Inventory
- **Create**:
  - `examples/text-effects-animation/package.json`: Dependencies (`react`, `react-dom`).
  - `examples/text-effects-animation/vite.config.js`: Vite React config.
  - `examples/text-effects-animation/composition.html`: Entry point.
  - `examples/text-effects-animation/src/main.jsx`: React root mount.
  - `examples/text-effects-animation/src/App.jsx`: Main composition.
  - `examples/text-effects-animation/src/styles.css`: CSS for typography.
  - `examples/text-effects-animation/src/hooks/useVideoFrame.js`: Local hook implementation.
  - `examples/text-effects-animation/src/components/Typewriter.jsx`: Component for typewriter effect.
  - `examples/text-effects-animation/src/components/TextReveal.jsx`: Component for staggered character reveal.
- **Modify**:
  - `vite.build-example.config.js`: Register new example entry point.
  - `tests/e2e/verify-render.ts`: Add verification case.
- **Read-Only**:
  - `packages/core/src/index.ts`: For imports.

## 3. Implementation Spec
- **Architecture**:
  - Standalone React example bundled by Vite.
  - Uses `useVideoFrame` hook to drive animations based on global Helios time.
  - `Typewriter` uses `Math.floor(interpolate(...))` to slice text string.
  - `TextReveal` maps over string characters, applying `opacity`/`transform` based on `interpolate(frame, [start + i*stagger, ...])`.
- **Pseudo-Code**:
  ```javascript
  // useVideoFrame.js
  useEffect(() => helios.subscribe(state => setFrame(state.currentFrame)), [])

  // Typewriter.jsx
  const visibleCount = Math.floor(interpolate(frame, [start, end], [0, text.length]))
  return <span>{text.slice(0, visibleCount)}</span>

  // TextReveal.jsx
  text.split('').map((char, i) => {
    const delay = i * stagger
    const progress = interpolate(frame, [start + delay, start + delay + duration], [0, 1])
    return <span style={{ opacity: progress, transform: `translateY(${ (1-progress)*20 }px)` }}>{char}</span>
  })
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: `npm run build:examples && npx ts-node tests/e2e/verify-render.ts`
- **Success Criteria**:
  - `vite.build-example.config.js` successfully builds `text-effects-animation`.
  - `verify-render.ts` passes the "Text Effects" case.
  - Generated video shows distinct typewriter and stagger effects.
- **Edge Cases**:
  - Text wrapping (handled by CSS).
  - Fast seeking (Helios `subscribe` handles this).
