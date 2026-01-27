# P5.js Integration Example

## 1. Context & Goal
- **Objective**: Create a new example `examples/p5-canvas-animation` demonstrating integration with the P5.js creative coding library.
- **Trigger**: "Use What You Know" vision gap. P5.js is a standard tool for creative coding (Canvas) but is currently missing from examples.
- **Impact**: Unlocks Helios for the large community of P5.js artists and creative coders, allowing them to use their existing skills to create video content.

## 2. File Inventory
- **Create**:
    - `examples/p5-canvas-animation/composition.html`: The main entry point containing the P5.js sketch and Helios integration.
- **Modify**:
    - `package.json`:
        - Add `p5` and `@types/p5` to `devDependencies`.
        - Add `"dev:p5": "vite serve examples/p5-canvas-animation"` to `scripts`.
    - `vite.build-example.config.js`:
        - Add `p5_composition: resolve(__dirname, "examples/p5-canvas-animation/composition.html")` to the `input` object.
    - `tests/e2e/verify-render.ts`:
        - Add `{ name: 'P5', relativePath: 'examples/p5-canvas-animation/composition.html', mode: 'canvas' }` to the `CASES` array.
- **Read-Only**:
    - `packages/core/dist/index.js`: Import source for Helios.

## 3. Implementation Spec
- **Architecture**:
    - **Instance Mode**: Use P5.js in Instance Mode (passing a closure to `new p5()`) to avoid polluting the global window object and ensure compatibility with ES modules.
    - **Loop Control**: Explicitly call `p.noLoop()` in `setup()` to disable P5's internal requestAnimationFrame loop.
    - **State Driving**: Use `helios.subscribe()` to trigger frame updates via `p.redraw()`.
    - **Time Management**: Inside `p.draw()`, derive animation state from `helios.currentFrame` (or `helios.currentTime`) rather than `p.frameCount` or `p.millis()`, ensuring the animation is deterministic and seekable.

- **Pseudo-Code (composition.html)**:
    ```html
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <style>
            body { margin: 0; overflow: hidden; }
            #p5-container { width: 100vw; height: 100vh; }
        </style>
    </head>
    <body>
        <div id="p5-container"></div>
        <script type="module">
            import { Helios } from '../../packages/core/dist/index.js';
            import p5 from 'p5';

            const helios = new Helios({ fps: 30, duration: 10 });

            // Store reference to sketch if needed
            const mySketch = new p5((p) => {
                p.setup = () => {
                    p.createCanvas(window.innerWidth, window.innerHeight);
                    p.noLoop(); // CRITICAL: Stop P5's internal loop
                };

                p.draw = () => {
                    // CRITICAL: Use Helios time, not P5 time
                    // 10 second loop
                    const time = helios.currentTime;
                    const progress = (time % 10) / 10;

                    p.background(20);
                    p.fill(255, 0, 0);
                    // Example animation logic
                    p.ellipse(p.width * progress, p.height / 2, 100);
                };

                p.windowResized = () => {
                    p.resizeCanvas(window.innerWidth, window.innerHeight);
                };
            }, document.getElementById('p5-container'));

            // Bind to document timeline for Renderer
            helios.bindToDocumentTimeline();

            // Drive P5 from Helios
            helios.subscribe(() => {
                // p.redraw() executes draw() once
                mySketch.redraw();
            });

            // Expose for debugging
            window.helios = helios;
        </script>
    </body>
    </html>
    ```

- **Dependencies**:
    - `p5`: Install latest version.
    - `@types/p5`: Install for type checking (even if not using TS in this specific file, it helps IDEs).

## 4. Test Plan
- **Verification**:
    1. Run `npm install` to install the new P5 dependencies.
    2. Run `npm run build:examples` to generate the build artifact.
    3. Run `npx ts-node tests/e2e/verify-render.ts` to execute the end-to-end rendering verification.
- **Success Criteria**:
    - `npm install` completes without conflicts.
    - Build process succeeds and outputs `examples/p5-canvas-animation/composition.html` to `output/example-build/`.
    - E2E test output shows `✅ P5 Passed!`.
    - `output/p5-render-verified.mp4` is created and contains a smooth animation.
- **Edge Cases**:
    - **Resize**: P5's `resizeCanvas` should handle window resizing if verified in browser (though E2E uses fixed size).
    - **Looping**: Ensure `p.noLoop()` effectively prevents double-rendering or drift.
