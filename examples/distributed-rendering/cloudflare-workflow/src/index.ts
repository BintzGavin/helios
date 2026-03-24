/**
 * Helios Distributed Rendering — Cloudflare Worker Entrypoint
 *
 * Exposes an HTTP endpoint that triggers the HeliosRenderWorkflow.
 * The workflow handles the full lifecycle: sandbox provisioning,
 * render execution, polling, and cleanup.
 */

export { HeliosRenderWorkflow } from './render-workflow';

interface Env {
  RENDER_WORKFLOW: Workflow;
  RENDER_BUCKET: R2Bucket;
  CF_ACCOUNT_ID: string;
  CF_API_TOKEN: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
}

interface RenderRequest {
  compositionUrl: string;
  chunks?: number;
  fps?: number;
  width?: number;
  height?: number;
  duration?: number;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/render' && request.method === 'POST') {
      const body = (await request.json()) as RenderRequest;

      if (!body.compositionUrl) {
        return new Response(
          JSON.stringify({ error: 'compositionUrl is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Create a workflow instance
      const instance = await env.RENDER_WORKFLOW.create({
        params: {
          compositionUrl: body.compositionUrl,
          chunks: body.chunks ?? 4,
          fps: body.fps ?? 30,
          width: body.width ?? 1920,
          height: body.height ?? 1080,
          duration: body.duration ?? 10,
          accountId: env.CF_ACCOUNT_ID,
          apiToken: env.CF_API_TOKEN,
        },
      });

      return new Response(
        JSON.stringify({
          id: instance.id,
          status: 'started',
          message: `Render workflow started with ${body.chunks ?? 4} chunks`,
        }),
        { status: 202, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (url.pathname.startsWith('/status/')) {
      const id = url.pathname.split('/status/')[1];
      try {
        const instance = await env.RENDER_WORKFLOW.get(id);
        const status = await instance.status();
        return new Response(JSON.stringify(status), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch {
        return new Response(
          JSON.stringify({ error: 'Workflow not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response('Helios Render Worker. POST /render to start.', {
      headers: { 'Content-Type': 'text/plain' },
    });
  },
};
