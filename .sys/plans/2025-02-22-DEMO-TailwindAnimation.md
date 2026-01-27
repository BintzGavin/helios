# Plan: Scaffold Tailwind CSS Example

## 1. Context & Goal
- **Objective**: Create `examples/tailwind-animation` to demonstrate using Tailwind CSS with Helios, showcasing the integration of build tooling and `autoSyncAnimations: true`.
- **Trigger**: Vision gap. The "Use What You Know" promise implies support for modern CSS frameworks like Tailwind, but no example demonstrates the required PostCSS configuration.
- **Impact**: Provides a blueprint for users to use Tailwind, a very common request. Verifies that the build system can handle PostCSS pipelines.

## 2. File Inventory
- **Create**:
  - `examples/tailwind-animation/composition.html`: Entry point.
  - `examples/tailwind-animation/src/main.jsx`: React entry.
  - `examples/tailwind-animation/src/App.jsx`: Component with Tailwind classes.
  - `examples/tailwind-animation/src/index.css`: CSS with `@tailwind` directives.
  - `examples/tailwind-animation/vite.config.js`: Dev server config.
  - `postcss.config.js`: Root PostCSS config (New shared config).
  - `tailwind.config.js`: Root Tailwind config (New shared config).
- **Modify**:
  - `package.json`: Add `tailwindcss`, `postcss`, `autoprefixer` to `devDependencies`.
  - `vite.build-example.config.js`: Add `tailwind_animation` to entry points.
  - `tests/e2e/verify-render.ts`: Add verification test case.

## 3. Implementation Spec
- **Architecture**:
  - **Shared Config**: Add `postcss.config.js` and `tailwind.config.js` to the repository root. This enables PostCSS for the entire build pipeline, but `tailwind.config.js` will scope `content` strictly to `./examples/tailwind-animation/**/*` to prevent side effects on other examples.
  - **React + Tailwind**: The example will use React (as it's the most common pairing) and standard Tailwind utility classes.
  - **Animation**: Will use `animate-bounce`, `animate-pulse`, and a custom keyframe defined in `tailwind.config.js` (e.g., `animate-wiggle`) to demonstrate configuration extensibility.
  - **Helios Integration**: `new Helios({ autoSyncAnimations: true })` will be used to automatically sync the CSS animations.

- **Pseudo-Code (Tailwind Config)**:
  ```javascript
  // tailwind.config.js
  export default {
    content: [
      "./examples/tailwind-animation/composition.html",
      "./examples/tailwind-animation/**/*.{js,jsx,ts,tsx}"
    ],
    theme: {
      extend: {
        keyframes: {
          wiggle: { '0%, 100%': { transform: 'rotate(-3deg)' }, '50%': { transform: 'rotate(3deg)' } }
        },
        animation: {
          wiggle: 'wiggle 1s ease-in-out infinite',
        }
      }
    },
    plugins: [],
  }
  ```

- **Pseudo-Code (PostCSS Config)**:
  ```javascript
  // postcss.config.js
  export default {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  }
  ```

- **Pseudo-Code (App.jsx)**:
  ```jsx
  // App.jsx
  import { useState } from 'react';

  export default function App() {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white space-x-8">
        <div className="w-32 h-32 bg-blue-500 rounded-lg flex items-center justify-center animate-bounce">
          Bounce
        </div>
        <div className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
          Pulse
        </div>
        <div className="w-32 h-32 bg-purple-500 rounded-lg flex items-center justify-center animate-wiggle">
          Wiggle
        </div>
      </div>
    );
  }
  ```

## 4. Test Plan
- **Verification**:
  - `npm install` (to install new deps).
  - `npm run build:examples` (verifies PostCSS/Tailwind processing).
  - `npx ts-node tests/e2e/verify-render.ts` (verifies rendering correctness).
- **Success Criteria**:
  - The build completes without errors.
  - The rendered video shows the animated elements (bounce, pulse, wiggle).
  - Screenshots match expected output (no unstyled content).
- **Edge Cases**:
  - Ensure other examples still build correctly (PostCSS shouldn't break them).
