# 📋 Spec: Scaffold Motion One Example

#### 1. Context & Goal
- **Objective**: Create `examples/motion-one-animation` to demonstrate integration with the `motion` library (formerly Motion One). This example will verify that Helios's `autoSyncAnimations: true` feature correctly drives Motion One's WAAPI-based animations without requiring manual synchronization or glue code.
- **Trigger**: The README promises support for "Motion/Framer Motion", but only a Framer Motion example currently exists.
- **Impact**: This validates the "Native Always Wins" thesis by proving that third-party libraries built on web standards (WAAPI) work out-of-the-box with Helios.

#### 2. File Inventory
- **Create**:
  - `examples/motion-one-animation/composition.html`
- **Modify**:
  - `package.json`: Add `motion` dependency.
  - `vite.build-example.config.js`: Add build entry for the new example.
  - `tests/e2e/verify-render.ts`: Add E2E verification case.
- **Read-Only**:
  - `packages/core/dist/index.js` (referenced via import)

#### 3. Implementation Spec

**A. Dependency Updates**
- **`package.json`**:
  Add `motion` to `devDependencies`.
  ```json
  "devDependencies": {
    "motion": "^12.0.0",
    ...
  }
  ```

**B. Example Implementation**
- **`examples/motion-one-animation/composition.html`**:
  Create a vanilla JS composition that imports `Helios` and `animate` from `motion`.
  ```html
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Motion One Animation</title>
      <style>
        body {
          margin: 0;
          overflow: hidden;
          background: #111;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
        }
        .box {
          width: 100px;
          height: 100px;
          background-color: #ff0055;
          border-radius: 15px;
        }
      </style>
    </head>
    <body>
      <div class="box"></div>

      <script type="module">
        import { Helios } from "../../packages/core/dist/index.js";
        import { animate } from "motion";

        // 1. Initialize Helios with autoSyncAnimations: true
        // This tells Helios to find all WAAPI animations on the page and control their currentTime.
        const helios = new Helios({
          fps: 30,
          durationInSeconds: 4,
          autoSyncAnimations: true
        });

        // 2. Create a Motion One animation
        // Motion One uses WAAPI under the hood, so Helios should find this automatically.
        // We do NOT need to keep a reference or manually subscribe.
        animate(".box",
          {
            x: [0, 200, 0, -200, 0],
            rotate: [0, 90, 180, 270, 360],
            backgroundColor: ["#ff0055", "#00eeff", "#ff0055"]
          },
          {
            duration: 4,
            easing: "ease-in-out"
          }
        );

        // 3. Bind to document timeline for preview
        helios.bindToDocumentTimeline();

        // Expose for debugging
        window.helios = helios;
      </script>
    </body>
  </html>
  ```

**C. Build Configuration**
- **`vite.build-example.config.js`**:
  Add the new entry point to `rollupOptions.input`.
  ```javascript
  <<<<<<< SEARCH
        framer_motion: resolve(__dirname, "examples/framer-motion-animation/composition.html"),
        lottie_animation: resolve(__dirname, "examples/lottie-animation/composition.html"),
      },
  =======
        framer_motion: resolve(__dirname, "examples/framer-motion-animation/composition.html"),
        lottie_animation: resolve(__dirname, "examples/lottie-animation/composition.html"),
        motion_one: resolve(__dirname, "examples/motion-one-animation/composition.html"),
      },
  >>>>>>> REPLACE
  ```

**D. Verification Configuration**
- **`tests/e2e/verify-render.ts`**:
  Add the test case to the `CASES` array.
  ```typescript
  <<<<<<< SEARCH
    { name: 'Lottie', relativePath: 'examples/lottie-animation/composition.html', mode: 'dom' as const },
  ];
  =======
    { name: 'Lottie', relativePath: 'examples/lottie-animation/composition.html', mode: 'dom' as const },
    { name: 'Motion One', relativePath: 'examples/motion-one-animation/composition.html', mode: 'dom' as const },
  ];
  >>>>>>> REPLACE
  ```

#### 4. Test Plan
- **Verification Command**:
  ```bash
  npm install && npm run build:examples && npx ts-node tests/e2e/verify-render.ts
  ```
- **Success Criteria**:
  1. `motion` package installs successfully.
  2. Build completes without error.
  3. `verify-render.ts` output contains `✅ Motion One Passed!`.
  4. `output/motion-one-render-verified.mp4` is generated.
- **Edge Cases**:
  - If `autoSyncAnimations` fails (e.g., Motion One uses a custom ticker even for WAAPI), the fallback is to manually sync using `helios.subscribe` and `controls.time = ...`. This would still be a success but would require updating the code to use the manual approach.
