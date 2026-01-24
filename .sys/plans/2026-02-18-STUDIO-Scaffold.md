# 📋 STUDIO: Scaffold Studio Package

## 1. Context & Goal
- **Objective**: Initialize the `@helios-project/studio` package to serve as the browser-based development environment.
- **Trigger**: The `packages/studio` directory is missing, but it is a core component of the V1 vision.
- **Impact**: Unlocks development of the Studio UI and CLI, providing the foundation for the "Helios Studio" experience.

## 2. File Inventory
- **Create**:
    - `packages/studio/package.json`
    - `packages/studio/tsconfig.json`
    - `packages/studio/vite.config.ts`
    - `packages/studio/index.html`
    - `packages/studio/src/main.tsx`
    - `packages/studio/src/App.tsx`
    - `packages/studio/src/vite-env.d.ts`

## 3. Implementation Spec
- **Architecture**:
    - **Framework**: React 19 (aligning with root devDependencies).
    - **Build Tool**: Vite.
    - **Integration**: Imports `@helios-project/player` for the preview pane.
- **Dependencies**:
    - `react`, `react-dom`, `@helios-project/player`.
    - `vite`, `@vitejs/plugin-react` (dev).

### `packages/studio/package.json`
- **Name**: `@helios-project/studio`
- **Version**: `0.0.1`
- **Private**: `true` (since it's an internal tool for now, or public if published? The CLI `helios` will likely consume it. Let's keep it private or standard).
- **Scripts**:
    - `dev`: `vite`
    - `build`: `tsc && vite build`
    - `preview`: `vite preview`
- **Dependencies**:
    - `react`: `^19.2.3`
    - `react-dom`: `^19.2.3`
    - `@helios-project/player`: `workspace:*`
- **DevDependencies**:
    - `@types/react`: `^19.0.8` (or similar)
    - `@types/react-dom`: `^19.0.3`
    - `@vitejs/plugin-react`: `^5.1.2`
    - `typescript`: `^5.0.0`
    - `vite`: `^7.1.2`

### `packages/studio/vite.config.ts`
- **Logic**:
    - Import `defineConfig` from `vite`.
    - Import `react` from `@vitejs/plugin-react`.
    - Configure `plugins: [react()]`.
    - Configure `resolve.alias` if necessary (likely not for now).

### `packages/studio/tsconfig.json`
- **Logic**:
    - Extend `../../tsconfig.json` (if possible) or standard React TS config.
    - Include `src`.

### `packages/studio/src/App.tsx`
- **Logic**:
    - Functional component returning a simple layout.
    - `<h1>Helios Studio</h1>`
    - `<p>Welcome to the Helios Studio.</p>`

### `packages/studio/src/main.tsx`
- **Logic**:
    - Import `React`, `ReactDOM`.
    - Import `App`.
    - `ReactDOM.createRoot(document.getElementById('root')!).render(<App />)`.

### `packages/studio/index.html`
- **Logic**:
    - Standard HTML5 boilerplate.
    - `<div id="root"></div>`
    - `<script type="module" src="/src/main.tsx"></script>`

## 4. Test Plan
- **Verification**:
    1. Run `npm install` to link the new workspace and install dependencies.
    2. Run `npm run dev -w packages/studio`.
    3. Check stdout for the local server URL (e.g., `http://localhost:5173`).
    4. Validate that the server returns the HTML content.
- **Success Criteria**:
    - `packages/studio` directory is populated.
    - `npm run dev` starts the Vite server successfully.
