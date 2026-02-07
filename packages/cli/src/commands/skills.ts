import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function registerSkillsCommand(program: Command) {
  const skills = program.command('skills')
    .description('Manage Helios agent skills');

  skills.command('install')
    .description('Install Helios skills into the current project')
    .action(() => {
      // Determine the location of the bundled skills directory
      // When built, this file is in dist/commands/skills.js
      // The skills are bundled into dist/skills
      const skillsDir = path.resolve(__dirname, '../skills');
      const targetDir = path.resolve(process.cwd(), '.agents/skills/helios');

      console.log(chalk.blue(`Installing skills to ${targetDir}...`));

      if (!fs.existsSync(skillsDir)) {
        console.error(chalk.red(`Error: Skills directory not found at ${skillsDir}.`));
        console.error(chalk.red('This installation of Helios CLI seems to be missing the bundled skills.'));
        process.exit(1);
      }

      if (fs.existsSync(targetDir)) {
          console.warn(chalk.yellow(`Target directory ${targetDir} already exists. Overwriting...`));
          fs.rmSync(targetDir, { recursive: true, force: true });
      }

      try {
        fs.mkdirSync(targetDir, { recursive: true });
        fs.cpSync(skillsDir, targetDir, { recursive: true });
        console.log(chalk.green('Skills installed successfully!'));
      } catch (error) {
        console.error(chalk.red('Failed to install skills:'), error);
        process.exit(1);
      }
    });
}
