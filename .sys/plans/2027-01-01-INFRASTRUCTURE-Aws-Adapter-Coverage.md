#### 1. Context & Goal
- **Objective**: Improve test coverage for the AWS execution adapter (`AwsLambdaAdapter`).
- **Trigger**: The Infrastructure domain is in an incubating phase. The adapter currently has missed paths regarding error handling during parsing.
- **Impact**: Better test coverage ensures that the `AwsLambdaAdapter` correctly handles error responses and bad payload formats, driving up the test coverage closer to 100%.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/infrastructure/tests/aws-adapter.test.ts` (Implement tests for the AwsLambdaAdapter to cover missed lines regarding error handling)
- **Read-Only**: `packages/infrastructure/src/adapters/aws-adapter.ts`

#### 3. Implementation Spec
- **Architecture**: The test file will use Vitest to mock Lambda interactions and verify that `AwsLambdaAdapter` correctly parses the payload JSON fallback block and exception blocks.
- **Pseudo-Code**:
  - Add test for malformed JSON error payload: verify the scenario where `response.FunctionError` is true but the payload JSON is malformed, so it hits the `catch { errorDetails = payloadStr; }` fallback.
  - Add test for malformed JSON success payload: verify the scenario where the response is successful but parsing the payload JSON fails and falls into `catch (e) { stderr = ...; if (!stdout) stdout = payloadStr; exitCode = 1; }` fallback logic.
- **Public API Changes**: None
- **Dependencies**: None
- **Cloud Considerations**: Ensure AWS Lambda error payloads are correctly simulated.

#### 4. Test Plan
- **Verification**: `cd packages/infrastructure && npm run test tests/aws-adapter.test.ts -- --coverage`
- **Success Criteria**: `aws-adapter.ts` reaches 100% test coverage.
- **Edge Cases**: Malformed JSON responses.
- **Integration Verification**: Ensure all tests pass.
