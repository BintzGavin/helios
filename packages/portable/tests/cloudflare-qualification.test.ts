import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const validator = fileURLToPath(new URL('../benchmarks/cloudflare/qualification.py', import.meta.url));
function fixture() {
  const options = { workers: 2, encoderThreads: 1, repeats: 1 };
  const comparison = {
    pin: 'bacfc3c3212d3d9429468435bfdc1ae2a21c7b3b',
    fontSha256: '9ae2da663d64342031e59b5fa680dd355171d021b7ebf83774efc7c0330ae7b5',
    workload: { frames: 300, width: 1920, height: 1080, fps: 30, nodes: 3334 },
    workers: 2, encoderThreads: 1, fframesWorkers: 2, fframesEncoderThreads: 1, repeats: 1,
    crf: 11, conversion: 'rgb-bt601',
    results: ['medium', 'ultrafast'].flatMap(preset => ['helios', 'fframes'].map(engine => ({
      engine, preset, round: 0, code: 0, comparableProcessMs: 100, verifiedServiceMs: 120,
      verified: { frameCount: 300, width: 1920, height: 1080, fps: { num: 30, den: 1 }, codec: 'h264', duration: 10 },
      encoding: { version: 'x264 - fixed build', parameters: { threads: 1, bframes: preset === 'medium' ? 3 : 0, keyint: 24, crf: 11, qpmin: 15, qpmax: 60, qcomp: 0.6, qpstep: 4, scenecut: preset === 'medium' ? 40 : 0 } },
    }))),
  };
  const oracle = { passed: true, frames: 300, psnrFrames: 300, minSsimY: 0.996, minPsnrY: 41, minPsnrU: 36, minPsnrV: 36 };
  return { options, comparison, oracle };
}
function validate(input: ReturnType<typeof fixture>) {
  return execFileSync('/usr/bin/python3', [validator], { input: JSON.stringify(input), encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

describe('remote paired evidence gate', () => {
  it('accepts both engines and presets with matching budgets and qualified quality', () => {
    expect(validate(fixture())).toBe('qualified');
  });
  it.each([
    ['duplicate result', (f: ReturnType<typeof fixture>) => { f.comparison.results[1] = f.comparison.results[0]; }],
    ['unequal CPU budget', (f: ReturnType<typeof fixture>) => { f.comparison.fframesWorkers = 4; }],
    ['different encoder build', (f: ReturnType<typeof fixture>) => { f.comparison.results[1].encoding.version = 'another build'; }],
    ['different encoder parameters', (f: ReturnType<typeof fixture>) => { f.comparison.results[1].encoding.parameters.crf = 18; }],
    ['altered scene', (f: ReturnType<typeof fixture>) => { f.comparison.workload.nodes = 1; }],
    ['incomplete cadence', (f: ReturnType<typeof fixture>) => { f.comparison.results[0].verified.fps.num = 24; }],
    ['failed process', (f: ReturnType<typeof fixture>) => { f.comparison.results[0].code = 1; }],
    ['invalid timing', (f: ReturnType<typeof fixture>) => { f.comparison.results[0].comparableProcessMs = -1; }],
    ['missing quality frames', (f: ReturnType<typeof fixture>) => { f.oracle.psnrFrames = 299; }],
    ['false quality assertion', (f: ReturnType<typeof fixture>) => { f.oracle.minPsnrY = 39; }],
    ['weak chroma quality', (f: ReturnType<typeof fixture>) => { f.oracle.minPsnrU = 34; }],
  ])('rejects %s even with a claimed quality pass', (_label, mutate) => {
    const f = fixture(); mutate(f); expect(() => validate(f)).toThrow();
  });
});
