// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createServer, request, type Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { createMcpHttpHandler } from './mcp-http';

const state = vi.hoisted(() => ({ jobs: new Map<string, any>() }));
vi.mock('./render-manager', () => ({
  getJob: (id: string) => state.jobs.get(id),
  cancelJob: async (id: string) => { const j = state.jobs.get(id); if (!j || !['queued', 'rendering'].includes(j.status)) return false; j.status = 'cancelled'; return true; },
  startRender: async (options: any) => {
    const id = 'job-' + state.jobs.size;
    state.jobs.set(id, { id, status: 'rendering', progress: .25, compositionId: options.compositionId });
    return id;
  },
}));
vi.mock('./discovery', () => ({
  findCompositions: async () => [{ id: 'demo', name: 'Demo', url: '/demo/composition.html', metadata: { width: 640, height: 360, fps: 24, duration: 3 } }],
  createComposition: async () => ({ id: 'demo', name: 'Demo' }),
  findAssets: async () => [],
  getProjectRoot: (root: string) => root,
}));
vi.mock('./documentation', () => ({ findDocumentation: () => [] }));
let server: Server;
let endpoint: string;
let root: string;
let handler: ReturnType<typeof createMcpHttpHandler>;
let clients: Client[];
// Ephemeral in-memory credentials: never persisted or printed, even on assertion failure.
let owner: string;
let other: string;
function headers(identity = owner) { return { authorization: `Bearer ${identity}` }; }
beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'helios-http-'));
  await fs.mkdir(path.join(root, 'renders'));
  state.jobs.clear(); clients = []; owner = randomUUID(); other = randomUUID();
  handler = createMcpHttpHandler(() => 5173, {
    projectRoot: root,
    authenticate: async req => req.headers.authorization === `Bearer ${owner}` ? 'owner' : req.headers.authorization === `Bearer ${other}` ? 'other' : undefined,
    allowedHosts: ['127.0.0.1'], allowedOrigins: ['https://video.example.com'],
  });
  server = createServer(handler.handle);
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
  endpoint = `http://127.0.0.1:${(server.address() as any).port}`;
});
afterEach(async () => {
  await Promise.all(clients.map(c => c.close()));
  await handler.close();
  server.closeAllConnections();
  await new Promise<void>(r => server.close(() => r()));
  await fs.rm(root, { recursive: true, force: true });
});
async function connect(legacy = false) {
  const client = new Client({ name: 'workflow-check', version: '1' }); clients.push(client);
  const transport = legacy
    ? new SSEClientTransport(new URL(endpoint + '/mcp/sse'), { requestInit: { headers: headers() }, eventSourceInit: { fetch: (url, init) => fetch(url, { ...init, headers: headers() }) } })
    : new StreamableHTTPClientTransport(new URL(endpoint + '/mcp'), { requestInit: { headers: headers() } });
  await client.connect(transport);
  return { client, transport };
}
const unpack = (result: any) => JSON.parse(result.content[0].text);

it('fails closed on every route and denies unexpected hosts, origins, and editor routes', async () => {
  for (const route of ['/mcp', '/mcp/sse', '/mcp/messages?sessionId=unknown', '/mcp/outputs/one', '/api/renders/one.mp4']) {
    expect((await fetch(endpoint + route)).status).toBe(401);
  }
  expect((await fetch(endpoint + '/mcp', { headers: { ...headers(), origin: 'https://attacker.example' } })).status).toBe(403);
  const badHostStatus = await new Promise<number | undefined>(resolve => {
    request(endpoint + '/mcp', { headers: { ...headers(), host: 'attacker.example' } }, res => { res.resume(); resolve(res.statusCode); }).end();
  });
  expect(badHostStatus).toBe(403);
  for (const route of ['/api/jobs', '/@fs/private', '/renders/jobs.json', '/mcp/sse/extra']) {
    expect((await fetch(endpoint + route, { headers: headers() })).status).toBe(404);
  }
});

it.each([false, true])('supports the complete tool lifecycle over real SDK transport (legacy=%s)', async legacy => {
  const { client } = await connect(legacy);
  expect((await client.listTools()).tools.map(t => t.name)).toEqual(expect.arrayContaining(['list_compositions', 'get_render_status', 'get_render_output', 'read_render_output', 'cancel_render']));
  expect(unpack(await client.callTool({ name: 'list_compositions', arguments: {} })).compositions[0].id).toBe('demo');
  expect((await client.callTool({ name: 'render_composition', arguments: { compositionId: '../absent' } })).isError).toBe(true);
  const created = unpack(await client.callTool({ name: 'create_composition', arguments: { name: 'demo', template: 'title-explainer' } }));
  const started = unpack(await client.callTool({ name: 'render_composition', arguments: { compositionId: created.id } }));
  const jobId = started.jobId;
  expect(unpack(await client.callTool({ name: 'get_render_status', arguments: { jobId, waitMs: 10 } }))).toMatchObject({ status: 'rendering', timedOut: true });
  expect(unpack(await client.callTool({ name: 'get_render_output', arguments: { jobId } })).code).toBe('OUTPUT_NOT_READY');
  expect(unpack(await client.callTool({ name: 'cancel_render', arguments: { jobId } })).status).toBe('cancelled');
  expect(unpack(await client.callTool({ name: 'get_render_status', arguments: { jobId: 'missing' } })).code).toBe('JOB_NOT_FOUND');
  const file = path.join(root, 'renders', `render-${jobId}.mp4`);
  await fs.writeFile(file, 'video-fixture');
  Object.assign(state.jobs.get(jobId), { status: 'completed', progress: 1, outputPath: file });
  expect(unpack(await client.callTool({ name: 'get_render_output', arguments: { jobId } })).size).toBe(13);
  const out = await fetch(endpoint + '/mcp/outputs/' + jobId, { headers: { ...headers(), range: 'bytes=1-4' } });
  expect(out.status).toBe(206); expect(out.headers.get('content-range')).toBe('bytes 1-4/13'); expect(await out.text()).toBe('ideo');
  expect((await fetch(endpoint + '/mcp/outputs/' + jobId, { method: 'HEAD', headers: headers() })).headers.get('content-length')).toBe('13');
});

