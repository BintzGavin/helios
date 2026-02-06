import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function registerSkillsCommand(program: Command) {
  const skillsCommand = program.command('skills')
    .description('Manage Helios AI agent skills');

  skillsCommand
    .command('install')
    .description('Install Helios AI agent skills into the current project')
    .action(async () => {
      try {
        // Resolve source path: dist/commands/skills.js -> dist/skills
        const sourcePath = path.resolve(__dirname, '../skills');

        // Resolve target path: CWD/.agents/skills/helios
        const targetPath = path.resolve(process.cwd(), '.agents/skills/helios');

        if (!fs.existsSync(sourcePath)) {
          console.error(chalk.red(`Error: Skills directory not found at ${sourcePath}`));
          console.error(chalk.yellow('Make sure you have built the CLI package correctly.'));
          process.exit(1);
        }

        console.log(chalk.blue(`Installing skills to ${targetPath}...`));

        // Create target directory if it doesn't exist
        if (!fs.existsSync(targetPath)) {
          fs.mkdirSync(targetPath, { recursive: true });
        }

        // Recursive copy
        fs.cpSync(sourcePath, targetPath, { recursive: true });

        console.log(chalk.green('Skills installed successfully!'));
        console.log(chalk.dim('You can now use these skills with your AI agent.'));

      } catch (error: any) {
        console.error(chalk.red('Failed to install skills:'), error.message);
        process.exit(1);
      }
    });
}
