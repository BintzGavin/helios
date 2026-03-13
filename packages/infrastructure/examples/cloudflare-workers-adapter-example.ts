import { CloudflareWorkersAdapter } from '../src/adapters/cloudflare-workers-adapter.js';

async function main() {
  const adapter = new CloudflareWorkersAdapter({
    serviceUrl: 'https://my-worker.workers.dev',
    jobDefUrl: 's3://my-bucket/jobs/job-123.json',
    authToken: 'secret-token'
  });

  const job = {
    id: 'demo-job-chunk-1',
    command: 'render',
    args: [],
    env: {},
    meta: {
      chunkId: 1
    }
  };

  console.log('Adapter prepared for Cloudflare Worker:', adapter);
  console.log('Job chunk:', job);
}

main().catch(console.error);
