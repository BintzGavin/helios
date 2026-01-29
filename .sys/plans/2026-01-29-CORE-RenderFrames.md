#### 1. Context & Goal
- **Objective**: Implement a standard `renderFrames` utility function to orchestrate frame-by-frame rendering for client-side export.
- **Trigger**: The Vision Roadmap ("Client-Side WebCodecs as Primary Export") requires users to drive the rendering loop manually. Currently, no standard utility exists, forcing users to reinvent the `seek -> wait -> capture` loop.
- **Impact**: Unlocks the "Client-Side WebCodecs" roadmap item by providing a robust, stable primitives for exporting video directly from the browser, improving Agent Experience (AX) and Developer Experience (DX).

#### 2. File Inventory
- **Create**:
  - `packages/core/src/render.ts`: Will contain the `renderFrames` function and `RenderOptions` interface.
- **Modify**:
  - `packages/core/src/index.ts`: Export `renderFrames` and `RenderOptions`.
- **Read-Only**:
  - `packages/core/src/index.ts`: (For Helios class definition reference)

#### 3. Implementation Spec
- **Architecture**: Functional utility pattern. The function accepts a `Helios` instance and drives it via its public API (`seek`, `waitUntilStable`), ensuring loose coupling.
- **Pseudo-Code**:
  ```typescript
  interface RenderOptions {
    startFrame?: number;
    endFrame?: number;
    onFrame: (state: HeliosState) => Promise<void> | void;
  }

  async function renderFrames(helios: Helios, options: RenderOptions) {
    // 1. Determine range (use options or helios.playbackRange or 0..duration)
    // 2. Validate range (start <= end)
    // 3. Pause helios (to prevent interference)
    // 4. Loop from startFrame to endFrame:
    //    a. helios.seek(frame)
    //    b. await helios.waitUntilStable()
    //    c. await options.onFrame(helios.getState())
  }
  ```
- **Public API Changes**:
  - New export: `renderFrames(helios: Helios, options: RenderOptions): Promise<void>`
  - New type: `RenderOptions`
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
  - New test file `packages/core/src/render.test.ts` passes.
  - Test verifies that `onFrame` is called exactly `(end - start + 1)` times.
  - Test verifies that `waitUntilStable` is awaited after every seek.
  - Test verifies correct behavior when `startFrame` > `endFrame` (should probably throw or do nothing).
- **Edge Cases**:
  - `startFrame` equals `endFrame` (single frame).
  - `onFrame` throws an error (should propagate).
  - `helios` has a `playbackRange` set (should default to it if not overridden).
