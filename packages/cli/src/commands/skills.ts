import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { defaultClient } from '../registry/client.js';
import { installComponent } from '../utils/install.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function registerSkillsCommand(program: Command) {
  const skills = program.command('skills')
    .description('Manage Helios agent skills');

  skills.command('list')
    .description('List available skills')
    .action(async () => {
        try {
            const list = await defaultClient.getComponents('skill');
            if (list.length === 0) {
                console.log('No skills found in registry.');
                return;
            }
            console.log(chalk.bold('Available Skills:'));
            list.forEach(c => {
                console.log(`- ${chalk.cyan(c.name)}: ${c.description || 'No description'}`);
            });
        } catch (e) {
            console.error(chalk.red('Failed to list skills:'), e);
        }
    });

  skills.command('install [name]')
    .description('Install Helios skills into the current project')
    .action(async (name) => {
      if (name) {
          try {
             await installComponent(process.cwd(), name, { install: true, type: 'skill' });
             console.log(chalk.green(`Skill "${name}" installed successfully.`));
          } catch (e: any) {
             console.error(chalk.red(`Failed to install skill "${name}":`), e.message);
             process.exit(1);
          }
          return;
      }

      // Existing logic for bulk install
      const skillsDir = path.resolve(__dirname, '../skills');
      const targetDir = path.resolve(process.cwd(), '.agents/skills/helios');

      console.log(chalk.blue(`Installing all bundled skills to ${targetDir}...`));

      let sourceDir = skillsDir;
      if (!fs.existsSync(skillsDir)) {
        // Fallback: If running in dev environment (not built), try source path
        const devSkillsDir = path.resolve(__dirname, '../../../../.agents/skills/helios');
        if (fs.existsSync(devSkillsDir)) {
             console.log(chalk.dim(`Found skills in source: ${devSkillsDir}`));
             sourceDir = devSkillsDir;
        } else {
             console.error(chalk.red(`Error: Skills directory not found at ${skillsDir}.`));
             console.error(chalk.red('This installation of Helios CLI seems to be missing the bundled skills.'));
             process.exit(1);
        }
      }

      copySkills(sourceDir, targetDir);
    });
}

function copySkills(src: string, dest: string) {
    if (fs.existsSync(dest)) {
          console.warn(chalk.yellow(`Target directory ${dest} already exists. Overwriting...`));
          fs.rmSync(dest, { recursive: true, force: true });
    }

    try {
        fs.mkdirSync(dest, { recursive: true });
        fs.cpSync(src, dest, { recursive: true });
        console.log(chalk.green('All skills installed successfully!'));
    } catch (error) {
        console.error(chalk.red('Failed to install skills:'), error);
        process.exit(1);
    }
}
