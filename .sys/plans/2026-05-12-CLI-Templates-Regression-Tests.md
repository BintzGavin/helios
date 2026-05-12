#### 1. Context & Goal
- **Objective**: Implement comprehensive regression tests for all file generation templates in `packages/cli/src/templates`.
- **Trigger**: Following the NOTHING TO DO PROTOCOL, there are currently no active deltas or feature gaps in the `cli` package according to `AGENTS.md` and `docs/BACKLOG.md`. The `packages/cli/src/templates` directory is completely devoid of test coverage despite being the core data source for the CLI's scaffolding (`init` and `deploy`) commands.
- **Impact**: Ensures that critical templates (e.g. Dockerfiles, cloud resource manifests, scaffolding configurations) maintain their expected structure, preventing accidental regressions when these hardcoded templates are updated.

#### 2. File Inventory
- **Create**:
  - `packages/cli/src/templates/__tests__/frameworks.test.ts` (Tests React, Vue, Svelte, Solid, Vanilla templates)
  - `packages/cli/src/templates/__tests__/cloud.test.ts` (Tests AWS, Azure, Cloudflare, GCP, etc. deployment templates)
- **Modify**: None
- **Read-Only**: `packages/cli/src/templates/*.ts`

#### 3. Implementation Spec
- **Architecture**: Create standard Vitest suites to validate the exported template objects.
- **Pseudo-Code**:
  - `frameworks.test.ts`: Import each framework template (e.g., `REACT_TEMPLATE`, `VUE_TEMPLATE`). Iterate over expected files (`package.json`, `vite.config.ts`, `tsconfig.json`, etc.) and assert they exist and contain framework-specific keywords (e.g., `@vitejs/plugin-react` for React).
  - `cloud.test.ts`: Import cloud templates (e.g., `AWS_SAM_TEMPLATE`, `KUBERNETES_JOB_TEMPLATE`). Assert that the templates are valid strings and contain critical configurations (e.g., `apiVersion: batch/v1` for K8s, `AWSTemplateFormatVersion` for SAM).
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npx vitest run packages/cli/src/templates/__tests__` from the `packages/cli` directory.
- **Success Criteria**: All template tests pass, validating that no exported template string or object is undefined and they all contain the expected core properties/strings.
- **Edge Cases**: Ensure JSON parseability is tested for templates that represent JSON files (e.g., the `package.json` entries in framework templates).
