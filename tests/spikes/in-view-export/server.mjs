#!/usr/bin/env node
// Spike only: `helios mcp` over streamable HTTP for the ext-apps basic-host, serving the
// spike view (out/player-export.html) and a prototype app-only `save_export` tool.
// Production `helios mcp` is untouched; this wraps createHeliosMcpServer from the built CLI.
//
//   node tests/spikes/in-view-export/server.mjs --root <dir> [--port 3001] [--connect fonts]
//
// --connect fonts adds Google Fonts to the view's CSP connectDomains (the default CSP has none).
import fs from 'fs';
import http from 'http';
import path from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { createHeliosMcpServer } from '../../../packages/cli/dist/mcp/server.js';
import { resolveInRoot } from '../../../packages/cli/dist/mcp/paths.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (name, dflt) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : dflt; };
const root = path.resolve(arg('--root', path.join(here, 'out/root')));
const port = Number(arg('--port', '3001'));
const connect = arg('--connect', 'none');
const viewPath = path.join(here, 'out/player-export.html');
fs.mkdirSync(root, { recursive: true });

/** Largest export save_export accepts, and the largest chunk per call (base64 characters). */
export const SAVE_EXPORT_MAX_BYTES = 256 * 1024 * 1024;
export const SAVE_EXPORT_MAX_CHUNK_CHARS = 8 * 1024 * 1024;
const APP_ONLY_META = { ui: { visibility: ['app'] }, 'openai/visibility': 'private', 'openai/widgetAccessible': true };
const CONNECT_DOMAINS = connect === 'fonts' ? ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'] : [];

/** Uploads in progress, shared by every session: uploadId -> chunks. */
const uploads = new Map();

function registerSaveExport(server, root) {
  server.registerTool(
    'save_export',
    {
      title: 'Save export',
      description: 'Saves an MP4 the player encoded in the browser into the project, in base64 chunks.',
      inputSchema: {
        name: z.string().min(1).max(200).regex(/^[^/\\]+\.mp4$/i, 'name is a file name ending in .mp4'),
        uploadId: z.string().min(8).max(64).regex(/^[A-Za-z0-9_-]+$/),
        index: z.number().int().min(0),
        total: z.number().int().min(1).max(4096),
        data: z.string().max(SAVE_EXPORT_MAX_CHUNK_CHARS),
      },
      outputSchema: { received: z.number(), total: z.number(), bytes: z.number(), path: z.string().optional(), absolutePath: z.string().optional() },
      annotations: { title: 'Save export', readOnlyHint: false, destructiveHint: false, openWorldHint: false },
      _meta: APP_ONLY_META,
    },
    async (args) => {
      const fail = (text) => ({ content: [{ type: 'text', text }], isError: true });
      if (args.index >= args.total) return fail('index must be below total');
      let up = uploads.get(args.uploadId);
      if (!up) {
        if (args.index !== 0) return fail(`Unknown upload ${args.uploadId}; start at index 0`);
        up = { name: args.name, total: args.total, chunks: [], bytes: 0, started: Date.now() };
        uploads.set(args.uploadId, up);
      }
      if (up.name !== args.name || up.total !== args.total || args.index !== up.chunks.length) {
        uploads.delete(args.uploadId);
        return fail(`Chunk ${args.index} is out of order for upload ${args.uploadId}`);
      }
      const buf = Buffer.from(args.data, 'base64');
      if (up.bytes + buf.length > SAVE_EXPORT_MAX_BYTES) {
        uploads.delete(args.uploadId);
        return fail(`The export is over ${SAVE_EXPORT_MAX_BYTES / 1024 / 1024} MB`);
      }
      up.chunks.push(buf);
      up.bytes += buf.length;
      if (up.chunks.length < up.total) {
        return { content: [{ type: 'text', text: `Received ${up.chunks.length}/${up.total}` }], structuredContent: { received: up.chunks.length, total: up.total, bytes: up.bytes } };
      }
      uploads.delete(args.uploadId);
      const file = Buffer.concat(up.chunks);
      if (file.length < 8 || file.toString('latin1', 4, 8) !== 'ftyp') return fail('The upload is not an MP4');
      const target = await resolveInRoot(root, path.posix.join('exports', args.name), { kind: 'new', label: 'name' });
      await fs.promises.mkdir(path.dirname(target.abs), { recursive: true });
      await fs.promises.writeFile(target.abs, file);
      return {
        content: [{ type: 'text', text: `Saved ${target.rel} (${file.length} bytes)` }],
        structuredContent: { received: up.total, total: up.total, bytes: file.length, path: target.rel, absolutePath: target.abs },
      };
    },
  );
}

/** Adds connectDomains to the view's CSP in resources/read (createHeliosMcpServer has no option for it). */
function patchViewCsp(server) {
  if (!CONNECT_DOMAINS.length) return;
  const handlers = server.server._requestHandlers;
  const read = handlers.get('resources/read');
  handlers.set('resources/read', async (request, extra) => {
    const result = await read(request, extra);
    for (const c of result.contents ?? []) {
      const ui = c._meta?.ui;
      if (ui?.csp) c._meta = { ...c._meta, ui: { ...ui, csp: { ...ui.csp, connectDomains: CONNECT_DOMAINS } } };
    }
    return result;
  });
}

function newServer() {
  const { server } = createHeliosMcpServer({ root, viewPath });
  registerSaveExport(server, fs.realpathSync(root));
  patchViewCsp(server);
  return server;
}

const transports = new Map();
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Expose-Headers': 'mcp-session-id, mcp-protocol-version',
};

http.createServer(async (req, res) => {
  for (const [k, v] of Object.entries(CORS)) res.setHeader(k, v);
  if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }
  if (!req.url.startsWith('/mcp')) { res.writeHead(404).end(); return; }
  try {
    let body;
    if (req.method === 'POST') {
      const parts = [];
      for await (const p of req) parts.push(p);
      const raw = Buffer.concat(parts);
      body = JSON.parse(raw.toString('utf8'));
      if (process.env.SPIKE_LOG_SIZES) console.error(`POST ${raw.length} bytes`);
    }
    const sid = req.headers['mcp-session-id'];
    let transport = sid ? transports.get(sid) : undefined;
    if (!transport && req.method === 'POST' && isInitializeRequest(body)) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id) => transports.set(id, transport),
      });
      transport.onclose = () => { if (transport.sessionId) transports.delete(transport.sessionId); };
      await newServer().connect(transport);
    }
    if (!transport) { res.writeHead(400, { 'content-type': 'application/json' }).end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: 'No session' }, id: null })); return; }
    await transport.handleRequest(req, res, body);
  } catch (err) {
    console.error('spike server:', err);
    if (!res.headersSent) res.writeHead(500).end(String(err));
  }
}).listen(port, () => console.error(`Spike helios mcp on http://localhost:${port}/mcp (root ${root}, connect ${connect})`));
