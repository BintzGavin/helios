#### 1. Context & Goal
- **Objective**: Update `packages/infrastructure/README.md` to document Orchestration, Job Management, Cloud Execution Adapters, and Worker Runtime abstractions.
- **Trigger**: The INFRASTRUCTURE domain has reached gravitational equilibrium with the V2 vision, so the agent must focus on allowed fallback actions like Documentation clarity. Currently, `packages/infrastructure/README.md` lacks documentation for these critical V2 features.
- **Impact**: Provides clear usage instructions and architectural context for developers using the Infrastructure package for distributed rendering, ensuring it's well understood.

#### 2. File Inventory
- **Create**: []
- **Modify**: [`packages/infrastructure/README.md` - Add documentation sections for Orchestration, Job Management, Cloud Adapters, and Worker Runtime]
- **Read-Only**: [
    `packages/infrastructure/src/orchestrator/job-manager.ts`,
    `packages/infrastructure/src/orchestrator/job-executor.ts`,
    `packages/infrastructure/src/adapters/aws-adapter.ts`,
    `packages/infrastructure/src/adapters/cloudrun-adapter.ts`,
    `packages/infrastructure/src/worker/runtime.ts`
  ]

#### 3. Implementation Spec
- **Architecture**: Expand the existing `packages/infrastructure/README.md` file to include comprehensive documentation sections for missing features.
- **Pseudo-Code**:
  - Add a "Worker Runtime" section detailing `WorkerRuntime`, `createAwsHandler`, and `createCloudRunServer`.
  - Add a "Cloud Execution Adapters" section detailing `AwsLambdaAdapter` and `CloudRunAdapter`.
  - Add an "Orchestration & Job Management" section detailing `JobManager`, `JobExecutor`, `JobExecutionOptions`, and tracking state/metrics.
- **Public API Changes**: None. This is purely a documentation update.
- **Dependencies**: None.
- **Cloud Considerations**: Clearly document how the abstractions support both AWS Lambda and Google Cloud Run.

#### 4. Test Plan
- **Verification**: Run `npm run lint -w packages/infrastructure` to ensure the markdown file formatting is correct and no linting errors are introduced.
- **Success Criteria**: The `packages/infrastructure/README.md` file contains detailed sections for Orchestration, Cloud Adapters, and Worker Runtime.
- **Edge Cases**: None.
- **Integration Verification**: Check visually that the README renders correctly and provides accurate information about the current state of the codebase.