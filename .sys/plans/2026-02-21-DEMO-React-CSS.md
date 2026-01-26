# 📋 Spec: Scaffold React CSS Animation Example

#### 1. Context & Goal
- **Objective**: Create `examples/react-css-animation` to demonstrate using standard CSS animations (`@keyframes`) within a React component, driven by Helios's `autoSyncAnimations: true` feature.
- **Trigger**: The README promises "Use What You Know" and "Your existing CSS animations... work out of the box", but all current React examples utilize `useVideoFrame` for JS-driven animation.
- **Impact**: This validates that React developers can use standard CSS for animations without manual frame synchronization, and verifies that Helios correctly controls CSS animations even within a React-managed DOM.

#### 2. File Inventory
- **Create**:
  - `examples/react-css-animation/composition.html`
  - `examples/react-css-animation/vite.config.js`
  - `examples/react-css-animation/src/main.jsx`
  - `examples/react-css-animation/src/App.jsx`
  - `examples/react-css-animation/src/style.css`
- **Modify**:
  - `vite.build-example.config.js`: Add build entry.
  - `tests/e2e/verify-render.ts`: Add verification case.
- **Read-Only**:
  - `packages/core/dist/index.js`

#### 3. Implementation Spec

**A. Example Structure**
- **`composition.html`**: Standard entry point mounting React root.
- **`src/main.jsx`**: Initializes `Helios` with `{ autoSyncAnimations: true }`. This is the key differentiator from other React examples.
- **`src/App.jsx`**: Renders a component with a CSS class.
- **`src/style.css`**: Defines `@keyframes` animation.

**B. Pseudo-Code / Logic**
- **`src/main.jsx`**:
  ```javascript
  import React from 'react';
  import ReactDOM from 'react-dom/client';
  import App from './App';
  import './style.css';
  import { Helios } from '../../../packages/core/dist/index.js';

  // Initialize Helios with autoSyncAnimations: true
  // This tells Helios to hijack all CSS animations on the page
  const helios = new Helios({
    fps: 30,
    duration: 5,
    autoSyncAnimations: true
  });

  helios.bindToDocumentTimeline();
  window.helios = helios;

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  ```

- **`src/App.jsx`**:
  ```javascript
  import React from 'react';

  export default function App() {
    return (
      <div className="container">
        {/* Standard CSS Animation - no refs, no hooks needed */}
        <div className="box moving-box">
          CSS Power
        </div>
      </div>
    );
  }
  ```

- **`src/style.css`**:
  ```css
  body { margin: 0; background: #222; overflow: hidden; }
  .container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
  }
  .box {
    width: 150px;
    height: 150px;
    background: #61dafb;
    display: flex;
    justify-content: center;
    align-items: center;
    font-family: sans-serif;
    font-weight: bold;
    font-size: 1.5rem;
    color: #222;
    border-radius: 12px;
  }

  @keyframes slideAndRotate {
    0% { transform: translateX(-200px) rotate(0deg); opacity: 0; }
    50% { opacity: 1; }
    100% { transform: translateX(200px) rotate(360deg); opacity: 0.5; }
  }

  .moving-box {
    animation: slideAndRotate 5s linear forwards;
  }
  ```

**C. Build Configuration**
- **`vite.build-example.config.js`**:
  Add the new entry point to `rollupOptions.input`.
  ```javascript
  <<<<<<< SEARCH
        react_dom: resolve(__dirname, "examples/react-dom-animation/composition.html"),
  =======
        react_dom: resolve(__dirname, "examples/react-dom-animation/composition.html"),
        react_css: resolve(__dirname, "examples/react-css-animation/composition.html"),
  >>>>>>> REPLACE
  ```

**D. Verification Configuration**
- **`tests/e2e/verify-render.ts`**:
  Add the test case to the `CASES` array.
  ```typescript
  <<<<<<< SEARCH
    { name: 'React DOM', relativePath: 'examples/react-dom-animation/composition.html', mode: 'dom' as const },
  =======
    { name: 'React DOM', relativePath: 'examples/react-dom-animation/composition.html', mode: 'dom' as const },
    { name: 'React CSS', relativePath: 'examples/react-css-animation/composition.html', mode: 'dom' as const },
  >>>>>>> REPLACE
  ```

#### 4. Test Plan
- **Verification Command**:
  ```bash
  npm install && npm run build:examples && npx ts-node tests/e2e/verify-render.ts
  ```
- **Success Criteria**:
  1. Build completes successfully.
  2. `verify-render.ts` output contains `✅ React CSS Passed!`.
  3. `output/react-css-render-verified.mp4` is generated.
- **Edge Cases**:
  - Ensure React doesn't strip the animation if it re-renders (it shouldn't since the class name is static).
