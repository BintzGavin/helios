#### 1. Context & Goal
- **Objective**: Improve test coverage for `packages/cli/src/commands/render.ts` by testing uncovered branches in `rendererOptionsToFlags`, options parsing, and URL manipulation logic.
- **Trigger**: Identifying missing branch coverage lines (10-17, 62, 135, 149, 203) from vitest execution reports.
- **Impact**: Attains 100% test coverage for the `render.ts` file, ensuring all flags and combinations are robustly handled by the CLI.

#### 2. File Inventory
- **Create**: none
- **Modify**: `packages/cli/src/commands/__tests__/render.test.ts`
- **Read-Only**: `packages/cli/src/commands/render.ts`

#### 3. Implementation Spec
- **Architecture**: We will add tests covering missing scenarios in `packages/cli/src/commands/__tests__/render.test.ts`.
- **Pseudo-Code**:
  - Add test asserting that all flags in `rendererOptionsToFlags` are joined correctly when providing an exhaustive options payload (this hits `10-17`, `203`, via chunk command generation logic that relies on `rendererOptionsToFlags`).
  - Add test asserting `parseInt(options.concurrency, 10)` fallback logic when concurrency is undefined/default (hits line `62`).
  - Add test asserting `file://` scheme logic when the URL starts with `file://` (hits line `135`).
  - Add test asserting URL cleanup path mapping logic (`cleanPath` starting with `./`) (hits line `149`).
  - This involves executing the `render` command with flags like `--quality 23`, `--mode dom`, `--audio-codec aac`, `--video-codec libx264`, `--no-headless` alongside `--emit-job` to trigger `rendererOptionsToFlags` internally within the `RenderOrchestrator.plan` mocking context.
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: `npm run test -w packages/cli -- --run src/commands/__tests__/render.test.ts --coverage`
- **Success Criteria**: Coverage report for `render.ts` must show 100% Stmts, Branch, Funcs, and Lines coverage with no uncovered lines remaining.
- **Edge Cases**: Assuring the `rendererOptionsToFlags` is executed correctly involves checking the outputted `job.json` chunks payload format.
