# 2026-10-07-DEMO-Standardize-Lottie-Animation.md

#### 1. Context & Goal
- **Objective**: Standardize the `examples/lottie-animation` directory by adding modern build tooling and configuration.
- **Trigger**: The current example lacks `package.json` and `vite.config.ts`, making it inconsistent with the "Standardized" examples and difficult to build/test in isolation.
- **Impact**: Enables `npm run build` and `npm run dev` for this specific example, ensuring it serves as a correct reference for Vanilla TypeScript + Lottie integration.

#### 2. File Inventory
- **Create**:
  - `examples/lottie-animation/package.json`: Define dependencies (`lottie-web`, `@helios-project/core`) and scripts.
  - `examples/lottie-animation/vite.config.ts`: Configure Vite with alias to core.
  - `examples/lottie-animation/tsconfig.json`: TypeScript configuration.
  - `examples/lottie-animation/postcss.config.cjs`: Standard empty PostCSS config.
- **Modify**:
  - `examples/lottie-animation/composition.html`: Ensure the entry point script tag is correct.
- **Read-Only**:
  - `examples/lottie-animation/src/main.ts`: Source code to be preserved/verified.

#### 3. Implementation Spec
- **Architecture**:
  - The example will be a self-contained Vite project.
  - It will use `workspace:*` for `@helios-project/core` dependency to link to the monorepo package.
  - `vite.config.ts` will explicitly alias `@helios-project/core` to `../../packages/core/src/index.ts` for development.
- **Pseudo-Code**:
  - **package.json**:
    ```json
    {
      "name": "@helios-examples/lottie-animation",
      "dependencies": {
        "lottie-web": "^5.12.0",
        "@helios-project/core": "workspace:*"
      },
      "scripts": { "dev": "vite", "build": "tsc && vite build" }
    }
    ```
  - **vite.config.ts**: Standard alias configuration.
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  - Run `npm install` in the root (to link workspaces).
  - Run `cd examples/lottie-animation && npm run build` to verify the build process.
- **Success Criteria**:
  - The build command exits with code 0.
  - A `dist/` directory is generated containing `index.html` and bundled assets.
- **Edge Cases**:
  - Ensure `lottie-web` imports work correctly with TypeScript (may require `allowSyntheticDefaultImports` or similar in tsconfig).
