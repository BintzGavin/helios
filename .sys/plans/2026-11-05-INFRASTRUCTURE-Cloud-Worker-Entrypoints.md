# INFRASTRUCTURE: Cloud Worker Entrypoints

#### 1. Context & Goal
- **Objective**: Implement cloud worker entrypoint templates (AWS Lambda handler and Google Cloud Run Express server) to enable actual deployment of stateless workers.
- **Trigger**: Vision gap. The infrastructure provides adapters (`AwsLambdaAdapter`, `CloudRunAdapter`) to invoke cloud workers and a `WorkerRuntime` to execute jobs, but lacks the actual entrypoint code that runs *inside* the cloud environments to bridge the invocation payload to the `WorkerRuntime`. This fulfills the "deployment tooling" requirement for cloud execution.
- **Impact**: Enables end-users to package and deploy stateless rendering workers to AWS Lambda and Google Cloud Run using standard entrypoints, fully unlocking distributed cloud rendering workflows.

#### 2. File Inventory
- **Create**:
  - `packages/infrastructure/src/worker/aws-handler.ts` (AWS Lambda handler entrypoint)
  - `packages/infrastructure/src/worker/cloudrun-server.ts` (Google Cloud Run HTTP server entrypoint)
  - `packages/infrastructure/tests/worker/aws-handler.test.ts`
  - `packages/infrastructure/tests/worker/cloudrun-server.test.ts`
- **Modify**:
  - `packages/infrastructure/src/worker/index.ts` (Export the new entrypoints)
- **Read-Only**:
  - `packages/infrastructure/src/worker/runtime.ts`
  - `packages/infrastructure/src/adapters/aws-adapter.ts`
  - `packages/infrastructure/src/adapters/cloudrun-adapter.ts`

#### 3. Implementation Spec
- **Architecture**:
  - **AWS Lambda Handler (`aws-handler.ts`)**:
    - Define an exported async `createHandler(config)` function that returns a Lambda handler.
    - Parse the incoming `event` payload. The `AwsLambdaAdapter` sends: `{ jobPath, chunkIndex }`.
    - Instantiate `WorkerRuntime` configured with an ephemeral workspace directory (e.g., `/tmp`).
    - Call `runtime.run(jobPath, chunkIndex)`.
    - Return a response structured as `{ statusCode: 200, body: JSON.stringify({ exitCode, output: stdout, stderr }) }` to match the adapter's parsing logic.
    - Handle errors by returning a 500 status code with the error message.
  - **Google Cloud Run Server (`cloudrun-server.ts`)**:
    - Implement a basic Node HTTP server (using `node:http` to avoid adding `express` as a hard dependency).
    - Expose a POST endpoint that accepts a JSON payload.
    - Parse the incoming payload. The `CloudRunAdapter` sends: `{ jobPath, chunkIndex }`.
    - Instantiate `WorkerRuntime` using a writable local directory (e.g., `/tmp` or as configured via env vars).
    - Call `runtime.run(jobPath, chunkIndex)`.
    - Return a JSON response `res.write(JSON.stringify({ exitCode, stdout: result.stdout, stderr: result.stderr }))`.
    - Ensure the server listens on `process.env.PORT || 8080`.
- **Pseudo-Code**:
  ```typescript
  // aws-handler.ts
  import { WorkerRuntime } from './runtime.js';
  export function createAwsHandler(workspaceDir = '/tmp') {
    return async (event: any) => {
      try {
        const { jobPath, chunkIndex } = event;
        const runtime = new WorkerRuntime({ workspaceDir });
        const result = await runtime.run(jobPath, chunkIndex);
        return {
          statusCode: result.exitCode === 0 ? 200 : 500,
          body: JSON.stringify({ exitCode: result.exitCode, output: result.stdout, stderr: result.stderr })
        };
      } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
      }
    };
  }

  // cloudrun-server.ts
  import { createServer } from 'node:http';
  import { WorkerRuntime } from './runtime.js';
  export function createCloudRunServer(workspaceDir = '/tmp') {
    return createServer(async (req, res) => {
      if (req.method === 'POST') {
        // Read JSON body -> { jobPath, chunkIndex }
        // Run runtime.run(...)
        // res.writeHead(200, { 'Content-Type': 'application/json' });
        // res.end(JSON.stringify({ exitCode, stdout, stderr }));
      }
    });
  }
  ```
- **Public API Changes**:
  - Expose `createAwsHandler` and `createCloudRunServer` so users can import them in their deployment projects (e.g., `import { createAwsHandler } from '@helios-project/infrastructure'`).
- **Dependencies**: None.
- **Cloud Considerations**:
  - `aws-handler.ts` must fit the Node.js Lambda runtime signature.
  - `cloudrun-server.ts` must respect the `PORT` environment variable required by Google Cloud Run. Both environments require writing temporary files to memory-backed `/tmp` directories.

#### 4. Test Plan
- **Verification**: Run unit tests in `packages/infrastructure`.
- **Success Criteria**:
  - The AWS Lambda handler correctly parses a mock event, invokes `WorkerRuntime`, and formats the HTTP-like response expected by `AwsLambdaAdapter`.
  - The Cloud Run server correctly handles a mock POST request and returns the JSON format expected by `CloudRunAdapter`.
- **Edge Cases**:
  - Invalid payload (missing `jobPath` or `chunkIndex`).
  - Worker execution failure (should translate to proper error response format, not crash the server).
- **Integration Verification**: Ensure the response structures exactly match the parsing logic in `AwsLambdaAdapter` and `CloudRunAdapter`.
