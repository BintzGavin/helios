import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { digest } from '../src/storage.js';
import { parsePlan, type Node } from '../src/plan.js';
import { prepareScene, renderFrame } from '../src/render.js';
import { inspectPlan, sampleFrames } from '../src/inspect.js';
import { runCli } from '../src/cli.js';

const fontPath = fileURLToPath(new URL('./fixtures/fonts/NotoSans-Regular.ttf', import.meta.url));
async function fixture(nodes: Node[], extra: Record<string, unknown> = {}) {
  const bytes = await readFile(fontPath);
  const plan = parsePlan({ version: 'portable-v1', width: 320, height: 180, fps: { num: 30, den: 1 }, frameCount: 30, background: '#ffffff', assets: { sans: { type: 'font', bytes: bytes.length, sha256: digest(bytes) } }, nodes, ...extra });
  const paths = new Map([['sans', fontPath]]);
  return { plan, paths, prepared: await prepareScene(plan, paths) };
}
const text = (id: string, rest: Partial<Node> = {}): Node => ({ id, type: 'text', text: 'Helios', fonts: ['sans'], fontSize: 32, width: 200, fill: '#000000', ...rest } as Node);

describe('portable inspect', () => {
  it('samples a frame every quarter second, the last frame and both sides of each node boundary', async () => {
    const { plan } = await fixture([text('a', { start: 3, end: 11 })]);
    expect(sampleFrames(plan)).toEqual([0, 3, 8, 10, 11, 16, 24, 29]);
  });

  it('reports nothing for text inside the canvas', async () => {
    const { plan, prepared } = await fixture([text('a', { x: 20, y: 20 })]);
    expect(inspectPlan(plan, prepared).findings).toEqual([]);
  });

  it('groups text that slides off the canvas into one cut and one off-canvas finding', async () => {
    const { plan, prepared } = await fixture([text('a', { y: 40, x: { keyframes: [{ frame: 0, value: 20 }, { frame: 29, value: 400 }] } })]);
    const findings = inspectPlan(plan, prepared, { every: 0.1 }).findings;
    expect(findings.map(f => f.code)).toEqual(['TEXT_CLIPPED', 'TEXT_OFF_CANVAS']);
    const [cut, off] = findings;
    expect(cut.node).toBe('a');
    expect(cut.frames.count).toBeGreaterThan(1);
    expect(off.frames.last).toBe(29);
    expect(cut.frames.last).toBeLessThan(off.frames.first);
    expect(cut.message).toContain('"Helios"');
  });

  it.each([
    ['layout and scale', { scaleX: 1.3, scaleY: 0.9, originX: 20, originY: 10 }, 1.5],
    // Rotated, the box holds the rotated corners of the glyph box, which no glyph reaches.
    ['layout, rotation and scale', { rotation: 20, scaleX: 1.3, scaleY: 0.9, originX: 20, originY: 10 }, 4],
  ])('reports ink bounds that hold the rendered pixels through %s', async (_name, transform, slack) => {
    const node: Node = { id: 'g', type: 'group', x: 200, y: 20, width: 200, height: 140, layout: { direction: 'column', padding: 12, gap: 6, align: 'end' }, children: [
      { id: 'spacer', type: 'rect', width: 40, height: 30, fill: '#ffffff' } as Node,
      text('t', { width: 160, height: 60, transform }),
    ] } as Node;
    const { plan, paths, prepared } = await fixture([node], { frameCount: 1 });
    const [finding] = inspectPlan(plan, prepared).findings;
    expect(finding.code).toBe('TEXT_CLIPPED');
    const { pixels } = await renderFrame(plan, 0, paths, { prepared });
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let y = 0; y < plan.height; y++) for (let x = 0; x < plan.width; x++) {
      if (pixels[(y * plan.width + x) * 4] < 250) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x + 1); maxY = Math.max(maxY, y + 1); }
    }
    // Cut at the canvas edge, in pixels; antialiasing adds up to a pixel either way.
    const b = finding.bounds!, reported = [Math.max(0, b.minX), Math.max(0, b.minY), Math.min(plan.width, b.maxX), Math.min(plan.height, b.maxY)];
    const inked = [minX, minY, maxX, maxY];
    expect(reported[0]).toBeLessThanOrEqual(inked[0] + 1); expect(reported[1]).toBeLessThanOrEqual(inked[1] + 1);
    expect(reported[2]).toBeGreaterThanOrEqual(inked[2] - 1); expect(reported[3]).toBeGreaterThanOrEqual(inked[3] - 1);
    for (let i = 0; i < 4; i++) expect(Math.abs(reported[i] - inked[i])).toBeLessThanOrEqual(slack);
    expect(b.maxX).toBeGreaterThan(plan.width);
  });

  it('reports wrapped text taller than its declared box', async () => {
    const { plan, prepared } = await fixture([text('a', { x: 10, y: 10, width: 120, height: 40, text: 'Helios renders video from data' })]);
    const [finding] = inspectPlan(plan, prepared).findings;
    expect(finding).toMatchObject({ code: 'TEXT_BOX_OVERFLOW', severity: 'warning', node: 'a' });
    expect(finding.message).toMatch(/wraps to \d+ lines/);
  });

  it('leaves text under a clip and invisible text to the clip and opacity', async () => {
    const { plan, prepared } = await fixture([
      { id: 'card', type: 'group', x: 280, y: 20, clip: { type: 'rect', width: 40, height: 40 }, children: [text('clipped')] } as Node,
      text('hidden', { x: 400, opacity: 0 }),
      { id: 'box', type: 'rect', x: 0, y: 0, width: 10, height: 10, fill: '#000000' } as Node,
    ]);
    expect(inspectPlan(plan, prepared).findings).toEqual([]);
  });

  it('notes frames where only the background shows', async () => {
    const { plan, prepared } = await fixture([text('a', { x: 20, y: 20, end: 15 })]);
    const findings = inspectPlan(plan, prepared).findings;
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ code: 'EMPTY_FRAME', severity: 'info', frames: { first: 15, last: 29 } });
  });

  it('prints findings from the CLI and exits 2 under --strict', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'helios-portable-inspect-'));
    const log = console.log, lines: string[] = [];
    const exitCode = process.exitCode;
    try {
      const bytes = await readFile(fontPath);
      await writeFile(join(dir, digest(bytes)), bytes);
      const file = join(dir, 'plan.json');
      await writeFile(file, JSON.stringify({ version: 'portable-v1', width: 320, height: 180, fps: { num: 30, den: 1 }, frameCount: 30, background: '#ffffff', assets: { sans: { type: 'font', bytes: bytes.length, sha256: digest(bytes) } }, nodes: [text('a', { x: 300, y: 20 })] }));
      console.log = (line: string) => { lines.push(line); };
      await runCli(['inspect', file, '--assets', dir, '--every', '0.5']);
      const report = JSON.parse(lines[0]);
      expect(report).toMatchObject({ profile: 'portable-v1', frames: 30, every: 0.5, findings: [{ code: 'TEXT_CLIPPED', node: 'a' }] });
      expect(process.exitCode).toBe(exitCode);
      await runCli(['inspect', file, '--assets', dir, '--strict']);
      expect(process.exitCode).toBe(2);
      await expect(runCli(['render', file, '--assets', dir, '--every', '1'])).rejects.toThrow(/Unknown/);
    } finally {
      console.log = log; process.exitCode = exitCode;
      await rm(dir, { recursive: true, force: true });
    }
  });
});
