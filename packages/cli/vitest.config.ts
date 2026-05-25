import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    deps: {
      interopDefault: true,
      inline: [
        /@helios-project\/infrastructure/,
        /@helios-project\/renderer/
      ]
    }
  },
});
