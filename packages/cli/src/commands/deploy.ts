import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import prompts from 'prompts';
import chalk from 'chalk';
import { DOCKERFILE_TEMPLATE, DOCKER_COMPOSE_TEMPLATE } from '../templates/docker.js';

export function registerDeployCommand(program: Command) {
  const deploy = program.command('deploy')
    .description('Manage deployment configuration');

  deploy
    .command('setup')
    .description('Scaffold Docker configuration files for deployment')
    .action(async () => {
      const cwd = process.cwd();
      const dockerfilePath = path.join(cwd, 'Dockerfile');
      const dockerComposePath = path.join(cwd, 'docker-compose.yml');

      console.log(chalk.blue('Scaffolding deployment files...'));

      // Dockerfile
      let writeDockerfile = true;
      if (fs.existsSync(dockerfilePath)) {
        const response = await prompts({
          type: 'confirm',
          name: 'value',
          message: 'Dockerfile already exists. Overwrite?',
          initial: false
        });

        // Handle cancellation (Ctrl+C) which returns empty object
        if (typeof response.value === 'undefined') {
          console.log(chalk.yellow('\nOperation cancelled.'));
          process.exit(0);
        }

        writeDockerfile = response.value;
      }

      if (writeDockerfile) {
        fs.writeFileSync(dockerfilePath, DOCKERFILE_TEMPLATE);
        console.log(chalk.green('✔ Created Dockerfile'));
      } else {
        console.log(chalk.gray('Skipped Dockerfile'));
      }

      // docker-compose.yml
      let writeCompose = true;
      if (fs.existsSync(dockerComposePath)) {
        const response = await prompts({
          type: 'confirm',
          name: 'value',
          message: 'docker-compose.yml already exists. Overwrite?',
          initial: false
        });

        // Handle cancellation (Ctrl+C)
        if (typeof response.value === 'undefined') {
          console.log(chalk.yellow('\nOperation cancelled.'));
          process.exit(0);
        }

        writeCompose = response.value;
      }

      if (writeCompose) {
        fs.writeFileSync(dockerComposePath, DOCKER_COMPOSE_TEMPLATE);
        console.log(chalk.green('✔ Created docker-compose.yml'));
      } else {
        console.log(chalk.gray('Skipped docker-compose.yml'));
      }

      console.log(chalk.blue('\nSetup complete!'));
      console.log('To run your project in Docker:');
      console.log(chalk.cyan('  docker-compose up --build'));
    });
}
