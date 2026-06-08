#### 1. Context & Goal
- **Objective**: Improve test coverage for `render-manager.ts` in the Studio server by implementing tests for previously uncovered functions (`startRender`, `cancelJob`, `deleteJob`, `diagnoseServer`, and other core logic).
- **Trigger**: Test coverage for `src/server/render-manager.ts` is currently at ~31% based on Vitest runs, which represents a technical debt/coverage gap in the backend core logic of the `studio` domain. Following the "Nothing to Do Protocol", I'm targeting this component for improvement as the domain vision is aligned.
- **Impact**: Increases test reliability and prevents regressions in render task job orchestration within the studio.

#### 2. File Inventory
- **Create**: (None)
- **Modify**: `packages/studio/src/server/render-manager.test.ts` (Implement new unit tests for uncovered branches and methods)
- **Read-Only**: `packages/studio/src/server/render-manager.ts` (To understand function signatures and logic to cover)

#### 3. Implementation Spec
- **Architecture**: Expand `render-manager.test.ts` with test blocks for:
  - `startRender`: Test that the function generates a `jobId`, creates a new `RenderJob`, queues it in the job map, saves it (mocked), and correctly calls `RenderOrchestrator.render()`. Also verify failure paths (when `RenderOrchestrator.render` throws).
  - `cancelJob`: Test successful abort (when job exists and is rendering) and failure (job missing).
  - `deleteJob`: Test success case (deleting from map and filesystem if output file exists) and failure case (cannot delete currently rendering job or non-existent job).
  - `diagnoseServer`: Test successful diagnosis return from `Renderer.diagnose()` and failure paths.
  - Test helper logic for `inPoint`/`outPoint` within `getRenderJobSpec` and `startRender` to hit branches.
- **Pseudo-Code**:
  - Mock fs operations for deleting and verifying files.
  - Mock AbortController for cancelJob test.
  - Mock saving to avoid actual disk writes.
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: `npm run test -w packages/studio -- --coverage src/server/render-manager.test.ts`
- **Success Criteria**: The coverage for `src/server/render-manager.ts` increases significantly (e.g. from 31% to >80%).
- **Edge Cases**: Assure we handle mocked async rejections to simulate render failures properly, and simulate concurrent operations on the `jobs` map.
