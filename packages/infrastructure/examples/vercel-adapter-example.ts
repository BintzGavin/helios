import { VercelAdapter } from '../src/adapters/vercel-adapter.js';
import { WorkerJob } from '../src/types/job.js';

async function run() {
  console.log('--- VercelAdapter Example ---');

  const adapter = new VercelAdapter({
    serviceUrl: 'https://your-vercel-project.vercel.app/api/render',
    authToken: 'optional-auth-token',
    jobDefUrl: 'https://storage.example.com/jobs/job-123.json'
  });

  const job: WorkerJob = {
    command: 'ffmpeg',
    args: ['-i', 'input.mp4', 'output.mp4'],
    cwd: '/tmp',
    env: {},
    meta: {
      chunkId: 0
    }
  };

  console.log(`Executing chunk ${job.meta?.chunkId} on Vercel...`);
  console.log('Ensure you have a mock or real Vercel function running to accept the POST request.');

  try {
    // Note: This will fail unless a real endpoint is available.
    // A try/catch is used to gracefully handle the expected network error in this standalone script.
    const result = await adapter.execute(job);
    console.log('Execution Result:', result);
  } catch (error: any) {
    console.error('Execution Failed (expected if no endpoint available):', error.message);
  }
}

run().catch(console.error);
