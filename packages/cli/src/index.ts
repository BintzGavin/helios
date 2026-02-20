import { Command } from 'commander';
import { registerStudioCommand } from './commands/studio.js';
import { registerInitCommand } from './commands/init.js';
import { registerAddCommand } from './commands/add.js';
import { registerComponentsCommand } from './commands/components.js';
import { registerRenderCommand } from './commands/render.js';
import { registerMergeCommand } from './commands/merge.js';
import { registerListCommand } from './commands/list.js';
import { registerRemoveCommand } from './commands/remove.js';
import { registerUpdateCommand } from './commands/update.js';
import { registerBuildCommand } from './commands/build.js';
import { registerPreviewCommand } from './commands/preview.js';
import { registerJobCommand } from './commands/job.js';
import { registerSkillsCommand } from './commands/skills.js';
import { registerDiffCommand } from './commands/diff.js';
import { registerDeployCommand } from './commands/deploy.js';

const program = new Command();

program
  .name('helios')
  .description('Helios CLI')
  .version('0.27.0');

registerStudioCommand(program);
registerInitCommand(program);
registerAddCommand(program);
registerComponentsCommand(program);
registerRenderCommand(program);
registerMergeCommand(program);
registerListCommand(program);
registerRemoveCommand(program);
registerUpdateCommand(program);
registerBuildCommand(program);
registerPreviewCommand(program);
registerJobCommand(program);
registerSkillsCommand(program);
registerDiffCommand(program);
registerDeployCommand(program);

program.parse(process.argv);
