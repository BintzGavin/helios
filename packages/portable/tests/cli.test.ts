import { describe, expect, it } from 'vitest';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runCli } from '../src/cli.js';
import { probeVideo } from '../src/render.js';

describe('portable CLI', () => {
  it.each(['native', 'skia'])('renders a plan from disk to a verified video with %s and no Chromium', async rasterizer => {
    const dir = await mkdtemp(join(tmpdir(), 'helios-portable-cli-'));
    try {
      const plan = join(dir, 'plan.json'), output = join(dir, 'out.mp4');
      await writeFile(plan, JSON.stringify({ version: 'portable-v1', width: 160, height: 90, fps: { num: 30, den: 1 }, frameCount: 6, background: '#123456', nodes: [] }));
      await runCli(['render', plan, '--output', output, '--rasterizer', rasterizer]);
      expect((await probeVideo(output)).frameCount).toBe(6);
      expect((await readFile(output)).length).toBeGreaterThan(500);
    } finally { await rm(dir, { recursive: true, force: true }); }
  }, 30000);
  it('rejects exposing the service without an explicit authentication boundary', async () => {
    await expect(runCli(['serve', '--host', '0.0.0.0'])).rejects.toThrow(/auth|trusted/i);
  });
});
