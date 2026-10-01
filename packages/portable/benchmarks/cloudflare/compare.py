import json
import sys
from common import PACKAGE, EVIDENCE, run, input_options, binary, font

options = input_options()
round_index = int(sys.argv[1]) if len(sys.argv) == 2 else None
if len(sys.argv) > 2 or (round_index is not None and not 0 <= round_index < options['repeats']):
    raise ValueError('Invalid paired round')
directory = EVIDENCE / ('paired' if round_index is None else 'paired-round-' + str(round_index))
args = ['node', '--import', 'tsx', 'benchmarks/fframes.ts', '--fframes-bin', binary(), '--font', font(), '--out', str(directory), '--workers', str(options['workers']), '--encoder-threads', str(options['encoderThreads']), '--repeats', str(options['repeats'] if round_index is None else 1), '--crf', '11', '--repair-fframes-edit-list']
if round_index is not None:
    args += ['--round-start', str(round_index)]
run(args, 'paired-rendering' if round_index is None else 'paired-rendering-' + str(round_index), cwd=PACKAGE)
if round_index is not None:
    partial = json.loads((directory / 'results.json').read_text())
    paired = EVIDENCE / 'paired'
    paired.mkdir(exist_ok=True)
    if round_index == 0:
        merged = {**partial, 'repeats': options['repeats'], 'results': []}
    else:
        merged = json.loads((paired / 'results.json').read_text())
        if set(partial) != set(merged):
            raise ValueError('Paired round changed provenance fields')
        for key in partial:
            if key not in ['results', 'repeats'] and partial[key] != merged[key]:
                raise ValueError('Paired round changed hardware or settings')
    if len(partial['results']) != 4 or any(row['round'] != round_index for row in partial['results']) or len(merged['results']) != 4 * round_index:
        raise ValueError('Missing or duplicated paired round')
    expected = {(engine, preset) for engine in ['helios', 'fframes'] for preset in ['medium', 'ultrafast']}
    if {(row['engine'], row['preset']) for row in partial['results']} != expected:
        raise ValueError('Missing or duplicated paired output')
    merged['results'] += partial['results']
    (paired / 'results.json').write_text(json.dumps(merged, indent=2))
    if round_index == options['repeats'] - 1:
        seconds = sum(json.loads((EVIDENCE / ('paired-rendering-' + str(index) + '.exit.json')).read_text())['seconds'] for index in range(options['repeats']))
        (EVIDENCE / 'paired-rendering.exit.json').write_text(json.dumps({'exitStatus': 0, 'seconds': seconds}))
