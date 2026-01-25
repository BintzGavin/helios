# Enable Playwright Trace Viewer

## 1. Context & Goal
- **Objective**: Add support for Playwright Trace Viewer to capture execution traces during rendering.
- **Trigger**: Documented vision in `README.md` ("For post-mortem analysis, you can enable Playwright's Trace Viewer") is currently missing from the implementation.
- **Impact**: Enables debugging of complex rendering issues (e.g., blank frames, layout shifts, race conditions) by providing a full execution trace (screenshots, snapshots, network).

## 2. File Inventory
- **Modify**:
  - `packages/renderer/src/types.ts`: Add optional `tracePath` property to `RenderJobOptions`.
  - `packages/renderer/src/index.ts`: Refactor `render()` to use explicit context management and implement tracing logic.
- **Read-Only**:
  - `packages/renderer/src/strategies/RenderStrategy.ts`

## 3. Implementation Spec
- **Architecture**:
  - Switch from implicit context creation (`browser.newPage()`) to explicit context management (`browser.newContext()` -> `context.newPage()`).
  - Check `jobOptions.tracePath` before creating the page.
  - If `tracePath` is present, call `context.tracing.start({ screenshots: true, snapshots: true })`.
  - In the `finally` block, if `tracePath` was present, call `context.tracing.stop({ path: jobOptions.tracePath })` *before* closing the context/browser.
- **Public API Changes**:
  - `RenderJobOptions` interface gains `tracePath?: string`.
- **Pseudo-Code**:
  ```typescript
  // packages/renderer/src/index.ts

  public async render(compositionUrl, outputPath, jobOptions) {
    // ... launch browser ...

    // Explicit context creation
    const context = await browser.newContext({
      viewport: { width: this.options.width, height: this.options.height }
    });

    // Start tracing if requested
    if (jobOptions?.tracePath) {
      await context.tracing.start({ screenshots: true, snapshots: true });
    }

    // Create page from context
    const page = await context.newPage();

    try {
      // ... existing rendering logic ...
    } finally {
      // Stop tracing and save
      if (jobOptions?.tracePath) {
        await context.tracing.stop({ path: jobOptions.tracePath });
      }

      await context.close();
      await browser.close();
    }
  }
  ```
- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
  1. Build the renderer: `npm run build -w packages/renderer`
  2. Build examples (dependency): `npm run build:examples`
  3. Create a temporary verification script `packages/renderer/scripts/verify-trace.js`:
     ```javascript
     const { Renderer } = require('../dist/index');
     const path = require('path');
     const fs = require('fs');

     (async () => {
       const renderer = new Renderer({
         width: 100, height: 100, fps: 30, durationInSeconds: 1,
         mode: 'canvas'
       });

       // Use a simple built example
       const compositionUrl = 'file://' + path.resolve(__dirname, '../../../output/example-build/examples/simple-canvas-animation/composition.html');
       const tracePath = path.resolve(__dirname, '../../../output/trace.zip');

       console.log('Rendering with trace...');
       await renderer.render(
         compositionUrl,
         path.resolve(__dirname, '../../../output/trace-test.mp4'),
         { tracePath }
       );

       if (fs.existsSync(tracePath)) {
         console.log('✅ Trace file created at:', tracePath);
       } else {
         console.error('❌ Trace file missing!');
         process.exit(1);
       }
     })();
     ```
  4. Run the script: `node packages/renderer/scripts/verify-trace.js`
  5. Cleanup: Delete `packages/renderer/scripts/verify-trace.js`.

- **Success Criteria**:
  - The script outputs "✅ Trace file created at: ..."
  - `output/trace.zip` exists on the filesystem.

- **Edge Cases**:
  - `tracePath` is undefined (default behavior): Tracing should not start, no file should be created.
  - Output directory for trace does not exist: Playwright usually creates it, or throws. If it throws, that's acceptable for now (developer error), but ideally it should be handled.
