"""Archive qualified benchmark records without deleting their source evidence."""
import json
import tarfile


def write_archive(root, package, evidence, mode='full'):
    if mode not in ('full', 'compact'):
        raise ValueError('Invalid evidence retention')
    report = json.loads((root / 'qualification.json').read_text())
    if report.get('status') != 'qualified' or report.get('evidenceRetention') != mode:
        raise ValueError('Qualified retention report required')
    with tarfile.open(root / 'evidence.tar.gz', 'w:gz') as archive:
        for path, name in [(root / 'qualification.json', 'qualification.json'),
                           (root / 'source-manifest.json', 'source-manifest.json'),
                           (root / 'fframes-cpu.lock', 'fframes-cpu.lock'),
                           (package / 'package-lock.json', 'package-lock.json')]:
            archive.add(path, arcname=name)
        for path in sorted(evidence.rglob('*')):
            if not path.is_file() or 'cargo-target' in path.parts or 'fframes-cpu' in path.parts:
                continue
            if path.suffix == '.mp4' and (mode == 'compact' or '-0-' not in path.name):
                continue
            if path.suffix not in ('.json', '.txt', '.lock', '.mp4'):
                continue
            archive.add(path, arcname=str(path.relative_to(root)))
