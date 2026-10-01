import { describe, expect, it } from 'vitest';
import { parsePlan, evaluate, frameTime, sampleCount } from '../src/plan.js';

export const simplePlan = () => ({
  version: 'portable-v1', width: 320, height: 180,
  fps: { num: 30, den: 1 }, frameCount: 60, background: '#ffffff', assets: {},
  nodes: [{ id: 'box', type: 'rect', x: { keyframes: [{ frame: 0, value: 0 }, { frame: 30, value: 100 }] }, y: 20, width: 40, height: 40, fill: '#3770ff' }],
  audio: [],
});

describe('portable input contract', () => {
  it('evaluates time from a frame without replay or floating-point frame counts', () => {
    const plan = parsePlan(simplePlan());
    expect(evaluate(plan.nodes[0].x!, 15)).toBe(50);
    expect(evaluate(plan.nodes[0].x!, 59)).toBe(100);
    expect(frameTime({ num: 30000, den: 1001 }, 1798)).toBeCloseTo(59.9932666667);
    expect(sampleCount({ num: 30000, den: 1001 }, 1798)).toBe(2879677);
  });
  it.each([
    ['unknown properties', { blur: 2 }],
    ['arbitrary callbacks', { render: 'document.body.innerHTML' }],
    ['invalid frame count', { frameCount: 1.5 }],
    ['unbounded resolution', { width: 20000 }],
    ['invalid cadence', { fps: { num: 0, den: 1 } }],
  ])('rejects %s before dispatch', (_, patch) => {
    expect(() => parsePlan({ ...simplePlan(), ...patch })).toThrow();
  });
  it('names the unsupported node property', () => {
    const plan = simplePlan();
    Object.assign(plan.nodes[0], { filter: 'blur(4px)' });
    expect(() => parsePlan(plan)).toThrow(/nodes.*filter/);
  });
  it('rejects missing asset references and duplicate node identities', () => {
    const plan: any = simplePlan();
    plan.nodes.push({ id: 'image', type: 'image', asset: 'missing', width: 50, height: 50 });
    expect(() => parsePlan(plan)).toThrow(/asset/);
    plan.nodes = [plan.nodes[0], plan.nodes[0]];
    expect(() => parsePlan(plan)).toThrow(/duplicate/i);
  });
  it('rejects recursive and excessive input before evaluating it', () => {
    const plan: any = simplePlan();
    plan.nodes[0] = { id: 'cycle', type: 'group', children: [] };
    plan.nodes[0].children.push(plan.nodes[0]);
    expect(() => parsePlan(plan)).toThrow();
  });
  it('supports hold and easing tracks and rejects unordered/NaN keys', () => {
    expect(evaluate({ keyframes: [{ frame: 0, value: 2, easing: 'hold' }, { frame: 10, value: 8 }] }, 5)).toBe(2);
    const plan: any = simplePlan();
    plan.nodes[0].x.keyframes[1].frame = 0;
    expect(() => parsePlan(plan)).toThrow();
    plan.nodes[0].x = Number.NaN;
    expect(() => parsePlan(plan)).toThrow();
  });
});
