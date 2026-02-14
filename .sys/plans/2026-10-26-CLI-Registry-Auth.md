# CLI Plan: Enable Private Registry Authentication

## 1. Context & Goal
- **Objective**: Enable the CLI to authenticate with private component registries using Bearer tokens and establish a testing infrastructure for the CLI package.
- **Trigger**: The "Monetization Readiness" vision in `AGENTS.md` requires architecture compatible with paid/private registries, but the current `RegistryClient` lacks authentication support. Additionally, `packages/cli` lacks automated tests, hindering stability.
- **Impact**: Unlocks the ability to use private or paid component registries and ensures future CLI development is testable and stable.

## 2. File Inventory
- **Modify**: `packages/cli/src/registry/client.ts` (Implement auth logic)
- **Modify**: `packages/cli/package.json` (Add `vitest` devDependency and `test` script)
- **Create**: `packages/cli/vitest.config.ts` (Configure Vitest for CLI)
- **Create**: `packages/cli/src/registry/__tests__/client.test.ts` (Unit tests for RegistryClient)

## 3. Implementation Spec
- **Architecture**:
  - Update `RegistryClient` to accept an authentication token via constructor or `HELIOS_REGISTRY_TOKEN` environment variable.
  - Inject `Authorization: Bearer <token>` header into `fetch` requests when a token is present.
  - Add `vitest` to `packages/cli` to enable unit testing.
- **Public API Changes**:
  - `RegistryClient` constructor signature updated to accept optional `token: string`.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: Run `npm run test` in `packages/cli`.
- **Success Criteria**:
  - New unit tests pass, verifying that `RegistryClient` sends the correct `Authorization` header when a token is provided.
  - Verify that `HELIOS_REGISTRY_TOKEN` env var is correctly picked up.
- **Edge Cases**:
  - Token provided in constructor takes precedence over env var.
  - No token provided -> No header sent.
  - Token with special characters.
