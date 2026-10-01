import hashlib
import json
import pathlib
from common import ROOT, PACKAGE, EVIDENCE, PIN, FONT_SHA256, run, input_options, binary, font
from qualification import validate_comparison, validate_oracle
from retention import write_archive

options = input_options()
paired = EVIDENCE / 'paired'
comparison = json.loads((paired / 'results.json').read_text())
validate_comparison(comparison, options)
qualified = []
seeds = {}
for output in comparison['results']:
    video = pathlib.Path(output['video'])
    checksum = hashlib.sha256()
    with video.open('rb') as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b''):
            checksum.update(chunk)
    digest = checksum.hexdigest()
    group = (output['engine'], output['preset'])
    if group not in seeds or seeds[group]['sha256'] != digest:
        directory = EVIDENCE / ('quality-' + output['engine'] + '-' + output['preset'] + '-' + str(output['round']))
        args = ['node', '--import', 'tsx', 'benchmarks/fframes-quality.ts', '--video', str(video), '--out', str(directory)]
        args += ['--font', font()] if output['engine'] == 'helios' else ['--fframes-bin', binary()]
        run(args, directory.name, cwd=PACKAGE)
        oracle = json.loads((directory / 'quality.json').read_text())
        validate_oracle(oracle)
        seeds[group] = {'sha256': digest, 'oracle': oracle}
    verified = output['verified']
    if verified['frameCount'] != 300 or verified['width'] != 1920 or verified['height'] != 1080:
        raise RuntimeError('Output completeness failed')
    qualified.append({'engine': group[0], 'preset': group[1], 'round': output['round'], 'videoSha256': digest, 'quality': seeds[group]['oracle']})
report = {'status': 'qualified', 'sourcePin': PIN, 'fontSha256': FONT_SHA256, 'workload': {'frames': 300, 'width': 1920, 'height': 1080, 'fps': 30}, 'qualifiedOutputs': len(qualified), 'outputs': qualified, 'workers': options['workers'], 'encoderThreads': options['encoderThreads'], 'repeats': options['repeats'], 'comparison': comparison}
report['evidenceRetention'] = options.get('evidenceRetention', 'full')
(ROOT / 'qualification.json').write_text(json.dumps(report, indent=2))
write_archive(ROOT, PACKAGE, EVIDENCE, report['evidenceRetention'])

checksum = hashlib.sha256()
archive_path = ROOT / 'evidence.tar.gz'
with archive_path.open('rb') as source:
    for chunk in iter(lambda: source.read(1024 * 1024), b''):
        checksum.update(chunk)
report['evidenceArchive'] = {'bytes': archive_path.stat().st_size, 'sha256': checksum.hexdigest()}
(ROOT / 'qualification.json').write_text(json.dumps(report, indent=2))
