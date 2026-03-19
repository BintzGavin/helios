#### 1. Context & Goal
- **Objective**: Create an example script (`deno-deploy-adapter-example.ts`) demonstrating the use of `DenoDeployAdapter`.
- **Trigger**: The `DenoDeployAdapter` has been implemented, tested, and documented, but lacks an example script. As the infrastructure domain is in gravitational equilibrium (all V2 backlog items complete), this falls under the allowed fallback action "Examples" as per `AGENTS.md`.
- **Impact**: Unlocks better developer experience by providing a concrete, runnable example of how to configure and invoke the `DenoDeployAdapter`, improving onboarding and validation.

#### 2. File Inventory
- **Create**: `packages/infrastructure/examples/deno-deploy-adapter-example.ts`
- **Modify**: None.
- **Read-Only**: `packages/infrastructure/src/adapters/deno-deploy-adapter.ts`

#### 3. Implementation Spec
- **Architecture**: Create a standalone script in `packages/infrastructure/examples/` that instantiates `DenoDeployAdapter` and executes a mock job.
- **Pseudo-Code**:
    - Import `DenoDeployAdapter` from `../src/adapters/deno-deploy-adapter.js` and `WorkerJob` from `../src/types/job.js`.
    - Define an async `run` function.
    - Instantiate `DenoDeployAdapter` with a mock `serviceUrl` (e.g., from an environment variable `DENO_DEPLOY_URL` or a fallback).
    - Define a mock `WorkerJob` with `meta.jobDefUrl` and `meta.chunkId` as required by the adapter.
    - Call `adapter.execute(job)` inside a try/catch block and log the result or error.
    - Execute the `run` function.
- **Public API Changes**: None.
- **Dependencies**: None.
- **Cloud Considerations**: The example will mock the Deno Deploy endpoint URL, as actual deployment is out of scope for the example script.

#### 4. Test Plan
- **Verification**: Run `npm run build` in `packages/infrastructure` to ensure the example compiles successfully.
- **Success Criteria**: The example script exists, is well-commented, compiles cleanly alongside the other examples, and clearly demonstrates the required `DenoDeployAdapterConfig` and `WorkerJob` structures.
- **Edge Cases**: None (It's an example script).
- **Integration Verification**: None.