import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { WorkerRuntime } from './runtime.js';
import { ArtifactStorage } from '../types/index.js';

export interface CloudRunServerConfig {
  /** The directory to use for the ephemeral workspace. Defaults to '/tmp'. */
  workspaceDir?: string;
  /** The port for the server to listen on. Defaults to process.env.PORT or 8080. */
  port?: number | string;
  /** Storage adapter for fetching remote job assets. */
  storage?: ArtifactStorage;
}

/**
 * Creates an HTTP server suitable for deployment as a Google Cloud Run service
 * for executing stateless worker jobs.
 *
 * @param config Configuration for the server
 * @returns A configured node:http Server instance
 */
export function createCloudRunServer(config: CloudRunServerConfig = {}) {
  const workspaceDir = config.workspaceDir || '/tmp';
  const port = config.port || process.env.PORT || 8080;

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    // Basic CORS and method check
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Method Not Allowed. Only POST requests are supported.' }));
      return;
    }

    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        if (!body) {
           res.writeHead(400, { 'Content-Type': 'application/json' });
           res.end(JSON.stringify({ message: 'Empty payload' }));
           return;
        }

        const payload = JSON.parse(body);
        const { jobPath, chunkIndex } = payload;

        if (!jobPath || chunkIndex === undefined) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Invalid payload: missing jobPath or chunkIndex' }));
          return;
        }

        const runtime = new WorkerRuntime({ workspaceDir, storage: config.storage });
        const result = await runtime.run(jobPath, chunkIndex);

        // Map status code 200 for success (0) and 500 for non-zero exits (to indicate failure)
        res.writeHead(result.exitCode === 0 ? 200 : 500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          exitCode: result.exitCode,
          stdout: result.stdout,
          stderr: result.stderr
        }));

      } catch (error: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: error.message || 'Unknown error in Cloud Run server' }));
      }
    });
  });

  return {
    server,
    listen: () => {
      server.listen(port, () => {
        console.log(`Cloud Run worker server listening on port ${port}`);
      });
      return server;
    }
  };
}
