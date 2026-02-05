export const RANDOM_SEED_SCRIPT = `
  (function() {
    // Mulberry32 seeded random number generator
    // Seed: 0x12345678 (Fixed constant)
    let seed = 0x12345678;

    Math.random = function() {
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    console.log('[Helios] Math.random() has been seeded for deterministic rendering.');
  })();
`;
