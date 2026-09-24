// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { getRenderStatus, getRenderOutput, readRenderOutput } from './render-access';

const state = vi.hoisted(() => ({ jobs: new Map<string, any>() }));
vi.mock('./render-manager', () => ({ getJob: (id: string) => state.jobs.get(id) }));
let root: string;
beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'helios-access-'));
  await fs.mkdir(path.join(root, 'renders'));
  state.jobs.clear();
});
afterEach(async () => { await fs.rm(root, { recursive: true, force: true }); });

it('reports unknown jobs, bounded wait expiry, real progress, and terminal failure', async () => {
  await expect(getRenderStatus('missing')).rejects.toMatchObject({ code: 'JOB_NOT_FOUND' });
  state.jobs.set('one', { id: 'one', status: 'rendering', progress: 0.4, compositionId: 'title' });
  expect(await getRenderStatus('one', 15)).toMatchObject({ jobId: 'one', status: 'rendering', progress: 0.4, timedOut: true });
  state.jobs.get('one').status = 'failed';
  state.jobs.get('one').error = 'Encoder failed';
  expect(await getRenderStatus('one', 15)).toMatchObject({ status: 'failed', error: 'Encoder failed', timedOut: false });
  await expect(getRenderStatus('one', 30001)).rejects.toMatchObject({ code: 'INVALID_WAIT' });
});

it('returns completed bytes in bounded chunks without exposing local paths', async () => {
  const bytes = Buffer.from('deterministic-output-fixture');
  const file = path.join(root, 'renders', 'render-one.mp4');
  await fs.writeFile(file, bytes);
  state.jobs.set('one', { id: 'one', status: 'completed', outputPath: file });
  const output = await getRenderOutput('one', root);
  expect(output).toEqual({ jobId: 'one', mimeType: 'video/mp4', size: bytes.length, path: '/mcp/outputs/one', maxChunkBytes: 262144 });
  const chunk = await readRenderOutput('one', root, 3, 5);
  expect(Buffer.from(chunk.data, 'base64')).toEqual(bytes.subarray(3, 8));
  expect(chunk).toMatchObject({ offset: 3, nextOffset: 8, eof: false });
  await expect(readRenderOutput('one', root, 0, 262145)).rejects.toMatchObject({ code: 'INVALID_RANGE' });
  await expect(readRenderOutput('one', root, 100, 1)).rejects.toMatchObject({ code: 'INVALID_RANGE' });
});

it('rejects not-ready, missing, empty, external and symlink outputs', async () => {
  state.jobs.set('one', { id: 'one', status: 'rendering' });
  await expect(getRenderOutput('one', root)).rejects.toMatchObject({ code: 'OUTPUT_NOT_READY' });
  const job = state.jobs.get('one'); job.status = 'completed';
  job.outputPath = path.join(root, 'outside.mp4');
  await fs.writeFile(job.outputPath, 'private');
  await expect(getRenderOutput('one', root)).rejects.toMatchObject({ code: 'UNSAFE_OUTPUT' });
  const link = path.join(root, 'renders', 'render-one.mp4');
  await fs.symlink(job.outputPath, link); job.outputPath = link;
  await expect(getRenderOutput('one', root)).rejects.toMatchObject({ code: 'UNSAFE_OUTPUT' });
  await fs.unlink(link);
  await expect(getRenderOutput('one', root)).rejects.toMatchObject({ code: 'OUTPUT_MISSING' });
  await fs.writeFile(link, '');
  await expect(getRenderOutput('one', root)).rejects.toMatchObject({ code: 'OUTPUT_EMPTY' });
  await fs.rm(path.join(root, 'renders'), { recursive: true });
  await fs.mkdir(path.join(root, 'elsewhere'));
  await fs.writeFile(path.join(root, 'elsewhere', 'render-one.mp4'), 'private');
  await fs.symlink(path.join(root, 'elsewhere'), path.join(root, 'renders'));
  await expect(getRenderOutput('one', root)).rejects.toMatchObject({ code: 'UNSAFE_OUTPUT' });
});
