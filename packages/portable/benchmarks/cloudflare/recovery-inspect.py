import hashlib
import json
import os
import pathlib
import tarfile
from recovery_validator import validate_comparison, validate_oracle

root = pathlib.Path('/workspace/helios-cpu')
report = json.loads((root / 'qualification.json').read_text())
options = {key: report[key] for key in ['workers', 'encoderThreads', 'repeats']}
validate_comparison(report['comparison'], options)
if report['qualifiedOutputs'] != 4 * options['repeats'] or len(report['outputs']) != report['qualifiedOutputs']:
    raise ValueError('Missing recovery qualification')
for output in report['outputs']:
    validate_oracle(output['quality'])
    matches = [row for row in report['comparison']['results'] if all(row[key] == output[key] for key in ['engine', 'preset', 'round'])]
    if len(matches) != 1:
        raise ValueError('Missing qualified video')
    video = pathlib.Path(matches[0]['video']).resolve()
    if root not in video.parents or not video.is_file():
        raise ValueError('Invalid recovery video')
    checksum = hashlib.sha256()
    with video.open('rb') as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b''):
            checksum.update(chunk)
    if checksum.hexdigest() != output['videoSha256']:
        raise ValueError('Recovery video digest mismatch')

archive = root / 'evidence.tar.gz'
temporary = root / 'recovered-evidence.tar.gz'
with tarfile.open(archive, 'r:gz') as original, tarfile.open(temporary, 'w:gz') as recovered:
    for member in original:
        path = pathlib.PurePosixPath(member.name)
        if path.is_absolute() or '..' in path.parts or not member.isfile():
            raise ValueError('Invalid recovery archive member')
        if path.suffix in ('.json', '.txt', '.lock', '.mp4'):
            recovered.addfile(member, original.extractfile(member))
    for source, name in [(root / 'source-manifest.json', 'source-manifest.json'), (root / 'fframes-cpu.lock', 'fframes-cpu.lock'), (root / 'packages/portable/package-lock.json', 'package-lock.json')]:
        recovered.add(source, arcname=name)
os.replace(temporary, archive)
checksum = hashlib.sha256()
with archive.open('rb') as source:
    for chunk in iter(lambda: source.read(1024 * 1024), b''):
        checksum.update(chunk)
report['evidenceArchive'] = {'bytes': archive.stat().st_size, 'sha256': checksum.hexdigest()}
(root / 'qualification.json').write_text(json.dumps(report, indent=2))
