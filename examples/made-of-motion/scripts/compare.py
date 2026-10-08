#!/usr/bin/env python3
"""Compare Helios stills of this film with fframes reference frames, pixel by pixel.

    python3 scripts/compare.py <fframes-frames-dir> <helios-stills-dir> [--heatmaps <dir>]

The fframes directory holds `<frame>.png` (from `made-of-motion frame ...`); the Helios
directory holds `still-<seconds>s.png` (from `helios still`) or `<frame>.png`. Prints, per
frame, the largest channel difference, mean difference, PSNR and the share of identical
pixels, then a summary. Needs Pillow and NumPy.
"""
import argparse
import math
import os
import re

import numpy as np
from PIL import Image

FPS = 24


def frame_of(name):
    m = re.match(r'still-([\d.]+)s\.png$', name)
    if m:
        return round(float(m.group(1)) * FPS)
    m = re.match(r'(\d+)\.png$', name)
    return int(m.group(1)) if m else None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('reference')
    parser.add_argument('helios')
    parser.add_argument('--heatmaps', help='write difference heatmaps (x16) here')
    args = parser.parse_args()

    rows = []
    for name in os.listdir(args.helios):
        n = frame_of(name)
        ref = os.path.join(args.reference, f'{n}.png')
        if n is None or not os.path.exists(ref):
            continue
        a = np.asarray(Image.open(ref).convert('RGB'), dtype=np.int16)
        b = np.asarray(Image.open(os.path.join(args.helios, name)).convert('RGB'), dtype=np.int16)
        d = np.abs(a - b)
        per_pixel = d.max(axis=2)
        mse = float((d.astype(np.float64) ** 2).mean())
        psnr = math.inf if mse == 0 else 10 * math.log10(255 ** 2 / mse)
        rows.append((n, int(d.max()), float(d.mean()), psnr, float((per_pixel == 0).mean() * 100),
                     int((per_pixel > 0).sum())))
        if args.heatmaps:
            os.makedirs(args.heatmaps, exist_ok=True)
            Image.fromarray(np.clip(per_pixel * 16, 0, 255).astype(np.uint8)).save(
                os.path.join(args.heatmaps, f'{n}.png'))

    rows.sort()
    print(f"{'frame':>5} {'max':>4} {'mean':>8} {'psnr':>7} {'exact %':>8} {'px differ':>9}")
    for n, mx, mean, psnr, exact, count in rows:
        print(f'{n:>5} {mx:>4} {mean:>8.4f} {psnr:>7.2f} {exact:>8.3f} {count:>9}')
    if not rows:
        return
    identical = sum(1 for r in rows if r[1] == 0)
    total_px = sum(r[5] for r in rows)
    print(f'\n{len(rows)} frames compared, {identical} bit-identical; '
          f'{total_px} differing pixels in all ({total_px / (len(rows) * 1440 * 1080) * 100:.4f}%), '
          f'largest difference {max(r[1] for r in rows)}')


if __name__ == '__main__':
    main()
