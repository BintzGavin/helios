import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { createMcpServer } from './mcp';
import { RenderAccessError, serveRenderOutput } from './render-access';
import type { StudioPluginOptions } from './types';

export interface McpHttpOptions extends StudioPluginOptions {
  projectRoot: string;
  /** Stable identity, not a credential. Revalidated for every request. */
  authenticate: (req: IncomingMessage) => Promise<string | undefined>;
  allowedHosts: string[];
  allowedOrigins: string[] | (() => string[]);
  maxSessions?: number;
  sessionTtlMs?: number;
}

async function readJson(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1024 * 1024)
      throw new RenderAccessError('BODY_TOO_LARGE', 'MCP request exceeds 1 MiB.', 413);
    chunks.push(Buffer.from(chunk));
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    throw new RenderAccessError('INVALID_JSON', 'Invalid JSON request.');
  }
}

/** Narrow listener shared by local Studio and the authenticated remote gateway. */
export function createMcpHttpHandler(getPort: () => number, options: McpHttpOptions) {
  type Session = {
    owner: string;
    server: ReturnType<typeof createMcpServer>;
    transport: SSEServerTransport | StreamableHTTPServerTransport;
    expires: number;
  };
  const sessions = new Map<string, Session>();
  let pendingSessions = 0;
  const ttl = options.sessionTtlMs ?? 30 * 60 * 1000;
  const sweep = setInterval(
    () => {
      for (const [id, session] of sessions)
        if (session.expires <= Date.now()) {
          sessions.delete(id);
          void session.server.close();
        }
    },
    Math.min(ttl, 60000),
  );
  sweep.unref();
  const send = (res: ServerResponse, status: number, code: string) => {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ error: code }));
  };
  const remember = (id: string, session: Session) => {
    sessions.set(id, session);
    // McpServer.connect installs transport.onclose. Preserve its cleanup hook.
    const previous = session.transport.onclose;
    session.transport.onclose = () => {
      sessions.delete(id);
      previous?.();
    };
  };
  async function handle(req: IncomingMessage, res: ServerResponse) {
    try {
      const owner = await options.authenticate(req);
      if (!owner) {
        res.setHeader('WWW-Authenticate', 'Bearer realm="Helios"');
        send(res, 401, 'UNAUTHORIZED');
        return;
      }
      let hostname: string;
      try {
        hostname = new URL(`http://${req.headers.host}`).hostname;
      } catch {
        send(res, 403, 'INVALID_HOST');
        return;
      }
      const origins =
        typeof options.allowedOrigins === 'function'
          ? options.allowedOrigins()
          : options.allowedOrigins;
      if (
        !options.allowedHosts.includes(hostname) ||
        (req.headers.origin && !origins.includes(req.headers.origin))
      ) {
        send(res, 403, 'UNTRUSTED_ORIGIN');
        return;
      }
      const url = new URL(req.url ?? '/', 'http://localhost');
      const output = /^\/mcp\/outputs\/([a-zA-Z0-9-]{1,100})$/.exec(url.pathname);
      if (output) {
        await serveRenderOutput(output[1], options.projectRoot, req, res);
        return;
      }
      if (!['/mcp', '/mcp/sse', '/mcp/messages'].includes(url.pathname)) {
        send(res, 404, 'NOT_FOUND');
        return;
      }
      const legacy = url.pathname !== '/mcp';
      const sessionId = legacy ? url.searchParams.get('sessionId') : req.headers['mcp-session-id'];
      if (sessionId) {
        const session = typeof sessionId === 'string' ? sessions.get(sessionId) : undefined;
        if (
          !session ||
          session.owner !== owner ||
          session.expires <= Date.now() ||
          legacy !== session.transport instanceof SSEServerTransport
        ) {
          send(res, 404, 'SESSION_NOT_FOUND');
          return;
        }
        session.expires = Date.now() + ttl;
        if (session.transport instanceof SSEServerTransport) {
          if (url.pathname !== '/mcp/messages' || req.method !== 'POST') {
            send(res, 405, 'METHOD_NOT_ALLOWED');
            return;
          }
          await session.transport.handlePostMessage(req, res, await readJson(req));
        } else
          await session.transport.handleRequest(
            req,
            res,
            req.method === 'POST' ? await readJson(req) : undefined,
          );
        return;
      }
      if (url.pathname === '/mcp/messages') {
        send(res, 400, 'SESSION_REQUIRED');
        return;
      }
      if ((legacy && req.method !== 'GET') || (!legacy && req.method !== 'POST')) {
        send(res, 405, 'METHOD_NOT_ALLOWED');
        return;
      }
      if (sessions.size + pendingSessions >= (options.maxSessions ?? 32)) {
        send(res, 503, 'SESSION_LIMIT');
        return;
      }
      pendingSessions++;
      try {
        const body = legacy ? undefined : await readJson(req);
        if (!legacy && !isInitializeRequest(body)) {
          send(res, 400, 'INITIALIZE_REQUIRED');
          return;
        }
        const server = createMcpServer(getPort, options);
        const transport = legacy
          ? new SSEServerTransport('/mcp/messages', res)
          : new StreamableHTTPServerTransport({ sessionIdGenerator: randomUUID });
        const session: Session = { owner, server, transport, expires: Date.now() + ttl };
        await server.connect(transport);
        if (transport instanceof SSEServerTransport) remember(transport.sessionId, session);
        else {
          await transport.handleRequest(req, res, body);
          if (transport.sessionId) remember(transport.sessionId, session);
          else await server.close();
        }
      } finally {
        pendingSessions--;
      }
    } catch (error) {
      if (res.headersSent) {
        res.destroy();
        return;
      }
      send(
        res,
        error instanceof RenderAccessError ? error.status : 500,
        error instanceof RenderAccessError ? error.code : 'MCP_REQUEST_FAILED',
      );
    }
  }
  return {
    handle,
    close: async () => {
      clearInterval(sweep);
      await Promise.all([...sessions.values()].map((s) => s.server.close()));
      sessions.clear();
    },
  };
}
