#### 1. Context & Goal
- **Objective**: Improve test coverage for `AwsLambdaAdapter` to reach 100% statement and branch coverage by testing uncovered error handling and parsing edge cases.
- **Trigger**: The INFRASTRUCTURE domain has reached gravitational equilibrium for feature implementation, requiring test coverage improvements as a fallback task. Current coverage for `aws-adapter.ts` shows uncovered lines: 56-60, 81, and 93-121.
- **Impact**: Ensures robust handling of unexpected AWS Lambda responses, malformed payloads, and edge cases, increasing the reliability of distributed rendering on AWS.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/infrastructure/tests/aws-adapter.test.ts`
- **Read-Only**: `packages/infrastructure/src/adapters/aws-adapter.ts`

#### 3. Implementation Spec
- **Architecture**: Expand the existing Vitest suite in `aws-adapter.test.ts` to cover missing branches in `aws-adapter.ts`.
- **Pseudo-Code**:
  - Add a test case where `job.meta.jobDefUrl` is undefined, `config.jobDefUrl` is undefined, and `job.meta.chunkId` is defined to hit the `if (!jobDefUrl)` condition (lines 56-60) inside the `try` block, verifying it returns a failed `WorkerResult` object with the error message.
  - Add a test case for lines 81: When `response.FunctionError` is true, and `response.Payload` exists, but `JSON.parse` fails inside the try block (e.g. invalid JSON string), so it falls back to the catch block `errorDetails = payloadStr;`.
  - Add a test case for lines 93-121: Test successful execution where `result.body` exists but does NOT contain an `output` property (to bypass `if (body.output) stdout = body.output`).
  - Add a test case where `result.body` is present and parsed correctly from a JSON string, and `result.statusCode` is NOT 200, but `body.message` is missing, so it falls back to `'Lambda returned non-200 status code'`.
  - Add a test case where `response.Payload` exists on a successful invocation, but it contains malformed JSON that fails the outer `JSON.parse(payloadStr)`, and `stdout` has been partially set, covering the `catch (e)` block for successful responses.
- **Public API Changes**: None
- **Dependencies**: None
- **Cloud Considerations**: Ensures the AWS Lambda adapter correctly interprets both structured and unstructured responses from various custom deployment environments.

#### 4. Test Plan
- **Verification**: Run `cd packages/infrastructure && npm run test -- --coverage`
- **Success Criteria**: The `aws-adapter.ts` file must show 100% coverage for Statements, Branches, Functions, and Lines in the test output.
- **Edge Cases**: Malformed JSON in both error and success payloads, missing body attributes, missing configuration.
- **Integration Verification**: Not required, as this is purely a unit test coverage task.