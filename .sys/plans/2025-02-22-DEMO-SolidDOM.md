# Spec: Scaffold Solid DOM Animation Example

## 1. Context & Goal
- **Objective**: Create `examples/solid-dom-animation` to demonstrate SolidJS integration with Helios for DOM-based animations.
- **Trigger**: The "Any Framework" promise in the vision is missing a SolidJS DOM example (only Solid Canvas exists).
- **Impact**: Completes the framework matrix (React, Vue, Svelte, Solid) for both DOM and Canvas modes, proving Helios works with fine-grained reactivity.

## 2. File Inventory

### Create
- `examples/solid-dom-animation/composition.html`: The entry HTML file.
- `examples/solid-dom-animation/vite.config.js`: Local Vite config for `npm run dev:solid-dom`.
- `examples/solid-dom-animation/src/index.jsx`: The application entry point.
- `examples/solid-dom-animation/src/App.jsx`: The main component demonstrating Signal and CSS animation sync.
- `examples/solid-dom-animation/src/style.css`: CSS for the example.
- `examples/solid-dom-animation/src/lib/createHeliosSignal.js`: The adapter hook.

### Modify
- `vite.build-example.config.js`: Register the new example in the build pipeline.
- `package.json`: Add a development script.
- `tests/e2e/verify-render.ts`: Add the example to the verification suite.

## 3. Implementation Spec

### Architecture
- **Framework**: SolidJS (using `solid-js` package).
- **State Adapter**: `createHeliosSignal` (copies `helios.getState()` into a Solid Signal).
- **DOM Strategy**:
  - Use `style={{ ... }}` with derived signals (`createMemo`) to drive high-performance updates.
  - Use standard CSS `@keyframes` to demonstrate `autoSyncAnimations`.

### Detailed Instructions

#### 1. Create `examples/solid-dom-animation/src/lib/createHeliosSignal.js`
Copy the content from `examples/solid-canvas-animation/src/lib/createHeliosSignal.js` (or `createHeliosSignal.js` if it was moved to `src/`). It should look like this:
```javascript
import { createSignal, onCleanup, onMount } from 'solid-js';

export function createHeliosSignal(helios) {
  const [state, setState] = createSignal(helios.getState());

  onMount(() => {
    const unsub = helios.subscribe(setState);
    onCleanup(() => {
      unsub();
    });
  });

  return state;
}
```

#### 2. Create `examples/solid-dom-animation/src/App.jsx`
Create a component that uses the signal to drive a transform, and includes a CSS animation.

```jsx
import { createMemo } from 'solid-js';
import { createHeliosSignal } from './lib/createHeliosSignal';
import './style.css';

function App() {
  // Ensure helios exists (for dev)
  if (!window.helios) {
    // ... initialize dummy helios if needed, or rely on index.jsx
  }

  const state = createHeliosSignal(window.helios);

  // Derived state for rotation (0 to 360 deg)
  const rotation = createMemo(() => {
    const s = state();
    const progress = s.currentFrame / (s.duration * window.helios.fps);
    return progress * 360;
  });

  return (
    <div class="container">
      <h1>SolidJS DOM Animation</h1>

      {/* Signal Driven */}
      <div
        class="box signal-box"
        style={{ transform: `rotate(${rotation()}deg)` }}
      >
        Signal
      </div>

      {/* CSS Driven (autoSyncAnimations) */}
      <div class="box css-box">
        CSS
      </div>
    </div>
  );
}

export default App;
```

#### 3. Create `examples/solid-dom-animation/src/style.css`
Add a simple CSS animation for `.css-box`.
```css
.container {
  display: flex;
  gap: 50px;
  justify-content: center;
  align-items: center;
  height: 100vh;
  font-family: sans-serif;
}
.box {
  width: 100px;
  height: 100px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: white;
  font-weight: bold;
}
.signal-box { background: #446b9e; }
.css-box {
  background: #e94c4c;
  animation: bounce 2s infinite ease-in-out;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-50px); }
}
```

#### 4. Create `examples/solid-dom-animation/src/index.jsx`
Mount the app and initialize Helios.
```jsx
import { render } from 'solid-js/web';
import App from './App';
import { Helios } from '../../../packages/core/src/index.ts';

const helios = new Helios({
  duration: 5,
  fps: 30,
  autoSyncAnimations: true
});
window.helios = helios;
helios.bindToDocumentTimeline();

render(() => <App />, document.getElementById('app'));
```

#### 5. Create `examples/solid-dom-animation/composition.html`
Standard HTML entry point.
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Solid DOM Animation</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="./src/index.jsx"></script>
</body>
</html>
```

#### 6. Create `examples/solid-dom-animation/vite.config.js`
```javascript
import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solidPlugin()],
  build: { target: 'esnext' }
});
```

#### 7. Modify `vite.build-example.config.js`
Update the `solidPlugin` include regex and add the input.

```javascript
<<<<<<< SEARCH
    solidPlugin({
      include: /examples\/solid-canvas-animation/,
    })
  ],
=======
    solidPlugin({
      include: /examples\/solid-(canvas|dom)-animation/,
    })
  ],
>>>>>>> REPLACE
```

```javascript
<<<<<<< SEARCH
        solid_canvas: resolve(__dirname, "examples/solid-canvas-animation/composition.html"),
        podcast_visualizer: resolve(__dirname, "examples/podcast-visualizer/composition.html"),
      },
=======
        solid_canvas: resolve(__dirname, "examples/solid-canvas-animation/composition.html"),
        solid_dom: resolve(__dirname, "examples/solid-dom-animation/composition.html"),
        podcast_visualizer: resolve(__dirname, "examples/podcast-visualizer/composition.html"),
      },
>>>>>>> REPLACE
```

#### 8. Modify `package.json`
Add the dev script.
```json
<<<<<<< SEARCH
    "dev:solid-canvas": "vite serve examples/solid-canvas-animation",
=======
    "dev:solid-canvas": "vite serve examples/solid-canvas-animation",
    "dev:solid-dom": "vite serve examples/solid-dom-animation",
>>>>>>> REPLACE
```
(Note: If `dev:solid-canvas` doesn't exist, just add it alphabetically or near other dev scripts).

#### 9. Modify `tests/e2e/verify-render.ts`
Add the test case.
```typescript
<<<<<<< SEARCH
  { name: 'Solid Canvas', relativePath: 'examples/solid-canvas-animation/composition.html', mode: 'canvas' as const },
  { name: 'Podcast Visualizer', relativePath: 'examples/podcast-visualizer/composition.html', mode: 'dom' as const },
];
=======
  { name: 'Solid Canvas', relativePath: 'examples/solid-canvas-animation/composition.html', mode: 'canvas' as const },
  { name: 'Solid DOM', relativePath: 'examples/solid-dom-animation/composition.html', mode: 'dom' as const },
  { name: 'Podcast Visualizer', relativePath: 'examples/podcast-visualizer/composition.html', mode: 'dom' as const },
];
>>>>>>> REPLACE
```

## 4. Test Plan
- **Verification**:
  1. Run `npm run build:examples`.
  2. Run `npx ts-node tests/e2e/verify-render.ts`.
- **Success Criteria**:
  - Build succeeds.
  - Verification script outputs `✅ Solid DOM Passed!`.
