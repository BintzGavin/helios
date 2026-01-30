# Implementation Plan - Render Session API

#### 1. Context & Goal
- **Objective**: Implement `RenderSession`, a standardized orchestration primitive for frame-by-frame rendering loops.
- **Trigger**: Vision gap "Client-Side WebCodecs as Primary Export" requires a reliable, shared mechanism to iterate frames and ensure stability before capture.
- **Impact**: Enables `packages/player` (Client-Side Export) and `packages/renderer` (Server-Side Export) to share the same robust frame-stepping logic, reducing code duplication and ensuring consistent behavior (e.g. `waitUntilStable` timing).

#### 2. File Inventory
- **Create**:
  - `packages/core/src/render-session.ts`: Implementation of `RenderSession` class.
  - `packages/core/src/render-session.test.ts`: Unit tests.
- **Modify**:
  - `packages/core/src/index.ts`: Export `RenderSession` and related types.
- **Read-Only**:
  - `packages/core/src/index.ts`: To reference `Helios` type.

#### 3. Implementation Spec
- **Architecture**:
  - `RenderSession` class accepts a `Helios` instance and options.
  - Implements an Async Iterator pattern (`Symbol.asyncIterator` or generator) to yield frames.
  - Handles the "Seek -> Wait -> Yield" lifecycle.
  - Supports cancellation via `AbortSignal`.

- **Pseudo-Code**:
  ```typescript
  class RenderSession {
    constructor(helios, options) { ... }

    async *[Symbol.asyncIterator]() {
      for frame from start to end:
        if aborted break;
        helios.seek(frame)
        await helios.waitUntilStable()
        yield frame
    }
  }
  ```

- **Public API Changes**:
  - Export `RenderSession` class.
  - Export `RenderSessionOptions` interface.

- **Dependencies**:
  - Requires `Helios.seek` and `Helios.waitUntilStable`.

#### 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
  - `RenderSession` iterates exactly from start to end frame.
  - `waitUntilStable` is called for every frame.
  - Iteration stops if `AbortSignal` is fired.
- **Edge Cases**:
  - Empty range (start == end).
  - Invalid range (start > end).
  - Helios instance disposed during render.
