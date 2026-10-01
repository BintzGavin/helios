"""Wait on the original benchmark process using a Linux pidfd, never environment data."""
import json
import os
import pathlib
import select
import sys

sys.dont_write_bytecode = True
from qualification import validate_comparison

root = pathlib.Path('/workspace/helios-cpu')
receipt = root / 'evidence/paired-rendering.exit.json'
waited = False
if not receipt.exists():
    matches = []
    for process in pathlib.Path('/proc').iterdir():
        if not process.name.isdigit():
            continue
        try:
            if (process / 'comm').read_text().strip() != 'python3':
                continue
            # Inspect only arguments for Python processes in this credential-free benchmark box.
            # No process environment files or values are accessed or emitted.
            arguments = (process / 'cmdline').read_bytes().rstrip(b'\0').split(b'\0')
            if len(arguments) == 2 and arguments[1] == b'/workspace/helios-cpu/compare.py':
                matches.append(int(process.name))
        except (FileNotFoundError, ProcessLookupError):
            pass
    if len(matches) != 1:
        raise ValueError('Original render completion unavailable')
    try:
        handle = os.pidfd_open(matches[0])
    except ProcessLookupError:
        handle = None
    if handle is not None:
        try:
            if not select.select([handle], [], [], 20 * 60)[0]:
                raise TimeoutError('Original render is still running')
            waited = True
        finally:
            os.close(handle)
if not receipt.exists() or receipt.stat().st_size > 4096 or json.loads(receipt.read_text()).get('exitStatus') != 0:
    raise ValueError('Original render did not complete successfully')
options = json.loads((root / 'input.json').read_text())
comparison = json.loads((root / 'evidence/paired/results.json').read_text())
validate_comparison(comparison, options)
(root / 'resume-state.json').write_text(json.dumps({'renderComplete': True, 'outputs': len(comparison['results']), 'blockedOnOriginalProcess': waited}))