it('isolates concurrent sessions and rejects replay by a different identity', async () => {
  const a = await connect(); const b = await connect();
  const id = (a.transport as StreamableHTTPClientTransport).sessionId!;
  expect((await fetch(endpoint + '/mcp', { method: 'POST', headers: { 'mcp-session-id': id }, body: '{}' })).status).toBe(401);
  expect(id === (b.transport as StreamableHTTPClientTransport).sessionId).toBe(false);
  const response = await fetch(endpoint + '/mcp', { method: 'DELETE', headers: { ...headers(other), 'mcp-session-id': id } });
  expect(response.status).toBe(404);
  expect((await a.client.listTools()).tools.length > 0).toBe(true);
  expect((await b.client.listTools()).tools.length > 0).toBe(true);
  await (a.transport as StreamableHTTPClientTransport).terminateSession();
  expect((await fetch(endpoint + '/mcp', { method: 'DELETE', headers: { ...headers(), 'mcp-session-id': id } })).status).toBe(404);
});

it('bounds sessions, expires them, and rejects malformed requests without creating a session', async () => {
  const bad = await fetch(endpoint + '/mcp', { method: 'POST', headers: headers(), body: '{' });
  expect(bad.status).toBe(400);
  expect((await fetch(endpoint + '/mcp', { method: 'POST', headers: headers(), body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }) })).status).toBe(400);
  await handler.close();
  handler = createMcpHttpHandler(() => 5173, {
    projectRoot: root, authenticate: async () => 'owner', allowedHosts: ['127.0.0.1'], allowedOrigins: [], maxSessions: 1, sessionTtlMs: 500,
  });
  server.removeAllListeners('request'); server.on('request', handler.handle);
  const a = await connect();
  const id = (a.transport as StreamableHTTPClientTransport).sessionId!;
  const initialize = { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26', clientInfo: { name: 'limit-test', version: '1' }, capabilities: {} } };
  expect((await fetch(endpoint + '/mcp', { method: 'POST', headers: headers(), body: JSON.stringify(initialize) })).status).toBe(503);
  await new Promise(r => setTimeout(r, 550));
  expect((await fetch(endpoint + '/mcp', { method: 'DELETE', headers: { ...headers(), 'mcp-session-id': id } })).status).toBe(404);
});

it('accepts a local Origin resolved after the listener chooses its port', async () => {
  await handler.close();
  handler = createMcpHttpHandler(() => 5173, {
    projectRoot: root, authenticate: async () => 'owner', allowedHosts: ['127.0.0.1'], allowedOrigins: () => [endpoint],
  });
  server.removeAllListeners('request'); server.on('request', handler.handle);
  const response = await fetch(endpoint + '/mcp', { headers: { ...headers(), origin: endpoint } });
  expect(response.status).toBe(405);
});

it('enforces the session limit for concurrent initialization requests', async () => {
  await handler.close();
  handler = createMcpHttpHandler(() => 5173, { projectRoot: root, authenticate: async () => 'owner', allowedHosts: ['127.0.0.1'], allowedOrigins: [], maxSessions: 1 });
  server.removeAllListeners('request'); server.on('request', handler.handle);
  const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26', clientInfo: { name: 'concurrent-limit', version: '1' }, capabilities: {} } });
  const pending: ReturnType<typeof request>[] = [];
  const responses = Array.from({ length: 8 }, () => new Promise<number | undefined>(resolve => {
    const req = request(endpoint + '/mcp', { method: 'POST', headers: { ...headers(), 'content-type': 'application/json', accept: 'application/json, text/event-stream' } }, res => { res.resume(); res.on('end', () => resolve(res.statusCode)); });
    req.write(body.slice(0, 10)); pending.push(req);
  }));
  await new Promise(r => setTimeout(r, 50));
  pending.forEach(req => req.end(body.slice(10)));
  const statuses = await Promise.all(responses);
  expect(statuses.filter(status => status === 200)).toHaveLength(1);
  expect(statuses.filter(status => status === 503)).toHaveLength(7);
});
