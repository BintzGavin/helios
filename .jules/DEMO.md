# Planner's Journal - DEMO

## 2025-02-18 - Missing Framework Dependencies
**Learning:** The root `package.json` is missing `react`, `react-dom`, and `@vitejs/plugin-react` despite the README promising a React example.
**Action:** Must plan to install these dependencies and configure Vite to support React before scaffolding the example.

## 2025-02-18 - Build Config Exclusion
**Learning:** Scaffolding the React example via `vite.config.js` allows `dev:react` to work, but the root `build:examples` script uses `vite.build-example.config.js` which requires manual entry updates to include the new example.
**Action:** Future plans must include updating `vite.build-example.config.js` when adding new examples to ensure they are part of the CI/build process.
