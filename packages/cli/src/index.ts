import { Command } from 'commander';
import { registerStudioCommand } from './commands/studio.js';
import { registerInitCommand } from './commands/init.js';
import { registerAddCommand } from './commands/add.js';

const program = new Command();

program
  .name('helios')
  .description('Helios CLI')
  .version('0.0.1');

registerStudioCommand(program);
registerInitCommand(program);
registerAddCommand(program);

program.parse(process.argv);
