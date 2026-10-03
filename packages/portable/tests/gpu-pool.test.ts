import { expect, it } from 'vitest';
import { validateGpuOptions } from '../src/gpu.js';

it('validates explicit fixed encoder-pool cells without changing the omitted serial default', () => {
  for (const encoderPool of [0, 2, 4, -1, 1.5, NaN]) expect(() => validateGpuOptions({ encoderPool } as any)).toThrow(/pool/);
  if (process.platform === 'darwin' && process.arch === 'arm64') for (const encoderPool of [undefined, 1, 3]) expect(() => validateGpuOptions({ encoderPool } as any)).not.toThrow();
});
