# Plan: Scaffold Solid Transitions Example

## 1. Context & Goal
- **Objective**: Create a SolidJS example demonstrating how to synchronize standard CSS animations using `autoSyncAnimations` and `animation-delay` within a composable `<Sequence>` component.
- **Trigger**: Vision gap. The "Use What You Know" promise implies that standard CSS animations should work with all supported frameworks. React, Vue, and Svelte have "Transitions" examples demonstrating the `animation-delay` pattern for relative timing, but SolidJS does not.
- **Impact**: Provides a reference implementation for SolidJS users to create sequenced, CSS-driven animations without proprietary hooks or signals, completing the framework coverage for this core pattern.

## 2. File Inventory
- **Create**:
    - `examples/solid-transitions/vite.config.js`: Local Vite config for Solid.
    - `examples/solid-transitions/composition.html`: Entry point.
    - `examples/solid-transitions/src/index.jsx`: Mount point initializing Helios.
    - `examples/solid-transitions/src/App.jsx`: Main application component.
    - `examples/solid-transitions/src/components/Sequence.jsx`: Helper component to handle timing offsets.
    - `examples/solid-transitions/src/style.css`: CSS animations.
- **Modify**:
    - `vite.build-example.config.js`: Add the new example to the build configuration.
    - `tests/e2e/verify-render.ts`: Add a verification case for "Solid Transitions".
- **Read-Only**:
    - `package.json`: To check dependencies (solid-js, vite-plugin-solid).

## 3. Implementation Spec

### Architecture
- **Framework**: SolidJS (using `vite-plugin-solid`).
- **Engine**: Helios with `autoSyncAnimations: true`.
- **Pattern**:
    - `Sequence.jsx` accepts `from` (frame) and `duration` (frames).
    - It calculates `startTime = from / fps`.
    - It renders children inside a wrapper div with `style={{ "--sequence-start": "${startTime}s" }}`.
    - `App.jsx` composes multiple `Sequence` components.
    - `style.css` uses standard `@keyframes` with `animation-delay: var(--sequence-start)`.

### Files to Create

#### `examples/solid-transitions/vite.config.js`
```javascript
import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solidPlugin()],
  build: { target: 'esnext' }
});
```

#### `examples/solid-transitions/composition.html`
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Solid Transitions</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/index.jsx"></script>
  </body>
</html>
```

#### `examples/solid-transitions/src/index.jsx`
```javascript
import { render } from 'solid-js/web';
import { Helios } from '@helios-project/core';
import App from './App';
import './style.css';

// Initialize Helios
const helios = new Helios({
  duration: 4, // 120 frames
  fps: 30,
  autoSyncAnimations: true // Crucial for this example
});

helios.bindToDocumentTimeline();

// Expose to window for debugging/control
if (typeof window !== 'undefined') {
  window.helios = helios;
}

render(() => <App helios={helios} />, document.getElementById('root'));
```

#### `examples/solid-transitions/src/components/Sequence.jsx`
```javascript
import { createMemo, Show } from 'solid-js';

export function Sequence(props) {
  // props: { from: number, duration: number, children: JSX.Element, helios: Helios }

  const currentFrame = createMemo(() => {
    // We don't strictly need to track frame for rendering if using autoSyncAnimations
    // But we need to toggle visibility based on frame range.
    // However, Solid's reactivity doesn't automatically subscribe to Helios.
    // We need a signal.
    // BUT: The "Transitions" pattern usually relies on CSS for movement,
    // and JS only for "mounting" (if using v-if/Show).
    // If we rely on autoSyncAnimations, the element should ideally exist
    // but be hidden or animation-delayed.

    // Actually, simply calculating start time for CSS is enough IF the element is always present.
    // But usually Sequences hide content outside their range.
    // Let's implement a simple signal bridge here for the "Show" logic.
    return props.frame(); // Expecting a signal passed down, OR we create one.
  });

  // NOTE: For this example to be "idiomatic" like the others, we should pass a frame signal.
  // But wait, the standard "Transitions" examples (Vue/React) utilize a `useVideoFrame` or `subscribe`
  // to toggle visibility.
  // So App.jsx should create the signal.

  const isActive = createMemo(() => {
    const f = props.frame();
    return f >= props.from && f < (props.from + props.duration);
  });

  const startTime = createMemo(() => props.from / props.helios.fps);

  return (
    <Show when={isActive()}>
      <div
        class="sequence-container"
        style={{
          "--sequence-start": `${startTime()}s`,
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%'
        }}
      >
        {props.children}
      </div>
    </Show>
  );
}
```
*Correction*: `App.jsx` needs to provide the frame signal.

#### `examples/solid-transitions/src/App.jsx`
```javascript
import { createSignal, onMount, onCleanup } from 'solid-js';
import { Sequence } from './components/Sequence';

