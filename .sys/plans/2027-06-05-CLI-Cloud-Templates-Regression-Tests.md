#### 1. Context & Goal
- **Objective**: Implement missing cloud template regression tests in `packages/cli/src/templates/__tests__/cloud.test.ts`.
- **Trigger**: The `.jules/CLI.md` log correctly identified that tests for Docker (`docker.ts`, `docker-adapter.ts`), Deno (`deno.ts`), Vercel (`vercel.ts`), Modal (`modal.ts`), Hetzner (`hetzner.ts`), and Fly.io (`fly.ts`) are missing from the `cloud.test.ts` suite.
- **Impact**: Ensures that all tier 1-3 infrastructure adapters scaffold files correctly and prevents regression errors as templates evolve.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/cli/src/templates/__tests__/cloud.test.ts` (Import missing templates and assert they contain correct properties or substrings).
- **Read-Only**: `packages/cli/src/templates/docker.ts`, `packages/cli/src/templates/docker-adapter.ts`, `packages/cli/src/templates/deno.ts`, `packages/cli/src/templates/vercel.ts`, `packages/cli/src/templates/modal.ts`, `packages/cli/src/templates/hetzner.ts`, `packages/cli/src/templates/fly.ts`

#### 3. Implementation Spec
- **Architecture**: Expand the existing Vitest `cloud.test.ts` file to import the constants from the newly identified missing files and check for critical content.
- **Pseudo-Code**:
  - Import `DOCKERFILE_TEMPLATE`, `DOCKER_COMPOSE_TEMPLATE` from `docker.ts`.
  - Import `DOCKER_COMPOSE_ADAPTER_TEMPLATE`, `README_DOCKER_TEMPLATE` from `docker-adapter.ts`.
  - Import `README_DENO_TEMPLATE` from `deno.ts`.
  - Import `README_VERCEL_TEMPLATE` from `vercel.ts`.
  - Import `README_MODAL_TEMPLATE` from `modal.ts`.
  - Import `README_HETZNER_TEMPLATE` from `hetzner.ts`.
  - Import `FLY_TOML_TEMPLATE`, `FLY_DOCKERFILE_TEMPLATE`, `README_FLY_TEMPLATE` from `fly.ts`.
  - Add test blocks asserting that each imported constant is defined and contains an expected substring (e.g. `FROM node:18-slim` for Docker, `# Deno Deploy Guide` for Deno).
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: `npx vitest run packages/cli/src/templates/__tests__/cloud.test.ts`
- **Success Criteria**: All newly added test assertions pass correctly without warnings or syntax errors.
- **Edge Cases**: No unexpected parsing issues from missing templates.
