import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { WorkerRuntime } from './runtime.js';
import { ArtifactStorage } from '../types/index.js';

export interface CloudRunServerConfig {
  workspaceDir?: string;
  port?: number;
  storage?: ArtifactStorage;
}

function sendJson(res: ServerResponse, statusCode: number, data: any) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

export function createCloudRunServer(config: CloudRunServerConfig = {}) {
  const workspaceDir = config.workspaceDir || '/tmp';
  const port = config.port !== undefined ? config.port : parseInt(process.env.PORT || '8080', 10);
  const storage = config.storage;

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== 'POST') {
      sendJson(res, 405, { message: 'Method Not Allowed' });
      return;
    }

    const buffers: Buffer[] = [];
    for await (const chunk of req) {
      buffers.push(chunk as Buffer);
    }
    const bodyStr = Buffer.concat(buffers).toString('utf-8');

    let payload: any;
    try {
      payload = JSON.parse(bodyStr);
    } catch (e: any) {
      sendJson(res, 400, { message: 'Invalid JSON payload' });
      return;
    }

    const { jobPath, chunkIndex } = payload;
    if (typeof jobPath !== 'string' || typeof chunkIndex !== 'number') {
      sendJson(res, 400, { message: 'Missing jobPath or chunkIndex' });
      return;
    }

    try {
      const runtime = new WorkerRuntime({ workspaceDir, storage });
      const result = await runtime.run(jobPath, chunkIndex);

      sendJson(res, result.exitCode === 0 ? 200 : 500, {
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
      });
    } catch (error: any) {
      sendJson(res, 500, { message: error.message || String(error) });
    }
  });

  return {
    server,
    listen: (callback?: () => void) => {
      server.listen(port, callback);
      return server;
    }
  };
}
