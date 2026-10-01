"""Fail-closed evidence validation shared by remote publication and local verification."""
import json
import math
import sys

PIN = 'bacfc3c3212d3d9429468435bfdc1ae2a21c7b3b'
FONT = '9ae2da663d64342031e59b5fa680dd355171d021b7ebf83774efc7c0330ae7b5'


def require(condition, message):
    if not condition:
        raise ValueError(message)


def positive(value):
    return type(value) in (int, float) and math.isfinite(value) and value > 0


def validate_comparison(comparison, options):
    require(comparison['pin'] == PIN and comparison['fontSha256'] == FONT, 'Provenance mismatch')
    require(comparison['crf'] == 11 and comparison['conversion'] == 'rgb-bt601', 'Encoding protocol mismatch')
    workload = comparison['workload']
    require(all(workload[key] == value for key, value in {'frames': 300, 'width': 1920, 'height': 1080, 'fps': 30, 'nodes': 3334}.items()), 'Workload mismatch')
    require(comparison['workers'] == comparison['fframesWorkers'] == options['workers'], 'CPU budget mismatch')
    require(comparison['encoderThreads'] == comparison['fframesEncoderThreads'] == options['encoderThreads'], 'CPU budget mismatch')
    require(comparison['repeats'] == options['repeats'], 'Repetition count mismatch')
    expected = {(engine, preset, round_index) for engine in ['helios', 'fframes'] for preset in ['medium', 'ultrafast'] for round_index in range(options['repeats'])}
    rows = comparison['results']
    require(len(rows) == len(expected) and {(row['engine'], row['preset'], row['round']) for row in rows} == expected, 'Missing or duplicate paired output')
    encoders = {}
    for row in rows:
        require(row['code'] == 0 and positive(row['comparableProcessMs']) and positive(row['verifiedServiceMs']), 'Invalid process result')
        info = row['verified']
        require(info['frameCount'] == 300 and info['width'] == 1920 and info['height'] == 1080 and info['codec'] == 'h264', 'Incomplete video')
        require(positive(info['fps']['den']) and info['fps']['num'] / info['fps']['den'] == 30 and abs(info['duration'] - 10) <= 1 / 30, 'Incomplete cadence')
        encoder = row['encoding']
        require(isinstance(encoder['version'], str) and bool(encoder['version']), 'Missing encoder build')
        parameters = {'threads': options['encoderThreads'], 'bframes': 0 if row['preset'] == 'ultrafast' else 3, 'keyint': 24, 'crf': 11, 'qpmin': 15, 'qpmax': 60, 'qcomp': 0.6, 'qpstep': 4, 'scenecut': 0 if row['preset'] == 'ultrafast' else 40}
        require(all(encoder['parameters'].get(key) == value for key, value in parameters.items()), 'Encoder parameters mismatch')
        pair = (row['preset'], row['round'])
        if pair in encoders:
            require(encoders[pair] == encoder, 'Paired encoder build or parameters mismatch')
        else:
            encoders[pair] = encoder


def validate_oracle(oracle):
    require(oracle['passed'] is True and oracle['frames'] == 300 and oracle['psnrFrames'] == 300, 'Incomplete quality evidence')
    for key, threshold in {'minSsimY': 0.995, 'minPsnrY': 40, 'minPsnrU': 35, 'minPsnrV': 35}.items():
        require(positive(oracle[key]) and oracle[key] >= threshold, 'Codec quality threshold failed')


if __name__ == '__main__':
    payload = json.load(sys.stdin)
    validate_comparison(payload['comparison'], payload['options'])
    validate_oracle(payload['oracle'])
    print('qualified')
