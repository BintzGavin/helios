import { describe, it, expect } from 'vitest';
import { random } from './random';

describe('random', () => {
  it('should be deterministic', () => {
    expect(random(123)).toBe(random(123));
    expect(random('abc')).toBe(random('abc'));
    expect(random(123.456)).toBe(random(123.456));
  });

  it('should produce different values for different seeds', () => {
    expect(random(1)).not.toBe(random(2));
    expect(random('a')).not.toBe(random('b'));
    expect(random(123)).not.toBe(random('123')); // Type matters (number vs string hash) unless hash collision occurs
  });

  it('should return value in range [0, 1)', () => {
    for (let i = 0; i < 1000; i++) {
        const val = random(i);
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
    }
  });

  it('should handle edge cases', () => {
     expect(random(0)).toBeDefined();
     expect(random(-1)).toBeDefined();
     expect(random('')).toBeDefined();

     // Ensure no NaN
     expect(random(0)).not.toBeNaN();
     expect(random(-1)).not.toBeNaN();
     expect(random('')).not.toBeNaN();
  });

  it('should have good distribution (basic check)', () => {
      // Check that it's not always returning small numbers or large numbers
      const samples = 1000;
      let sum = 0;
      for(let i=0; i<samples; i++) {
          sum += random(i);
      }
      const avg = sum / samples;
      // Should be around 0.5
      expect(avg).toBeGreaterThan(0.4);
      expect(avg).toBeLessThan(0.6);
  });
});
