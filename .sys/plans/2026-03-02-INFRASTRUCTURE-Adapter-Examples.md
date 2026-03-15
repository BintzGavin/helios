#### 1. Context & Goal
- **Objective**: Implement example scripts for `FlyMachinesAdapter` and `DenoDeployAdapter` to document and demonstrate their standalone usage.
- **Trigger**: `docs/BACKLOG.md` lists these adapters as tier 1/2 targets. The codebase has the adapter logic, but lacks the necessary `examples` to ensure they are viable and well-documented.
- **Impact**: Demonstrates full integration capabilities for Fly.io Machines and Deno Deploy, validating they can be used with `JobManager` or standalone, bringing them up to par with other cloud adapters.

#### 2. File Inventory
- **Create**:
  - `packages/infrastructure/examples/fly-machines-adapter-example.ts` (Example standalone script for Fly.io)
  - `packages/infrastructure/examples/deno-deploy-adapter-example.ts` (Example standalone script for Deno Deploy)
- **Modify**:
  - `packages/infrastructure/README.md` (Add mention to the new examples under Cloud Execution Adapters)
- **Read-Only**:
  - `packages/infrastructure/src/adapters/fly-machines-adapter.ts`
  - `packages/infrastructure/src/adapters/deno-deploy-adapter.ts`

#### 3. Implementation Spec
- **Architecture**: Provide standalone Node scripts in `examples/` that instantiate the adapter with mock/real-looking credentials and fire off a `JobExecutor` with a simple job spec to simulate rendering.
- **Pseudo-Code**:
  - Create `fly-machines-adapter-example.ts` importing `FlyMachinesAdapter`. Initialize the adapter with `apiToken` from env or dummy. Call `execute` with a simple job.
  - Create `deno-deploy-adapter-example.ts` importing `DenoDeployAdapter`. Initialize the adapter with `serviceUrl` from env or dummy. Call `execute` with a simple job.
- **Public API Changes**: None.
- **Dependencies**: None.
- **Cloud Considerations**: Provide logging in the examples that it requires actual remote deployment to work, serving primarily as code-level demonstration of the configuration.

#### 4. Test Plan
- **Verification**: Run `cd packages/infrastructure && npm run build` and `cd packages/infrastructure && npm test`.
- **Success Criteria**: The TypeScript compiler successfully typechecks the new example files.
- **Edge Cases**: Ensure the examples gracefully handle missing environment variables (by logging a skip message).
- **Integration Verification**: Ensure all tests still pass to guarantee no syntax errors or regressions.