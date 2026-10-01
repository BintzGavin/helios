import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const source = fileURLToPath(new URL('../benchmarks/cloudflare/compare.py', import.meta.url));
function rounds(mutation = '') {
  return JSON.parse(execFileSync('/usr/bin/python3', ['-c', `
import json, pathlib, runpy, sys, tempfile, types
sys.dont_write_bytecode = True
source, mutation = sys.argv[1:]
with tempfile.TemporaryDirectory() as directory:
    root = pathlib.Path(directory)
    commands = []
    common = types.ModuleType('common')
    common.PACKAGE = root
    common.EVIDENCE = root
    common.input_options = lambda: {'workers': 2, 'encoderThreads': 1, 'repeats': 3}
    common.binary = lambda: '/fixture/fframes'
    common.font = lambda: '/fixture/font.ttf'
    def run(args, label, cwd):
        commands.append(args)
        index = int(args[args.index('--round-start') + 1])
        out = pathlib.Path(args[args.index('--out') + 1]); out.mkdir()
        report = {'host': {'cpu': 'fixed'}, 'workers': 2, 'repeats': 1,
                  'results': [{'round': index, 'engine': engine, 'preset': preset, 'comparableProcessMs': 100 + index}
                              for preset in ['medium', 'ultrafast'] for engine in ['helios', 'fframes']]}
        if index == 1:
            if mutation == 'duplicate': report['results'][1] = report['results'][0]
            if mutation == 'missing': report['results'].pop()
            if mutation == 'wrong-round': report['results'][0]['round'] = 0
            if mutation == 'host': report['host']['cpu'] = 'changed'
            if mutation == 'missing-host': del report['host']
        (out / 'results.json').write_text(json.dumps(report))
        (root / (label + '.exit.json')).write_text(json.dumps({'exitStatus': 0, 'seconds': index + 1}))
    common.run = run
    sys.modules['common'] = common
    for index in range(3):
        sys.argv = [source, str(index)]
        runpy.run_path(source, run_name='__main__')
    print(json.dumps({'report': json.loads((root / 'paired/results.json').read_text()),
                      'receipt': json.loads((root / 'paired-rendering.exit.json').read_text()), 'commands': commands}))
`, source, mutation], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
}

describe('checkpointed paired rounds', () => {
  it('preserves all rounds and timings while dispatching one original round per command', () => {
    const result = rounds();
    expect(result.report.repeats).toBe(3);
    expect(result.report.results.map((row: any) => row.round)).toEqual([0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2]);
    expect(result.report.results.map((row: any) => row.comparableProcessMs)).toEqual([100, 100, 100, 100, 101, 101, 101, 101, 102, 102, 102, 102]);
    expect(result.receipt).toEqual({ exitStatus: 0, seconds: 6 });
    for (const [index, command] of result.commands.entries()) {
      expect(command[command.indexOf('--repeats') + 1]).toBe('1');
      expect(command[command.indexOf('--round-start') + 1]).toBe(String(index));
    }
  });
  it.each(['duplicate', 'missing', 'wrong-round', 'host', 'missing-host'])('rejects %s evidence before accepting later rounds', mutation => {
    expect(() => rounds(mutation)).toThrow();
  });
});
