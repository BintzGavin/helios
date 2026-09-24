// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const fixture = vi.hoisted(() => ({ render: vi.fn() }));
vi.mock('@helios-project/renderer', () => ({ RenderOrchestrator: { render: fixture.render }, Renderer: class {} }));
import { initializeRenderManager, startRender, getJob, cancelJob } from './render-manager';
let root: string;
afterEach(async () => { if (root) await fs.rm(root, { recursive: true, force: true }); });
it('pins project ownership, uses unique IDs, and keeps cancellation terminal after late renderer completion', async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'helios-lifecycle-'));
  await initializeRenderManager(root);
  const pending: (() => void)[] = [];
  fixture.render.mockImplementation((_url, output) => new Promise<void>(resolve => {
    pending.push(async () => { await fs.writeFile(output, 'fixture-video'); resolve(); });
  }));
  const [a, b] = await Promise.all([startRender({ compositionUrl: '/a/composition.html' }, 5173), startRender({ compositionUrl: '/b/composition.html' }, 5173)]);
  expect(a === b).toBe(false);
  await expect(initializeRenderManager(path.join(root, 'another-owner'))).rejects.toThrow('project');
  await vi.waitFor(() => expect(pending.length).toBe(2));
  expect(await cancelJob(a)).toBe(true);
  pending.forEach(f => f());
  await vi.waitFor(() => expect(getJob(b)?.status).toBe('completed'));
  expect(getJob(a)?.status).toBe('cancelled');
  fixture.render.mockRejectedValueOnce(new Error('Encoder failed'));
  const c = await startRender({ compositionUrl: '/broken/composition.html' }, 5173);
  await vi.waitFor(() => expect(getJob(c)).toMatchObject({ status: 'failed', error: 'Encoder failed' }));
});
