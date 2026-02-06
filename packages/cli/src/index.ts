import { Command } from 'commander';
import { registerStudioCommand } from './commands/studio.js';
import { registerInitCommand } from './commands/init.js';
import { registerAddCommand } from './commands/add.js';
import { registerComponentsCommand } from './commands/components.js';
import { registerRenderCommand } from './commands/render.js';
import { registerMergeCommand } from './commands/merge.js';
import { registerListCommand } from './commands/list.js';
import { registerRemoveCommand } from './commands/remove.js';

const program = new Command();

program
  .name('helios')
  .description('Helios CLI')
  .version('0.11.0');

registerStudioCommand(program);
registerInitCommand(program);
registerAddCommand(program);
registerComponentsCommand(program);
registerRenderCommand(program);
registerMergeCommand(program);
registerListCommand(program);
registerRemoveCommand(program);

program.parse(process.argv);
