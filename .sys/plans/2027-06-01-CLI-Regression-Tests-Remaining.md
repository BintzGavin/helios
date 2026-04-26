---
result: impossible
---
#### 1. Context & Goal
- **Objective**: Implement comprehensive regression tests for the remaining untested CLI commands (`helios preview`, `helios skills`, `helios studio`).
- **Trigger**: `docs/status/CLI.md` states the next step is to "Implement regression tests for remaining commands". While some commands have tests, `preview.ts`, `skills.ts`, and `studio.ts` are still lacking coverage.
- **Impact**: Unlocks 100% test coverage for all CLI commands, ensuring stability and preventing regressions across the entire CLI surface.

#### 2. File Inventory
- **Create**:
  - `packages/cli/src/commands/__tests__/preview.test.ts` (Unit tests for `preview` command)
  - `packages/cli/src/commands/__tests__/skills.test.ts` (Unit tests for `skills` command)
  - `packages/cli/src/commands/__tests__/studio.test.ts` (Unit tests for `studio` command)
- **Modify**:
  - `docs/status/CLI.md` (Update next steps and history)
  - `docs/BACKLOG.md` (Mark regression tests as completed if applicable)
- **Read-Only**:
  - `packages/cli/src/commands/preview.ts`
  - `packages/cli/src/commands/skills.ts`
  - `packages/cli/src/commands/studio.ts`

#### 3. Implementation Spec
- **Architecture**:
  - Use `vitest` for unit testing.
  - Mock external dependencies like `vite`, `fs`, `console`, and `process.exit`.
  - For `preview.test.ts`: Mock `vite.preview` to verify options passed and error handling.
  - For `skills.test.ts`: Mock `fs.existsSync`, `fs.mkdirSync`, `fs.cpSync`, and `fs.rmSync` to verify the installation flow and directory checks.
  - For `studio.test.ts`: Mock `vite.createServer`, `@helios-project/studio/cli`, `loadConfig`, and `RegistryClient` to verify server creation, plugin configuration, and error handling.
- **Pseudo-Code**:
  - Standard command test structure: instantiate `Command`, register the command, stub globals (console/process), and `parseAsync`.
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm run test -w packages/cli` to verify all new tests pass.
- **Success Criteria**: 100% pass rate for `preview.test.ts`, `skills.test.ts`, and `studio.test.ts`.
- **Edge Cases**:
  - Missing directories for `preview`.
  - Missing skills directory for `skills install`.
  - Failed server start for `preview` and `studio`.
