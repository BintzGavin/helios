import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorkflow } from './package/workflow.js';
import { createApp } from './package/app-handler.js';

function fixture() {
  const store = new Map(); let state = 'rendering'; let renders = 0;
  const wrap = value => ({ __mcpContent: [{ type: 'text', text: JSON.stringify(value) }] });
  const calls = {
    list_compositions: async () => wrap({ compositions: [] }),
    create_composition: async () => wrap({ id: 'sample' }),
    render_composition: async () => { renders++; return wrap({ jobId: 'job-1', status: 'queued' }); },
    get_render_status: async () => wrap({ jobId: 'job-1', status: state, progress: state === 'completed' ? 1 : .5, timedOut: state === 'rendering' }),
    get_render_output: async () => wrap({ size: 9, mimeType: 'video/mp4', maxChunkBytes: 262144 }),
    read_render_output: async ({ offset, length }) => wrap({ data: Buffer.from('testvideo').subarray(offset, offset + length).toString('base64'), nextOffset: Math.min(9, offset + length), size: 9 }),
    cancel_render: async () => { state = 'cancelled'; return wrap({ status: state }); },
  };
  const storage = { get: async k => store.get(k), set: async (k, v) => store.set(k, v) };
  return { workflow: createWorkflow(calls, storage), calls, storage, setState: s => { state = s; }, renders: () => renders };
}
const brief = { requestId: 'demo-one', template: 'title-explainer', title: 'Make an idea move', subtitle: 'Brief to playable video' };
test('brief to resumable progress to a playable private video, with no duplicate render on retry', async () => {
  const f = fixture();
  await f.workflow.configure({ appUrl: 'https://person.kody.run/packages/helios-video' });
  const started = await f.workflow.start(brief);
  assert.equal(started.jobId, 'job-1');
  assert.equal(started.playbackUrl, 'https://person.kody.run/packages/helios-video/watch/job-1');
  assert.equal((await f.workflow.start(brief)).jobId, 'job-1'); assert.equal(f.renders(), 1);
  assert.equal((await f.workflow.status({ jobId: started.jobId, waitMs: 1 })).timedOut, true);
  f.setState('completed');
  assert.equal((await f.workflow.status({ jobId: started.jobId })).status, 'completed');
  const response = await f.workflow.video(new Request('https://example.test/video/job-1', { headers: { range: 'bytes=2-5' } }), 'job-1');
  assert.equal(response.status, 206); assert.equal(response.headers.get('content-range'), 'bytes 2-5/9'); assert.equal(await response.text(), 'stvi');
  assert.equal(await (await f.workflow.video(new Request('https://example.test/video/job-1'), 'job-1')).text(), 'testvideo');
});
test('handles provider errors, wait limits, failure, cancellation and unknown jobs', async () => {
  const f = fixture();
  await assert.rejects(f.workflow.status({ jobId: 'other-owner' }), /not found/);
  await assert.rejects(f.workflow.start({ ...brief, template: 'invented' }), /template/);
  await f.workflow.start(brief);
  await assert.rejects(f.workflow.status({ jobId: 'job-1', waitMs: 30001 }), /wait/);
  await assert.rejects(f.workflow.video(new Request('https://example.test'), 'job-1'), /not completed/);
  f.setState('failed'); assert.equal((await f.workflow.status({ jobId: 'job-1' })).status, 'failed');
  const getStatus = f.calls.get_render_status;
  f.calls.get_render_status = async () => ({ __mcpContent: [{ type: 'text', text: JSON.stringify({ status: 'failed', error: 'Encoder failed' }) }] });
  assert.equal((await f.workflow.status({ jobId: 'job-1' })).error, 'Encoder failed');
  f.calls.get_render_status = getStatus;
  assert.equal((await f.workflow.cancel({ jobId: 'job-1' })).status, 'cancelled');
  const other = createWorkflow(f.calls, { get: async () => undefined, set: async () => {} });
  await assert.rejects(other.video(new Request('https://example.test'), 'job-1'), /not found/);
  f.calls.create_composition = async () => ({ __mcpIsError: true, __mcpContent: [{ type: 'text', text: 'Creation failed' }] });
  await assert.rejects(f.workflow.start({ ...brief, requestId: 'failed' }), /Creation failed/);
  await assert.rejects(f.workflow.start({ ...brief, requestId: 'failed' }), /incomplete/);
});
test('rejects unsafe playback URLs, conflicting retries, malformed output chunks and unsatisfiable ranges', async () => {
  const f = fixture();
  await assert.rejects(f.workflow.configure({ appUrl: 'http://insecure.test' }), /HTTPS/);
  await f.workflow.start(brief); f.setState('completed');
  await assert.rejects(f.workflow.start({ ...brief, title: 'Different' }), /different brief/);
  assert.equal((await f.workflow.video(new Request('https://example.test', { headers: { range: 'bytes=30-40' } }), 'job-1')).status, 416);
  f.calls.read_render_output = async () => ({ nextOffset: 0, data: '' });
  await assert.rejects(async () => { await (await f.workflow.video(new Request('https://example.test'), 'job-1')).arrayBuffer(); }, /chunk/);
});
test('package app enters its own context, rejects foreign-origin writes, and mounts playback URLs correctly', async () => {
  const f = fixture();
  const context = { hostedUrl: 'https://person.kody.run/packages/helios-video', appBasePath: '/packages/helios-video' };
  const app = createApp(() => f.workflow, () => context);
  const start = headers => new Request('https://person.kody.run/start', { method: 'POST', headers, body: JSON.stringify(brief) });
  assert.equal((await app.fetch(start({ origin: 'https://attacker.test' }))).status, 403);
  assert.equal((await app.fetch(start({}))).status, 403);
  const result = await app.fetch(start({ 'Kody-Synthetic': 'true' }));
  assert.equal(result.status, 200);
  assert.equal((await result.json()).playbackUrl, context.hostedUrl + '/watch/job-1');
  const watch = await app.fetch(new Request('https://person.kody.run/watch/job-1'));
  assert.match(await watch.text(), /\/packages\/helios-video\/video\/job-1/);
  assert.equal((await app.fetch(new Request('https://person.kody.run/video/another-owner'))).status, 404);
});
