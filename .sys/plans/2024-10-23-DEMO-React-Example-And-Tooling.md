## 1. Context & Goal
- **Objective**: Bootstrap the React example environment and generalize build tooling to support multiple examples.
- **Source**: Derived from README: "Create diverse examples (React, Vanilla, Canvas) to prove the core works." and Backlog: "Add realistic examples".

## 2. File Inventory
- **Create**:
    - `examples/react-canvas-animation/index.html`
    - `examples/react-canvas-animation/composition.html`
    - `examples/react-canvas-animation/src/main.tsx`
    - `examples/react-canvas-animation/src/App.tsx`
    - `examples/react-canvas-animation/vite.config.ts`
- **Modify**:
    - `package.json`
    - `vite.build-example.config.js`
    - `packages/renderer/scripts/render.ts`

## 3. Implementation Spec
- **Architecture**:
    - Use `@vitejs/plugin-react` for React support.
    - Use Vite's Multi-Page App (MPA) feature to build all examples into `output/example-build`.
    - `render.ts` will pick the correct composition file based on CLI args.
- **Pseudo-Code**:
    - `vite.build-example.config.js`: `glob.sync('examples/*/composition.html')` -> input object.
    - `render.ts`: `args.example` ? `examples/${args.example}/composition.html` : default.

## 4. Test Plan
- **Verification**:
    - `npm run dev:react` -> Open browser, verify animation.
    - `npm run render:example -- --example=react-canvas-animation` -> Check `output/react-canvas-animation.mp4`.
- **Success Criteria**:
    - React example renders a video.
    - Original `simple-canvas-animation` still renders.

## 5. PR
- **PR Creation**: Agent DEMO: Add React Example & Tooling
