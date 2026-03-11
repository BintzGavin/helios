# INFRASTRUCTURE: Azure Functions Adapter Example

## 1. Context & Goal
- **Objective**: Create a standalone example script demonstrating the usage of `AzureFunctionsAdapter`.
- **Trigger**: The Azure Functions adapter was implemented, but lacks an example script to demonstrate its usage, which is a requirement defined in `docs/BACKLOG.md`.
- **Impact**: Provides users and developers with a clear, runnable reference on how to configure and execute jobs using the Azure Functions adapter.

## 2. File Inventory
- **Create**:
  - `packages/infrastructure/examples/azure-functions-adapter.ts`: Standalone example script demonstrating the usage of `AzureFunctionsAdapter`.
- **Modify**: None.
- **Read-Only**:
  - `packages/infrastructure/src/adapters/azure-functions-adapter.ts`
  - `packages/infrastructure/src/types/adapter.ts`

## 3. Implementation Spec
- **Architecture**: Create an example script that instantiates an `AzureFunctionsAdapter` and demonstrates how to configure and use it. It will also show how it integrates with `JobExecutor`.
- **Pseudo-Code**:
  ```typescript
  import { AzureFunctionsAdapter } from '../src/adapters/azure-functions-adapter.js';
  import { JobExecutor } from '../src/orchestrator/executor.js';

  async function main() {
    console.log('--- Azure Functions Adapter Example ---');

    // 1. Initialize the Adapter
    const adapter = new AzureFunctionsAdapter({
      serviceUrl: 'https://my-render-app.azurewebsites.net/api/renderChunk',
      functionKey: 'mock-function-key-12345',
      jobDefUrl: 's3://my-bucket/jobs/job-123.json'
    });

    console.log('Adapter initialized with config.');

    // 2. Prepare a WorkerJob chunk (Simulated)
    const jobChunk = {
      command: 'render',
      meta: {
        chunkId: 42,
        jobDefUrl: 's3://my-bucket/jobs/job-456.json' // Overrides default
      }
    };

    console.log(`Prepared chunk ${jobChunk.meta.chunkId}.`);

    // NOTE: This will fail in a real environment without a valid Azure Function running.
    // In a real scenario, you would await adapter.execute(jobChunk);

    console.log('To execute manually:');
    console.log('  const result = await adapter.execute(jobChunk);');
    console.log('  console.log(result);');

    // 3. Demonstrate integration with JobExecutor
    const executor = new JobExecutor(adapter, {
       jobId: 'demo-job',
       jobPath: 's3://my-bucket/jobs/job-456.json',
       totalChunks: 10,
       chunkRetries: 3
    });

    console.log('JobExecutor initialized with AzureFunctionsAdapter.');
    console.log('To run distributed rendering:');
    console.log('  const finalStatus = await executor.run();');

    console.log('--- Example Complete ---');
  }

  main().catch(console.error);
  ```
- **Public API Changes**: None.
- **Dependencies**: The `AzureFunctionsAdapter` and `JobExecutor` must be fully implemented.
- **Cloud Considerations**: The example should demonstrate the use of `functionKey` for authentication, which is common in Azure Functions.

## 4. Test Plan
- **Verification**: Run `cd packages/infrastructure && npm install --no-save --workspaces=false && npm run test && npm run lint`
- **Success Criteria**: The example script is created and syntactically correct. It can be run using `npx ts-node examples/azure-functions-adapter.ts` without runtime errors (ignoring the actual network call if not mocked, but the script as written does not make the network call).
- **Edge Cases**: N/A for an example script.
- **Integration Verification**: Ensure the script correctly imports and uses the `AzureFunctionsAdapter` and `JobExecutor`.
