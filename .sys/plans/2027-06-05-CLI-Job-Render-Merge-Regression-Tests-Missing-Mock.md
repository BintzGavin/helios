#### 1. Context & Goal
- **Objective**: Implement missing test mock setup for `packages/cli/src/commands/__tests__/job.test.ts`, `render.test.ts`, and `merge.test.ts` to fix `Failed to resolve entry` errors.
- **Trigger**: `vitest` failed in `packages/cli` due to missing entry resolution for `@helios-project/infrastructure` and `@helios-project/renderer` during import analysis in test files.
- **Impact**: This unlocks 100% test passing in `packages/cli`, verifying regression tests work seamlessly within the monorepo architecture.

#### 2. File Inventory
- **Create**: (None)
- **Modify**:
  - `packages/cli/src/commands/__tests__/job.test.ts` (Add `vi.mock('@helios-project/infrastructure', ...)` to prevent actual module resolution)
  - `packages/cli/src/commands/__tests__/render.test.ts` (Add `vi.mock('@helios-project/renderer', ...)` to prevent actual module resolution)
  - `packages/cli/src/commands/__tests__/merge.test.ts` (Add `vi.mock('@helios-project/renderer', ...)` to prevent actual module resolution)
- **Read-Only**: `packages/cli/src/commands/job.ts`, `packages/cli/src/commands/render.ts`, `packages/cli/src/commands/merge.ts`

#### 3. Implementation Spec
- **Architecture**: The `job.ts`, `render.ts`, and `merge.ts` commands rely heavily on external package imports (`@helios-project/infrastructure`, `@helios-project/renderer`). Vitest currently fails to resolve these workspace packages during tests without prior builds. We will add `vi.mock()` calls at the top of their respective `__tests__` files so that vitest doesn't try to resolve the actual packages, following standard mock practices.
- **Pseudo-Code**:
  - In `job.test.ts`, add `vi.mock('@helios-project/infrastructure', () => ({ ...mock classes... }));`
  - In `render.test.ts`, add `vi.mock('@helios-project/renderer', () => ({ ...mock methods... }));`
  - In `merge.test.ts`, add `vi.mock('@helios-project/renderer', () => ({ ...mock methods... }));`
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: `npm run test -w packages/cli -- --coverage`
- **Success Criteria**: All tests pass without the `Failed to resolve entry for package` error.
- **Edge Cases**: Ensure the mock covers the specific classes/functions imported by the commands.
