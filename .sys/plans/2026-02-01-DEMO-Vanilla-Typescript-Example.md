# 1. Context & Goal
- **Objective**: Create a canonical "Vanilla TypeScript" example to fulfill the "Use What You Know" vision for non-framework users.
- **Trigger**: The current "Vanilla" examples (`simple-animation`) use inline JavaScript and relative imports, violating the "Professional" and "TypeScript" vision of the project.
- **Impact**: Provides a valid reference for users who want to use Helios without a framework, demonstrating proper build pipeline integration and TypeScript usage.

# 2. File Inventory
- **Create**:
  - `examples/vanilla-typescript/composition.html`: Entry point.
  - `examples/vanilla-typescript/src/main.ts`: TypeScript logic demonstrating `Helios` usage.
  - `examples/vanilla-typescript/src/vite-env.d.ts`: TypeScript environment types.
  - `examples/vanilla-typescript/tsconfig.json`: TypeScript configuration extending the root config.
- **Modify**: None (Dynamic discovery in build scripts handles new examples automatically).
- **Read-Only**: `vite.build-example.config.js`, `packages/core/src/index.ts`.

# 3. Implementation Spec
- **Architecture**:
  - Standard Vite + TypeScript setup.
  - Uses `@helios-project/core` alias (resolved by root Vite config).
  - Demonstrates `Helios` class instantiation, subscription-based animation, and `bindToDocumentTimeline`.
- **Pseudo-Code**:
  ```typescript
  // src/main.ts
  import { Helios } from '@helios-project/core';

  const helios = new Helios({ fps: 30, duration: 5 });
  // Create simple DOM element
  const box = document.createElement('div');
  document.body.appendChild(box);

  // Animate using subscribe
  helios.subscribe(state => {
     // box.style.transform = ...
  });

  helios.bindToDocumentTimeline();
  window.helios = helios; // Expose for debugging
  ```
- **tsconfig.json**:
  - Extends `../../tsconfig.json`.
  - Defines `paths` to map `@helios-project/core` to `../../packages/core/src/index.ts` for monorepo resolution.
  - Includes `src` directory.
- **Dependencies**: None.

# 4. Test Plan
- **Verification**:
  1. Run `npm run build:examples` to ensure the new example builds.
  2. Run `npx tsx tests/e2e/verify-render.ts "Vanilla TypeScript"` to verify it renders correctly in the server-side pipeline.
- **Success Criteria**:
  - Build succeeds.
  - Video file `output/vanilla-typescript-render-verified.mp4` is generated and contains the animation.
- **Edge Cases**:
  - Verify that the example builds even if `packages/core` types change (loose coupling via `skipLibCheck` in root tsconfig).
  - Verify that `bindToDocumentTimeline` works when running in a headless environment (covered by `verify-render.ts`).
