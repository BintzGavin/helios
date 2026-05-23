#### 1. Context & Goal
- **Objective**: Implement regression tests for the `RenderJobChunk`, `RenderJobMetadata`, and `JobSpec` interfaces in `packages/cli/src/types/job.ts`.
- **Trigger**: Following the NOTHING TO DO PROTOCOL, fallback action dictates improving test coverage. Types enforcing structural constraints need validation.
- **Impact**: Ensures that critical structural types used for distributed rendering job execution remain stable and any future inadvertent modifications are caught early by failing assertions.

#### 2. File Inventory
- **Create**:
  - `packages/cli/src/types/__tests__/job.test.ts` (Implement static structural tests for `JobSpec` and related types)
- **Modify**: []
- **Read-Only**:
  - `packages/cli/src/types/job.ts` (The interfaces under test)

#### 3. Implementation Spec
- **Architecture**: Use Vitest's `describe`, `it`, and `expect` to build objects conforming to the interfaces defined in `packages/cli/src/types/job.ts` and assert that their properties are present and correctly typed. Since they are TypeScript types, these tests primarily verify the structure at compile time and runtime mapping.
- **Pseudo-Code**:
  - Create a mock `RenderJobChunk` object and expect it to be defined and have specific keys (`id`, `startFrame`, `frameCount`, `outputFile`, `command`).
  - Create a mock `RenderJobMetadata` object and verify keys (`totalFrames`, `fps`, `width`, `height`, `duration`).
  - Create a mock `JobSpec` combining both, verifying its composite structure (`metadata`, `chunks`, `mergeCommand`).
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run test -w packages/cli -- --run`
- **Success Criteria**: Tests in `src/types/__tests__/job.test.ts` pass successfully.
- **Edge Cases**: N/A for type-checking tests.
