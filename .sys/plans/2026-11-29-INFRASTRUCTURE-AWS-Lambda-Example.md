#### 1. Context & Goal
- **Objective**: Create an example script demonstrating the use of `AwsLambdaAdapter` with `JobManager` for distributed rendering.
- **Trigger**: No feature gaps exist between the current codebase and the V2 vision for the INFRASTRUCTURE domain. Following the "Nothing To Do Protocol" fallback actions, expanding examples improves the product surface for V2.
- **Impact**: Provides clear developer documentation and a runnable example for configuring and executing distributed rendering jobs on AWS Lambda.

#### 2. File Inventory
- **Create**: `packages/infrastructure/examples/aws-lambda.ts` - Example script demonstrating AWS Lambda job execution.
- **Modify**: None
- **Read-Only**: `packages/infrastructure/src/adapters/aws-adapter.ts`, `packages/infrastructure/src/orchestrator/job-manager.ts`

#### 3. Implementation Spec
- **Architecture**: A standalone Node.js script that instantiates an `AwsLambdaAdapter`, a `JobExecutor`, and a `JobManager` to simulate submitting a job to AWS Lambda.
- **Pseudo-Code**:
  - Initialize `AwsLambdaAdapter` with configuration (e.g., function name, region).
  - Initialize `FileJobRepository` and `JobExecutor`.
  - Initialize `JobManager` combining these components.
  - Create a mock `JobSpec` representing a video rendering task.
  - Call `manager.submitJob(jobSpec)` and log the submission steps.
  - Clean up any mock file repositories created.
- **Public API Changes**: None.
- **Dependencies**: None.
- **Cloud Considerations**: The example will emphasize that real AWS credentials and a deployed Lambda function are required for actual execution, using mock or placeholder values for demonstration.

#### 4. Test Plan
- **Verification**: Run `npx tsx packages/infrastructure/examples/aws-lambda.ts`
- **Success Criteria**: The script executes without syntax errors and prints the job submission process and setup.
- **Edge Cases**: Ensure the example gracefully handles the lack of real AWS credentials by catching and logging execution errors while demonstrating the setup successfully.
- **Integration Verification**: Ensure it correctly imports required classes from `../src/index.js`.
