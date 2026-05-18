#### 1. Context & Goal
- **Objective**: Add regression tests for the missing `docker-adapter` templates in `packages/cli/src/templates/__tests__/cloud.test.ts`.
- **Trigger**: The file `packages/cli/src/templates/docker-adapter.ts` exports `DOCKER_COMPOSE_ADAPTER_TEMPLATE` and `README_DOCKER_TEMPLATE`, but these are currently untested in `cloud.test.ts`.
- **Impact**: Ensures that all cloud infrastructure templates provided by the Helios CLI are tracked and verified against regressions, completing the regression testing suite for templates.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/cli/src/templates/__tests__/cloud.test.ts` - Append test cases for `docker-adapter` templates.
- **Read-Only**: `packages/cli/src/templates/docker-adapter.ts`

#### 3. Implementation Spec
- **Architecture**: Standard vitest unit tests validating exports and essential string content.
- **Pseudo-Code**:
  - Import `DOCKER_COMPOSE_ADAPTER_TEMPLATE`, `README_DOCKER_TEMPLATE` from `../docker-adapter`.
  - Add an `it` block asserting that `DOCKER_COMPOSE_ADAPTER_TEMPLATE` and `README_DOCKER_TEMPLATE` are defined.
  - Assert that `DOCKER_COMPOSE_ADAPTER_TEMPLATE` contains `'version: \\'3.8\\''`.
  - Assert that `README_DOCKER_TEMPLATE` contains `'# Docker Deployment'`.
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: Run `npx vitest packages/cli/src/templates/__tests__/cloud.test.ts`.
- **Success Criteria**: All tests pass successfully and output indicates all tests passing (including new ones).
- **Edge Cases**: Assure no duplicate tests are run and paths resolve correctly.