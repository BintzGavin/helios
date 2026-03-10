import { CloudflareWorkersAdapter } from '../src/adapters/cloudflare-workers-adapter.js';

async function main() {
  console.log('--- Cloudflare Workers Adapter Example ---');

  // Mock global.fetch for the example
  global.fetch = async (url: string | URL | Request, init?: RequestInit) => {
    console.log(`[Mock Fetch] POST ${url}`);
    console.log(`[Mock Fetch] Headers:`, init?.headers);
    console.log(`[Mock Fetch] Body:`, init?.body);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 50));

    return new Response(JSON.stringify({
      exitCode: 0,
      stdout: 'Simulated output from Cloudflare Worker edge compute',
      stderr: ''
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };

  const adapter = new CloudflareWorkersAdapter({
    serviceUrl: 'https://example-render.my-org.workers.dev',
    authToken: 'demo-token-123',
    jobDefUrl: 's3://helios-jobs/demo-job.json'
  });

  console.log('Executing job chunk 0...');
  const result = await adapter.execute({
    command: 'render',
    meta: { chunkId: 0 }
  });

  console.log('\nResult:');
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
