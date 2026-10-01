import { expect, it } from 'vitest';
import { drawTextGrid, hslToRgb, TEXT_GRID } from '../benchmarks/fframes-textgrid.mjs';

it('matches the full fframes workload including every changing label and attribute', () => {
  expect(TEXT_GRID).toMatchObject({ nodes: 3334, frames: 300, width: 1920, height: 1080, fps: 30 });
  for (const frame of [0, 1, 150, 299]) {
    const calls: any[] = [];
    const ctx: any = { fillText(label: string, x: number, y: number) { calls.push({ label, x, y, alpha: this.globalAlpha, color: this.fillStyle }); } };
    drawTextGrid(ctx, { index: frame, fonts: { dm: 'DM Sans' } });
    expect(ctx.font).toBe('10px DM Sans'); expect(ctx.textBaseline).toBe('alphabetic');
    expect(calls).toHaveLength(3334);
    for (const i of [0, 8, 46, 47, 1001, 3333]) {
      expect(calls[i].label).toBe((frame + i) % 9 === 0 ? 'fframes' : String((frame * 37 + i * 101) % 10000));
      expect(calls[i].x).toBeCloseTo((i % 47) * (1920 / 47) + 2 + Math.sin(frame * 0.12 + i * 0.37) * 4, 10);
      expect(calls[i].y).toBeCloseTo(Math.floor(i / 47) * (1080 / 71) + 11 + Math.cos(frame * 0.09 + i * 0.23) * 3, 10);
      expect(calls[i].alpha).toBe(Number((0.65 + Math.sin(frame * 0.2 + i * 0.05) * 0.35).toFixed(3)));
      expect(calls[i].color).toMatch(/^#[0-9a-f]{6}$/);
    }
    if (frame === 0) expect(calls[0]).toEqual({ label: 'fframes', x: 2, y: 14, alpha: 0.65, color: '#e75555' });
    if (frame === 299) expect(calls[3333].label).toBe('7696');
  }
  expect(hslToRgb(0)).toBe('#e75555'); expect(hslToRgb(120)).toBe('#55e755'); expect(hslToRgb(240)).toBe('#5555e7');
});
