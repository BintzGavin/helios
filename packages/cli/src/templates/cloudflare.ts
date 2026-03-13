export const WRANGLER_TOML_TEMPLATE = `name = "helios-render-worker"
main = "src/worker.ts"
compatibility_date = "2024-03-04"
compatibility_flags = ["nodejs_compat"]

[vars]
# Optional: Add any environment variables here
# HELIOS_API_KEY = "your-api-key"
`;

export const CLOUDFLARE_WORKER_TEMPLATE = `import { WorkerRuntime, CloudflareWorkersAdapter } from '@helios-project/infrastructure';

export interface Env {
  // Bindings like KV, D1, etc. can be added here
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    try {
      const payload = await request.json() as any;
      const { jobPath, chunkIndex } = payload;

      if (!jobPath || chunkIndex === undefined) {
         return new Response(JSON.stringify({ error: 'Missing jobPath or chunkIndex in payload' }), {
           status: 400,
           headers: { 'Content-Type': 'application/json' }
         });
      }

      // Initialize the runtime and the adapter
      const adapter = new CloudflareWorkersAdapter();
      const runtime = new WorkerRuntime(adapter);

      // Execute the job chunk
      const result = await runtime.executeChunk(jobPath, chunkIndex);

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error: any) {
      console.error('Worker execution failed:', error);
      return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },
};
`;

export const README_CLOUDFLARE_TEMPLATE = `# Helios Cloudflare Worker Deployment

This directory contains the configuration and script required to deploy a Helios rendering worker to Cloudflare Workers.

## Prerequisites

1.  **Cloudflare Account:** You need an active Cloudflare account.
2.  **Wrangler CLI:** Ensure you have Wrangler installed globally or as a dev dependency.
    \`\`\`bash
    npm install -g wrangler
    \`\`\`
3.  **Authentication:** Authenticate Wrangler with your Cloudflare account.
    \`\`\`bash
    wrangler login
    \`\`\`

## Deployment

1.  **Review Configuration:** Check the \`wrangler.toml\` file to customize the worker name or add environment variables.
2.  **Deploy:** Run the following command to deploy the worker to Cloudflare's edge network.
    \`\`\`bash
    wrangler deploy
    \`\`\`
3.  **Note the URL:** After deployment, Wrangler will output the URL of your new worker (e.g., \`https://helios-render-worker.<your-subdomain>.workers.dev\`).

## Executing Jobs

Once deployed, you can use the Helios CLI to execute distributed rendering jobs against your Cloudflare Worker.

\`\`\`bash
helios job run <path-to-job.json> --adapter cloudflare --endpoint <your-worker-url>
\`\`\`

Replace \`<path-to-job.json>\` with your job specification and \`<your-worker-url>\` with the URL provided by Wrangler.
`;
