import { bench, describe } from 'vitest';
import { parseCommand } from '../../src/utils/command.js';

describe('parseCommand benchmarks', () => {
  bench('parseCommand - simple', () => {
    parseCommand('npm run build');
  });

  bench('parseCommand - quotes', () => {
    parseCommand('render --title "My Video"');
  });

  bench('parseCommand - escaped quotes', () => {
    parseCommand('render --title "My \\"Awesome\\" Video"');
  });
});
