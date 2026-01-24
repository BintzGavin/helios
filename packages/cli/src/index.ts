import { Command } from 'commander';
import { registerStudioCommand } from './commands/studio.js';

const program = new Command();

program
  .name('helios')
  .description('Helios CLI')
  .version('0.0.1');

registerStudioCommand(program);

program.parse(process.argv);
