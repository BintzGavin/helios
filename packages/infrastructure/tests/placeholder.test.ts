import { describe, it, expect } from 'vitest';
import { INFRASTRUCTURE_VERSION, initInfrastructure } from '../src/index.js';

describe('Infrastructure Package', () => {
  it('should export version', () => {
    expect(INFRASTRUCTURE_VERSION).toBe('0.13.0');
  });

  it('should initialize without error', () => {
    expect(() => initInfrastructure()).not.toThrow();
  });
});
