# 2026-11-14-INFRASTRUCTURE-Cloud-Deployment-Tooling

## 1. Context & Goal
- **Objective**: Implement generic cloud deployment entrypoint generators (`createAwsHandler` and `createCloudRunServer`) within `packages/infrastructure`.
- **Trigger**: Vision gap: V2 requires "deployment tooling" for cloud execution. While `AwsLambdaAdapter` and `CloudRunAdapter` dispatch jobs, users are currently forced to write boilerplate server/handler logic to connect the incoming cloud payloads to the `WorkerRuntime`.
- **Impact**: Provides out-of-the-box deployment templates that seamlessly integrate the cloud adapter payloads with the execution environment, significantly lowering the barrier to deploying distributed rendering workers.

## 2. File Inventory
- **Create**:
  - `packages/infrastructure/src/worker/aws-handler.ts`: Generator for AWS Lambda handlers.
  - `packages/infrastructure/src/worker/cloudrun-server.ts`: Generator for Cloud Run express servers.
- **Modify**:
  - `packages/infrastructure/src/worker/index.ts`: Export the new generator functions.
  - `packages/infrastructure/src/index.ts`: Ensure the new worker functions are exported.
- **Read-Only**:
  - `packages/infrastructure/src/worker/runtime.ts`: To understand the execution environment.
  - `packages/infrastructure/src/adapters/aws-adapter.ts`: To align the expected incoming payload format.
  - `packages/infrastructure/src/adapters/cloudrun-adapter.ts`: To align the expected incoming payload format.

## 3. Implementation Spec
- **Architecture**:
  - Expose a `createAwsHandler(runtime: WorkerRuntime)` function that returns an async handler signature compatible with AWS Lambda (`(event: any, context: any) => Promise<any>`).
  - The AWS handler must parse the `jobPath` and `chunkIndex` from the incoming event, invoke `runtime.executeChunk(jobPath, chunkIndex)`, and return a standardized JSON response containing `{ statusCode, body: { exitCode, stdout, stderr } }`.
  - Expose a `createCloudRunServer(runtime: WorkerRuntime, port?: number)` function that returns an initialized HTTP server (using the native Node `http` module or a lightweight framework like Express).
  - The Cloud Run server must listen for `POST` requests, parse the JSON body for `jobPath` and `chunkIndex`, invoke `runtime.executeChunk(jobPath, chunkIndex)`, and respond with HTTP 200 or 500 depending on the `WorkerResult.exitCode`, along with the `stdout` and `stderr` in the JSON body.
- **Pseudo-Code**:
  - `createAwsHandler`: Return async function that accepts `event`. Try-catch block parsing `event`. Call `runtime.executeChunk`. Return formatted status.
  - `createCloudRunServer`: Create HTTP server. On `request`, read body chunks. Parse JSON. Call `runtime.executeChunk`. Return `res.writeHead(200)` and `res.end(JSON.stringify(result))`.
- **Public API Changes**: Adds `createAwsHandler` and `createCloudRunServer` to the `@helios-project/infrastructure` worker exports.
- **Dependencies**: Depends on the existing `WorkerRuntime` functionality.
- **Cloud Considerations**: The implementation must remain generic and strictly rely on standard JSON payloads to avoid deep vendor SDK lock-in inside the worker environments.

## 4. Test Plan
- **Verification**: Run `npm run test` and `npm run lint` in the `packages/infrastructure` package. Write unit tests for both generators by passing mocked `WorkerRuntime` instances and simulating AWS events / HTTP requests.
- **Success Criteria**: Mocked AWS events correctly trigger the runtime and return a formatted HTTP response object. Mocked HTTP POST requests correctly parse the body, trigger the runtime, and return a 200 OK status with the expected JSON payload.
- **Edge Cases**: Missing `jobPath` or `chunkIndex` in payload. Runtime throwing unexpected errors. Unrecognized HTTP methods in the Cloud Run server.
- **Integration Verification**: Verify that the generated handler/server signatures perfectly match the payloads sent by `AwsLambdaAdapter` and `CloudRunAdapter`.