function App(props) {
  const [frame, setFrame] = createSignal(0);

  let unsubscribe;
  onMount(() => {
    unsubscribe = props.helios.subscribe((state) => {
      setFrame(state.currentFrame);
    });
  });

  onCleanup(() => {
    if (unsubscribe) unsubscribe();
  });

  return (
    <div class="container">
      <h1>Solid Transitions</h1>

      {/* Sequence 1: 0-60 frames */}
      <Sequence frame={frame} from={0} duration={60} helios={props.helios}>
        <div class="box fade-in" style={{ background: '#446b9e', top: '100px', left: '100px' }}>
          Solid
        </div>
      </Sequence>

      {/* Sequence 2: 60-120 frames */}
      <Sequence frame={frame} from={60} duration={60} helios={props.helios}>
        <div class="box slide-right" style={{ background: '#e94c4c', top: '250px', left: '100px' }}>
          Moves
        </div>
      </Sequence>
    </div>
  );
}

export default App;
```

#### `examples/solid-transitions/src/style.css`
```css
body {
  margin: 0;
  overflow: hidden;
  background: #111;
  font-family: sans-serif;
}

.container {
  position: relative;
  width: 100%;
  height: 100vh;
}

h1 {
  color: white;
  padding: 20px;
  margin: 0;
}

.box {
  width: 100px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1.5rem;
  color: white;
  border-radius: 12px;
  position: absolute;
}

@keyframes fadeInScale {
  0% { opacity: 0; transform: scale(0.5); }
  100% { opacity: 1; transform: scale(1); }
}

@keyframes slideRight {
  0% { transform: translateX(0); }
  100% { transform: translateX(200px); }
}

.fade-in {
  animation: fadeInScale 1s forwards;
  /* Key: delay the animation start so it aligns with the sequence */
  animation-delay: var(--sequence-start);
}

.slide-right {
  animation: slideRight 2s forwards;
  animation-delay: var(--sequence-start);
}
```

### Files to Modify

#### `vite.build-example.config.js`
Update the `solidPlugin` include regex and `react` exclude regex, and add the input entry.

1. **Update Plugins Regex**:
   - Locate `react({ exclude: ... })` and `solidPlugin({ include: ... })`.
   - Update the regex to: `/examples\/solid-(canvas|dom|transitions)-animation|examples\/solid-animation-helpers/`

2. **Add Input Entry**:
   - Locate `rollupOptions.input`.
   - Add: `solid_transitions: resolve(__dirname, "examples/solid-transitions/composition.html"),`

#### `tests/e2e/verify-render.ts`
Add the test case to the `CASES` array.

```typescript
{ name: 'Solid Transitions', relativePath: 'examples/solid-transitions/composition.html', mode: 'dom' as const },
```

## 4. Test Plan
- **Verification**:
    1. Run `npm run build:examples`.
    2. Run `npx tsx tests/e2e/verify-render.ts`.
- **Success Criteria**:
    - Build succeeds.
    - `Solid Transitions` verification passes (green checkmark).
    - Output video `output/solid-transitions-render-verified.mp4` contains a blue box appearing (0-2s) and then a red box sliding (2-4s).
- **Edge Cases**:
    - Verify strict mode doesn't break `createMemo` or `createSignal` usage.
