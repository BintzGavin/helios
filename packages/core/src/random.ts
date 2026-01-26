/**
 * Hashes a string into a 32-bit integer using a simple DJB2-like algorithm.
 * This is sufficient for seeding a PRNG.
 */
function hashString(str: string): number {
  let hash = 5381;
  let i = str.length;

  while(i) {
    hash = (hash * 33) ^ str.charCodeAt(--i);
  }

  // Force to 32-bit unsigned integer
  return hash >>> 0;
}

/**
 * Mulberry32 is a fast, high-quality 32-bit pseudo-random number generator.
 * It has a period of approx 4 billion.
 */
function mulberry32(a: number) {
    let t = a + 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
}

/**
 * Generates a deterministic random number between 0 (inclusive) and 1 (exclusive) based on a seed.
 *
 * Ideally, this function is stateless: passing the same seed always returns the same value.
 * To generate a sequence of random numbers, you should vary the seed (e.g. `random(seed + index)`).
 *
 * @param seed A number or string to seed the generator.
 * @returns A number between 0 (inclusive) and 1 (exclusive).
 */
export function random(seed: number | string): number {
  const seedNum = typeof seed === 'string' ? hashString(seed) : seed;
  return mulberry32(seedNum);
}
