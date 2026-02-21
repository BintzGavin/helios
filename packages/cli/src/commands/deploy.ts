import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import prompts from 'prompts';
import chalk from 'chalk';
import { DOCKERFILE_TEMPLATE, DOCKER_COMPOSE_TEMPLATE } from '../templates/docker.js';
import { CLOUD_RUN_JOB_TEMPLATE, README_GCP_TEMPLATE } from '../templates/gcp.js';

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

  deploy
    .command('gcp')
    .description('Scaffold Google Cloud Run Job configuration')
    .action(async () => {
      const cwd = process.cwd();
      const jobConfigPath = path.join(cwd, 'cloud-run-job.yaml');
      const readmePath = path.join(cwd, 'README-GCP.md');

      console.log(chalk.blue('Scaffolding Google Cloud Run Job files...'));

      // cloud-run-job.yaml
      let writeJobConfig = true;
      if (fs.existsSync(jobConfigPath)) {
        const response = await prompts({
          type: 'confirm',
          name: 'value',
          message: 'cloud-run-job.yaml already exists. Overwrite?',
          initial: false
        });

        if (typeof response.value === 'undefined') {
          console.log(chalk.yellow('\nOperation cancelled.'));
          process.exit(0);
        }

        writeJobConfig = response.value;
      }

      if (writeJobConfig) {
        fs.writeFileSync(jobConfigPath, CLOUD_RUN_JOB_TEMPLATE);
        console.log(chalk.green('✔ Created cloud-run-job.yaml'));
      } else {
        console.log(chalk.gray('Skipped cloud-run-job.yaml'));
      }

      // README-GCP.md
      let writeReadme = true;
      if (fs.existsSync(readmePath)) {
        const response = await prompts({
          type: 'confirm',
          name: 'value',
          message: 'README-GCP.md already exists. Overwrite?',
          initial: false
        });

        if (typeof response.value === 'undefined') {
          console.log(chalk.yellow('\nOperation cancelled.'));
          process.exit(0);
        }

        writeReadme = response.value;
      }

      if (writeReadme) {
        fs.writeFileSync(readmePath, README_GCP_TEMPLATE);
        console.log(chalk.green('✔ Created README-GCP.md'));
      } else {
        console.log(chalk.gray('Skipped README-GCP.md'));
      }

      console.log(chalk.blue('\nGCP setup complete!'));
      console.log('See README-GCP.md for deployment instructions.');
    });
}
