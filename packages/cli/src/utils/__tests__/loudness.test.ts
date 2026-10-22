import { describe, it, expect } from 'vitest';
import { parseLoudness, loudnessWarnings } from '../loudness.js';

// The summary as FFmpeg 4.1 and 6.1 print it, after the per-100 ms lines.
const SUMMARY = `[Parsed_ebur128_0 @ 0x55] t: 2.9      TARGET:-23 LUFS    M: -21.8 S: -21.8     I: -21.8 LUFS       LRA:  20.0 LU  FTPK: -17.7 dBFS  TPK: -17.7 dBFS
size=N/A time=00:00:03.01 bitrate=N/A speed= 203x
[Parsed_ebur128_0 @ 0x55] Summary:

  Integrated loudness:
    I:         -14.2 LUFS
    Threshold: -24.2 LUFS

  Loudness range:
    LRA:         6.5 LU
    Threshold: -34.2 LUFS
    LRA low:   -18.0 LUFS
    LRA high:  -12.0 LUFS

  True peak:
    Peak:       -1.6 dBFS
`;

const SILENT = `[Parsed_ebur128_0 @ 0x55] Summary:

  Integrated loudness:
    I:         -70.0 LUFS
    Threshold:   0.0 LUFS

  Loudness range:
    LRA:         0.0 LU
    Threshold:   0.0 LUFS
    LRA low:     0.0 LUFS
    LRA high:    0.0 LUFS

  True peak:
    Peak:       -inf dBFS
`;

describe('parseLoudness', () => {
  it('reads the final summary, not the running values', () => {
    expect(parseLoudness(SUMMARY)).toEqual({ integrated: -14.2, range: 6.5, truePeak: -1.6 });
  });

  it('reads silence as -70 LUFS with no peak', () => {
    expect(parseLoudness(SILENT)).toEqual({ integrated: -70, range: 0, truePeak: null });
  });

  it('returns null without a summary', () => {
    expect(parseLoudness('Stream map 0:a:0 matches no streams.')).toBeNull();
  });
});

describe('loudnessWarnings', () => {
  it('passes a mix at the platform target with headroom', () => {
    expect(loudnessWarnings({ integrated: -14.2, range: 6.5, truePeak: -1.6 })).toEqual([]);
  });

  it('reports silence alone', () => {
    expect(loudnessWarnings({ integrated: -70, range: 0, truePeak: null })).toEqual([expect.stringMatching(/^The audio track is silent/)]);
  });

  it('reports peaks over -1 dBTP and how far to lower them', () => {
    const [warning] = loudnessWarnings({ integrated: -12, range: 4, truePeak: 0.4 });
    expect(warning).toMatch(/^The audio peaks at 0\.4 dBTP, above -1 dBTP/);
    expect(warning).toMatch(/by at least 1\.4 dB/);
  });

  it('reports a mix far quieter or louder than the target', () => {
    expect(loudnessWarnings({ integrated: -24, range: 3, truePeak: -10 })).toEqual([expect.stringMatching(/^The audio is quiet: -24\.0 LUFS/)]);
    expect(loudnessWarnings({ integrated: -7, range: 3, truePeak: -1.5 })).toEqual([expect.stringMatching(/^The audio is loud: -7\.0 LUFS/)]);
  });
});
