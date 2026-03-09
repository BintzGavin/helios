#### 1. Context & Goal
- **Objective**: Fix a bug in `createCloudRunServer` where the `error.message` property access throws an exception when the error is null or undefined.
- **Trigger**: Expanding error state coverage in the CloudRunServer resiliency tests revealed a flaw in how errors are handled in the HTTP handler.
- **Impact**: Enhances the robustness of the Cloud Run entrypoint by verifying it behaves correctly under internal execution errors, preventing unhandled promise rejections and silent failures in production.

#### 2. File Inventory
- **Create**: []
- **Modify**:
  - `packages/infrastructure/src/worker/cloudrun-server.ts`
  - `packages/infrastructure/tests/worker/cloudrun-server.test.ts`
- **Read-Only**: []

#### 3. Implementation Spec
- **Architecture**: The HTTP handler catches errors inside a generic `try/catch` block. When an error is caught, it attempts to read `error.message` and defaults to a string. However, if the error is `null` or not an object, accessing `error.message` will throw a TypeError, causing the process to fail. We will change the access to optional chaining (`error?.message`).
- **Pseudo-Code**:
  - Open `packages/infrastructure/src/worker/cloudrun-server.ts`.
  - In the `catch (error: any)` block, change `error.message` to `error?.message`.
  - Open `packages/infrastructure/tests/worker/cloudrun-server.test.ts`.
  - Add a test that verifies a 500 status code and fallback message when `WorkerRuntime` throws `null`.
  - Add a test that verifies a 500 status code for malformed JSON payload.
  - Add a test that verifies a 405 Method Not Allowed for non-POST requests.
- **Public API Changes**: None.
- **Dependencies**: None.
- **Cloud Considerations**: Ensure the tests verify the specific contract expected by Google Cloud Run services.

#### 4. Test Plan
- **Verification**: `cd packages/infrastructure && npm run test -- tests/worker/cloudrun-server.test.ts`
- **Success Criteria**: All new tests pass successfully, confirming that the server handles missing payloads, bad methods, invalid JSON, missing job parameters, and internal `WorkerRuntime` exceptions gracefully.
- **Edge Cases**: Ensure the server cleanly shuts down between tests to avoid `EADDRINUSE` errors.
- **Integration Verification**: Ensure the full infrastructure test suite still passes.
