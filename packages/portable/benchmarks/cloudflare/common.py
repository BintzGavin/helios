"""Fixed commands and non-secret resource evidence for the scheduler benchmark."""
import json
import pathlib
import subprocess
import time

ROOT = pathlib.Path('/workspace/helios-cpu')
PACKAGE = ROOT / 'packages/portable'
EVIDENCE = ROOT / 'evidence'
PIN = 'bacfc3c3212d3d9429468435bfdc1ae2a21c7b3b'
FONT_SHA256 = '9ae2da663d64342031e59b5fa680dd355171d021b7ebf83774efc7c0330ae7b5'


def run(args, label, cwd=ROOT, timeout=3300):
    EVIDENCE.mkdir(exist_ok=True)
    started = time.monotonic()
    with (EVIDENCE / (label + '.stdout.log')).open('wb') as stdout, (EVIDENCE / (label + '.stderr.log')).open('wb') as stderr:
        result = subprocess.run(args, cwd=cwd, stdout=stdout, stderr=stderr, timeout=timeout, check=False)
    record = {'exitStatus': result.returncode, 'seconds': time.monotonic() - started}
    (EVIDENCE / (label + '.exit.json')).write_text(json.dumps(record, indent=2))
    if result.returncode:
        raise RuntimeError(label + ' failed; phase logs retained in isolated benchmark evidence')
    return record


def input_options():
    options = json.loads((ROOT / 'input.json').read_text())
    if type(options['workers']) is not int or not 1 <= options['workers'] <= 4:
        raise ValueError('Invalid workers')
    if type(options['encoderThreads']) is not int or not 1 <= options['encoderThreads'] <= 2:
        raise ValueError('Invalid encoder threads')
    if type(options['repeats']) is not int or not 1 <= options['repeats'] <= 5:
        raise ValueError('Invalid repeats')
    if options.get('evidenceRetention', 'full') not in ('full', 'compact'):
        raise ValueError('Invalid evidence retention')
    return options


def binary():
    return str(EVIDENCE / 'cargo-target/release/helios-fframes-cpu-comparison')


def font():
    return str(ROOT / 'fframes/render-bench/vs-remotion/fframes/media/DMSans-Regular.ttf')
