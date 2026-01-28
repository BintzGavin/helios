# Context & Goal
- **Objective**: Scaffold a React example using `styled-components` to demonstrate CSS-in-JS integration.
- **Trigger**: "Use What You Know" promise implies support for popular styling libraries, but only global CSS and Tailwind examples exist. Styled Components is a critical gap for React users.
- **Impact**: proves `autoSyncAnimations` works with runtime-injected styles and provides a reference for CSS-in-JS users.

# File Inventory
- **Modify**: `package.json` (Add `"styled-components": "^6.1.8"` dependency).
- **Modify**: `vite.build-example.config.js` (Add `react_styled_components` entry pointing to `examples/react-styled-components/composition.html`).
- **Modify**: `tests/e2e/verify-render.ts` (Add `{ name: 'React Styled Components', relativePath: 'examples/react-styled-components/composition.html', mode: 'dom' }` to `CASES`).
- **Create**: `examples/react-styled-components/composition.html` (Standard entry point).
- **Create**: `examples/react-styled-components/vite.config.js` (Standard Vite React config).
- **Create**: `examples/react-styled-components/src/main.jsx` (Standard React mount).
- **Create**: `examples/react-styled-components/src/App.jsx` (Composition logic with `styled` components).

# Implementation Spec
- **Architecture**: React 18 + Styled Components v6.
- **Pseudo-Code**:
  - **App.jsx**:
    - Import `styled` and `keyframes` from `styled-components`.
    - Import `Helios` from `@helios-project/core`.
    - Define a rotation animation using the `keyframes` helper.
    - Create a styled component (e.g., `Box`) using `styled.div` that:
        - Sets dimensions and background color.
        - Applies the keyframe animation (infinite loop).
    - In the `App` component:
        - Initialize `Helios` with `fps: 30`, `duration: 10`, and `autoSyncAnimations: true`.
        - Return the styled `Box` component.
- **Dependencies**: `react`, `react-dom`, `styled-components` (in root `package.json`).

# Test Plan
- **Verification**:
  - `npm install` (to install styled-components)
  - `npm run build:examples`
  - `npx tsx tests/e2e/verify-render.ts`
- **Success Criteria**:
  - `output/react-styled-components-render-verified.mp4` is created.
  - Video shows the rotating box.
