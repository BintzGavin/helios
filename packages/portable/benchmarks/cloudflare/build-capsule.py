"""Stage explicit, non-secret benchmark sources outside the repository."""
import argparse
import hashlib
import json
import pathlib
import shutil
import tarfile

parser = argparse.ArgumentParser()
parser.add_argument('--out', required=True)
parser.add_argument('--cargo-lock', required=True)
args = parser.parse_args()
project = pathlib.Path(__file__).resolve().parents[4]
portable = project / 'packages/portable'
stage = pathlib.Path(args.out).resolve()
if stage == project or project in stage.parents:
    raise ValueError('Capsule staging must be outside the repository')
package = stage / 'packages/portable'
package.mkdir(parents=True, exist_ok=True)
for folder in ['src', 'benchmarks']:
    for path in (portable / folder).rglob('*'):
        if path.is_file() and path.suffix in ('.ts', '.mjs', '.py', '.json', '.txt', '.md') and '__pycache__' not in path.parts:
            destination = package / path.relative_to(portable)
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(path, destination)
for name in ['tsconfig.json', 'LICENSE']:
    shutil.copyfile(project / name, stage / name)
shutil.copyfile(portable / 'tsconfig.json', package / 'tsconfig.json')
manifest = json.loads((portable / 'package.json').read_text())
manifest['devDependencies'] = {'typescript': '5.9.3', 'tsx': '4.21.0', '@types/node': '24.0.0'}
(package / 'package.json').write_text(json.dumps(manifest, indent=2) + '\n')
shutil.copyfile(args.cargo_lock, stage / 'fframes-cpu.lock')
(stage / 'protocol-version.json').write_text(json.dumps({'checkpointedRounds': True, 'compactRetention': True}, indent=2))
for filename in ['common.py', 'prepare.py', 'compare.py', 'qualify.py', 'qualification.py', 'retention.py']:
    shutil.copyfile(portable / 'benchmarks/cloudflare' / filename, stage / filename)
print('Explicit benchmark source capsule staged; generate its public npm lock before archiving.')
