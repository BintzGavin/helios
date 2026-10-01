import { Command } from 'commander';
import { registerMcpCommand } from './commands/mcp.js';

const program = new Command();

program
  .name('helios')
  .description('Helios CLI')
  .version('0.45.2');

// AI hosts give `helios mcp` about two seconds to answer before they drop it, and loading the
// other commands (job, studio, render...) takes ten times longer than the MCP server itself.
if (process.argv[2] !== 'mcp') {
  const [
    { registerStudioCommand },
    { registerInitCommand },
    { registerAddCommand },
    { registerComponentsCommand },
    { registerRenderCommand },
    { registerFrameCommands },
    { registerMergeCommand },
    { registerListCommand },
    { registerRemoveCommand },
    { registerUpdateCommand },
    { registerBuildCommand },
    { registerPreviewCommand },
    { registerJobCommand },
    { registerSkillsCommand },
    { registerDiffCommand },
    { registerDeployCommand },
  ] = await Promise.all([
    import('./commands/studio.js'),
    import('./commands/init.js'),
    import('./commands/add.js'),
    import('./commands/components.js'),
    import('./commands/render.js'),
    import('./commands/frames.js'),
    import('./commands/merge.js'),
    import('./commands/list.js'),
    import('./commands/remove.js'),
    import('./commands/update.js'),
    import('./commands/build.js'),
    import('./commands/preview.js'),
    import('./commands/job.js'),
    import('./commands/skills.js'),
    import('./commands/diff.js'),
    import('./commands/deploy.js'),
  ]);

  registerStudioCommand(program);
  registerInitCommand(program);
  registerAddCommand(program);
  registerComponentsCommand(program);
  registerRenderCommand(program);
  registerFrameCommands(program);
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
}
registerMcpCommand(program);

program.parse(process.argv);
