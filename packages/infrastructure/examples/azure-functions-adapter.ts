import { AzureFunctionsAdapter } from '../src/adapters/azure-functions-adapter.js';
import { JobExecutor } from '../src/orchestrator/job-executor.js';

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
    id: 'demo-job-chunk-42',
    command: 'render',
    args: [],
    env: {},
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
