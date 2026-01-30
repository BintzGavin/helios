# Plan: Scaffold Code Walkthrough Example

## 1. Context & Goal
- **Objective**: Create `examples/code-walkthrough` to demonstrate "Realistic" usage of Helios for developer content (syntax highlighting, line focusing, scrolling).
- **Trigger**: The "Vision" calls for realistic examples and "Use What You Know". A common use case for programmatic video is creating code tutorials. Current examples cover text effects but not structured code animation.
- **Impact**: Provides a reference implementation for a major use case (Developer Education), reducing friction for users wanting to build code videos.

## 2. File Inventory
- **Create**:
  - `examples/code-walkthrough/package.json` (Minimal config)
  - `examples/code-walkthrough/vite.config.js` (Vite config with React support)
  - `examples/code-walkthrough/composition.html` (Entry point)
  - `examples/code-walkthrough/src/main.jsx` (Bootstrap)
  - `examples/code-walkthrough/src/App.jsx` (Main composition logic)
  - `examples/code-walkthrough/src/CodeBlock.jsx` (Component using PrismJS)
  - `examples/code-walkthrough/src/styles.css` (Styles for layout and highlighting)
  - `examples/code-walkthrough/src/code-sample.js` (Sample code to display)
- **Modify**:
  - `package.json` (Add `prismjs` dependency)
  - `vite.build-example.config.js` (Add new example to build input)
  - `tests/e2e/verify-render.ts` (Add verification case)
- **Read-Only**:
  - `packages/core/src/index.ts`

## 3. Implementation Spec
- **Architecture**:
  - **Framework**: React.
  - **Highlighter**: `prismjs` (lightweight, robust).
  - **State**: `useVideoFrame` hook drives the `activeLines` prop of `<CodeBlock>`.
  - **Animation**: CSS transitions on opacity/color for line focusing.
- **Pseudo-Code (CodeBlock.jsx)**:
  ```javascript
  import Prism from 'prismjs';
  import 'prismjs/themes/prism-tomorrow.css';

  export const CodeBlock = ({ code, language, activeLines }) => {
     // Run Prism.highlight on the code
     const html = Prism.highlight(code, Prism.languages[language], language);
     // Split into lines and render
     // If line index is in activeLines, opacity = 1, else opacity = 0.3
     return <pre><code>...</code></pre>
  }
  ```
- **Public API Changes**: None.
- **Dependencies**:
  - Run `npm install prismjs --save-dev -w root` (or just add to root package.json).

## 4. Test Plan
- **Verification**:
  1. Install dependencies: `npm install`.
  2. Build examples: `npm run build:examples`.
  3. Run verification: `npx tsx tests/e2e/verify-render.ts`.
- **Success Criteria**:
  - `output/code-walkthrough-render-verified.mp4` is generated.
  - Video shows code snippet with syntax highlighting.
  - Lines animate (dim/highlight) based on timeline.
- **Edge Cases**:
  - Long lines (wrapping).
