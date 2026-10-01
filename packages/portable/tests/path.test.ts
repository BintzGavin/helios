import { expect, it } from 'vitest';
import { parsePlan } from '../src/plan.js';
const plan = (d: string) => ({ version: 'portable-v1', width: 160, height: 90, fps: { num: 30, den: 1 }, frameCount: 2, nodes: [{ type: 'path', id: 'p', d }] });
it('rejects malformed path commands and unbounded coordinates', () => {
  for (const d of ['M 1', 'L 1 2', 'M 0 0 C 1 2', 'M 1e99 2', 'M0 0 A3 3 0 9 9 4 4']) expect(() => parsePlan(plan(d))).toThrow();
  expect(() => parsePlan(plan('M0 0 L10 10 A3 3 0 0 1 4 4 Z'))).not.toThrow();
});
