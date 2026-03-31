import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import prompts from 'prompts';
import chalk from 'chalk';
import { DOCKERFILE_TEMPLATE, DOCKER_COMPOSE_TEMPLATE } from '../templates/docker.js';
import { CLOUD_RUN_JOB_TEMPLATE, README_GCP_TEMPLATE } from '../templates/gcp.js';
import { AWS_DOCKERFILE_TEMPLATE, AWS_LAMBDA_HANDLER_TEMPLATE, AWS_SAM_TEMPLATE, README_AWS_TEMPLATE } from '../templates/aws.js';
import { WRANGLER_TOML_TEMPLATE, CLOUDFLARE_WORKER_TEMPLATE, README_CLOUDFLARE_TEMPLATE } from '../templates/cloudflare.js';
import { FLY_TOML_TEMPLATE, FLY_DOCKERFILE_TEMPLATE, README_FLY_TEMPLATE } from '../templates/fly.js';
import { KUBERNETES_JOB_TEMPLATE, README_KUBERNETES_TEMPLATE } from '../templates/kubernetes.js';
import { README_HETZNER_TEMPLATE } from '../templates/hetzner.js';

import { AZURE_FUNCTION_JSON_TEMPLATE, AZURE_HOST_JSON_TEMPLATE, AZURE_LOCAL_SETTINGS_JSON_TEMPLATE, AZURE_INDEX_JS_TEMPLATE, README_AZURE_TEMPLATE } from '../templates/azure.js';
import { README_MODAL_TEMPLATE } from '../templates/modal.js';
import { README_DENO_TEMPLATE } from '../templates/deno.js';
import { README_VERCEL_TEMPLATE } from '../templates/vercel.js';


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

  deploy
    .command('aws')
    .description('Scaffold AWS Lambda deployment configuration')
    .action(async () => {
      const cwd = process.cwd();
      const dockerfilePath = path.join(cwd, 'Dockerfile');
      const samTemplatePath = path.join(cwd, 'template.yaml');
      const lambdaHandlerPath = path.join(cwd, 'lambda.js');
      const readmePath = path.join(cwd, 'README-AWS.md');

      console.log(chalk.blue('Scaffolding AWS Lambda deployment files...'));

      // Dockerfile
      let writeDockerfile = true;
      if (fs.existsSync(dockerfilePath)) {
        const response = await prompts({
          type: 'confirm',
          name: 'value',
          message: 'Dockerfile already exists. Overwrite?',
          initial: false
        });

        if (typeof response.value === 'undefined') {
          console.log(chalk.yellow('\nOperation cancelled.'));
          process.exit(0);
        }

        writeDockerfile = response.value;
      }

      if (writeDockerfile) {
        fs.writeFileSync(dockerfilePath, AWS_DOCKERFILE_TEMPLATE);
        console.log(chalk.green('✔ Created Dockerfile'));
      } else {
        console.log(chalk.gray('Skipped Dockerfile'));
      }

      // template.yaml
      let writeSamTemplate = true;
      if (fs.existsSync(samTemplatePath)) {
        const response = await prompts({
          type: 'confirm',
          name: 'value',
          message: 'template.yaml already exists. Overwrite?',
          initial: false
        });

        if (typeof response.value === 'undefined') {
          console.log(chalk.yellow('\nOperation cancelled.'));
          process.exit(0);
        }

        writeSamTemplate = response.value;
      }

      if (writeSamTemplate) {
        fs.writeFileSync(samTemplatePath, AWS_SAM_TEMPLATE);
        console.log(chalk.green('✔ Created template.yaml'));
      } else {
        console.log(chalk.gray('Skipped template.yaml'));
      }

      // lambda.js
      let writeLambdaHandler = true;
      if (fs.existsSync(lambdaHandlerPath)) {
        const response = await prompts({
          type: 'confirm',
          name: 'value',
          message: 'lambda.js already exists. Overwrite?',
          initial: false
        });

        if (typeof response.value === 'undefined') {
          console.log(chalk.yellow('\nOperation cancelled.'));
          process.exit(0);
        }

        writeLambdaHandler = response.value;
      }

      if (writeLambdaHandler) {
        fs.writeFileSync(lambdaHandlerPath, AWS_LAMBDA_HANDLER_TEMPLATE);
        console.log(chalk.green('✔ Created lambda.js'));
      } else {
        console.log(chalk.gray('Skipped lambda.js'));
      }

      // README-AWS.md
      let writeReadme = true;
      if (fs.existsSync(readmePath)) {
        const response = await prompts({
          type: 'confirm',
          name: 'value',
          message: 'README-AWS.md already exists. Overwrite?',
          initial: false
        });

        if (typeof response.value === 'undefined') {
          console.log(chalk.yellow('\nOperation cancelled.'));
          process.exit(0);
        }

        writeReadme = response.value;
      }

      if (writeReadme) {
        fs.writeFileSync(readmePath, README_AWS_TEMPLATE);
        console.log(chalk.green('✔ Created README-AWS.md'));
      } else {
        console.log(chalk.gray('Skipped README-AWS.md'));
      }

      console.log(chalk.blue('\nAWS Lambda setup complete!'));
      console.log('See README-AWS.md for deployment instructions.');
    });

  deploy
    .command('cloudflare')
    .description('Scaffold Cloudflare Workers deployment configuration')
    .action(async () => {
      const cwd = process.cwd();
      const wranglerPath = path.join(cwd, 'wrangler.toml');
      const workerPath = path.join(cwd, 'src', 'worker.ts');
      const readmePath = path.join(cwd, 'README-CLOUDFLARE.md');

      console.log(chalk.blue('Scaffolding Cloudflare Workers deployment files...'));

      // wrangler.toml
      let writeWrangler = true;
      if (fs.existsSync(wranglerPath)) {
        const response = await prompts({
          type: 'confirm',
          name: 'value',
          message: 'wrangler.toml already exists. Overwrite?',
          initial: false
        });

        if (typeof response.value === 'undefined') {
          console.log(chalk.yellow('\nOperation cancelled.'));
          process.exit(0);
        }

        writeWrangler = response.value;
      }

      if (writeWrangler) {
        fs.writeFileSync(wranglerPath, WRANGLER_TOML_TEMPLATE);
        console.log(chalk.green('✔ Created wrangler.toml'));
      } else {
        console.log(chalk.gray('Skipped wrangler.toml'));
      }

      // src/worker.ts
      let writeWorker = true;
      if (fs.existsSync(workerPath)) {
        const response = await prompts({
          type: 'confirm',
          name: 'value',
          message: 'src/worker.ts already exists. Overwrite?',
          initial: false
        });

        if (typeof response.value === 'undefined') {
          console.log(chalk.yellow('\nOperation cancelled.'));
          process.exit(0);
        }

        writeWorker = response.value;
      }

      if (writeWorker) {
        const srcDir = path.dirname(workerPath);
        if (!fs.existsSync(srcDir)) {
          fs.mkdirSync(srcDir, { recursive: true });
        }
        fs.writeFileSync(workerPath, CLOUDFLARE_WORKER_TEMPLATE);
        console.log(chalk.green('✔ Created src/worker.ts'));
      } else {
        console.log(chalk.gray('Skipped src/worker.ts'));
      }

      // README-CLOUDFLARE.md
      let writeReadme = true;
      if (fs.existsSync(readmePath)) {
        const response = await prompts({
          type: 'confirm',
          name: 'value',
          message: 'README-CLOUDFLARE.md already exists. Overwrite?',
          initial: false
        });

        if (typeof response.value === 'undefined') {
          console.log(chalk.yellow('\nOperation cancelled.'));
          process.exit(0);
        }

        writeReadme = response.value;
      }

      if (writeReadme) {
        fs.writeFileSync(readmePath, README_CLOUDFLARE_TEMPLATE);
        console.log(chalk.green('✔ Created README-CLOUDFLARE.md'));
      } else {
        console.log(chalk.gray('Skipped README-CLOUDFLARE.md'));
      }

      console.log(chalk.blue('\nCloudflare Workers setup complete!'));
      console.log('See README-CLOUDFLARE.md for deployment instructions.');
    });

  deploy
    .command('fly')
    .description('Scaffold Fly.io Machines deployment configuration')
    .action(async () => {
      const cwd = process.cwd();
      const flyTomlPath = path.join(cwd, 'fly.toml');
      const dockerfilePath = path.join(cwd, 'Dockerfile');
      const readmePath = path.join(cwd, 'README-FLY.md');

      console.log(chalk.blue('Scaffolding Fly.io deployment files...'));

      // fly.toml
      let writeFlyToml = true;
      if (fs.existsSync(flyTomlPath)) {
        const response = await prompts({
          type: 'confirm',
          name: 'value',
          message: 'fly.toml already exists. Overwrite?',
          initial: false
        });

        if (typeof response.value === 'undefined') {
          console.log(chalk.yellow('\nOperation cancelled.'));
          process.exit(0);
        }

        writeFlyToml = response.value;
      }

      if (writeFlyToml) {
        fs.writeFileSync(flyTomlPath, FLY_TOML_TEMPLATE);
        console.log(chalk.green('✔ Created fly.toml'));
      } else {
        console.log(chalk.gray('Skipped fly.toml'));
      }

      // Dockerfile
      let writeDockerfile = true;
      if (fs.existsSync(dockerfilePath)) {
        const response = await prompts({
          type: 'confirm',
          name: 'value',
          message: 'Dockerfile already exists. Overwrite?',
          initial: false
        });

        if (typeof response.value === 'undefined') {
          console.log(chalk.yellow('\nOperation cancelled.'));
          process.exit(0);
        }

        writeDockerfile = response.value;
      }

      if (writeDockerfile) {
        fs.writeFileSync(dockerfilePath, FLY_DOCKERFILE_TEMPLATE);
        console.log(chalk.green('✔ Created Dockerfile'));
      } else {
        console.log(chalk.gray('Skipped Dockerfile'));
      }

      // README-FLY.md
      let writeReadme = true;
      if (fs.existsSync(readmePath)) {
        const response = await prompts({
          type: 'confirm',
          name: 'value',
          message: 'README-FLY.md already exists. Overwrite?',
          initial: false
        });

        if (typeof response.value === 'undefined') {
          console.log(chalk.yellow('\nOperation cancelled.'));
          process.exit(0);
        }

        writeReadme = response.value;
      }

      if (writeReadme) {
        fs.writeFileSync(readmePath, README_FLY_TEMPLATE);
        console.log(chalk.green('✔ Created README-FLY.md'));
      } else {
        console.log(chalk.gray('Skipped README-FLY.md'));
      }

      console.log(chalk.blue('\nFly.io setup complete!'));
      console.log('See README-FLY.md for deployment instructions.');
    });


  deploy
    .command('azure')
    .description('Scaffold Azure Functions deployment configuration')
    .action(async () => {
      const cwd = process.cwd();
      const hostJsonPath = path.join(cwd, 'host.json');
      const localSettingsPath = path.join(cwd, 'local.settings.json');
      const renderJobDirPath = path.join(cwd, 'RenderJob');
      const functionJsonPath = path.join(renderJobDirPath, 'function.json');
      const indexJsPath = path.join(renderJobDirPath, 'index.js');
      const readmePath = path.join(cwd, 'README-AZURE.md');

      console.log(chalk.blue('Scaffolding Azure Functions deployment files...'));

      // host.json
      let writeHostJson = true;
      if (fs.existsSync(hostJsonPath)) {
        const response = await prompts({
          type: 'confirm',
          name: 'value',
          message: 'host.json already exists. Overwrite?',
          initial: false
        });

        if (typeof response.value === 'undefined') {
          console.log(chalk.yellow('\nOperation cancelled.'));
          process.exit(0);
        }
        writeHostJson = response.value;
      }
      if (writeHostJson) {
        fs.writeFileSync(hostJsonPath, AZURE_HOST_JSON_TEMPLATE);
        console.log(chalk.green('✔ Created host.json'));
      } else {
        console.log(chalk.gray('Skipped host.json'));
      }

      // local.settings.json
      let writeLocalSettings = true;
      if (fs.existsSync(localSettingsPath)) {
        const response = await prompts({
          type: 'confirm',
          name: 'value',
          message: 'local.settings.json already exists. Overwrite?',
          initial: false
        });
        if (typeof response.value === 'undefined') {
          console.log(chalk.yellow('\nOperation cancelled.'));
          process.exit(0);
        }
        writeLocalSettings = response.value;
      }
      if (writeLocalSettings) {
        fs.writeFileSync(localSettingsPath, AZURE_LOCAL_SETTINGS_JSON_TEMPLATE);
        console.log(chalk.green('✔ Created local.settings.json'));
      } else {
        console.log(chalk.gray('Skipped local.settings.json'));
      }

      // RenderJob directory and files
      if (!fs.existsSync(renderJobDirPath)) {
        fs.mkdirSync(renderJobDirPath, { recursive: true });
      }

      // RenderJob/function.json
      let writeFunctionJson = true;
      if (fs.existsSync(functionJsonPath)) {
        const response = await prompts({
          type: 'confirm',
          name: 'value',
          message: 'RenderJob/function.json already exists. Overwrite?',
          initial: false
        });
        if (typeof response.value === 'undefined') {
          console.log(chalk.yellow('\nOperation cancelled.'));
          process.exit(0);
        }
        writeFunctionJson = response.value;
      }
      if (writeFunctionJson) {
        fs.writeFileSync(functionJsonPath, AZURE_FUNCTION_JSON_TEMPLATE);
        console.log(chalk.green('✔ Created RenderJob/function.json'));
      } else {
        console.log(chalk.gray('Skipped RenderJob/function.json'));
      }

      // RenderJob/index.js
      let writeIndexJs = true;
      if (fs.existsSync(indexJsPath)) {
        const response = await prompts({
          type: 'confirm',
          name: 'value',
          message: 'RenderJob/index.js already exists. Overwrite?',
          initial: false
        });
        if (typeof response.value === 'undefined') {
          console.log(chalk.yellow('\nOperation cancelled.'));
          process.exit(0);
        }
        writeIndexJs = response.value;
      }
      if (writeIndexJs) {
        fs.writeFileSync(indexJsPath, AZURE_INDEX_JS_TEMPLATE);
        console.log(chalk.green('✔ Created RenderJob/index.js'));
      } else {
        console.log(chalk.gray('Skipped RenderJob/index.js'));
      }

      // README-AZURE.md
      let writeReadme = true;
      if (fs.existsSync(readmePath)) {
        const response = await prompts({
          type: 'confirm',
          name: 'value',
          message: 'README-AZURE.md already exists. Overwrite?',
          initial: false
        });
        if (typeof response.value === 'undefined') {
          console.log(chalk.yellow('\nOperation cancelled.'));
          process.exit(0);
        }
        writeReadme = response.value;
      }
      if (writeReadme) {
        fs.writeFileSync(readmePath, README_AZURE_TEMPLATE);
        console.log(chalk.green('✔ Created README-AZURE.md'));
      } else {
        console.log(chalk.gray('Skipped README-AZURE.md'));
      }

      console.log(chalk.blue('\nAzure Functions setup complete!'));
      console.log('See README-AZURE.md for deployment instructions.');
    });

  deploy
    .command('kubernetes')
    .description('Scaffold Kubernetes deployment configuration')
    .action(async () => {
      const cwd = process.cwd();
      const jobYamlPath = path.join(cwd, 'job.yaml');
      const readmePath = path.join(cwd, 'README-KUBERNETES.md');

      console.log(chalk.blue('Scaffolding Kubernetes deployment files...'));

      // job.yaml
      let writeJobYaml = true;
      if (fs.existsSync(jobYamlPath)) {
        const response = await prompts({
          type: 'confirm',
          name: 'value',
          message: 'job.yaml already exists. Overwrite?',
          initial: false
        });

        if (typeof response.value === 'undefined') {
          console.log(chalk.yellow('\nOperation cancelled.'));
          process.exit(0);
        }

        writeJobYaml = response.value;
      }

      if (writeJobYaml) {
        fs.writeFileSync(jobYamlPath, KUBERNETES_JOB_TEMPLATE);
        console.log(chalk.green('✔ Created job.yaml'));
      } else {
        console.log(chalk.gray('Skipped job.yaml'));
      }

      // README-KUBERNETES.md
      let writeReadme = true;
      if (fs.existsSync(readmePath)) {
        const response = await prompts({
          type: 'confirm',
          name: 'value',
          message: 'README-KUBERNETES.md already exists. Overwrite?',
          initial: false
        });

        if (typeof response.value === 'undefined') {
          console.log(chalk.yellow('\nOperation cancelled.'));
          process.exit(0);
        }

        writeReadme = response.value;
      }

      if (writeReadme) {
        fs.writeFileSync(readmePath, README_KUBERNETES_TEMPLATE);
        console.log(chalk.green('✔ Created README-KUBERNETES.md'));
      } else {
        console.log(chalk.gray('Skipped README-KUBERNETES.md'));
      }

      console.log(chalk.blue('\nKubernetes setup complete!'));
      console.log('See README-KUBERNETES.md for deployment instructions.');
    });

  deploy
    .command('hetzner')
    .description('Scaffold Hetzner Cloud deployment configuration')
    .action(async () => {
      const cwd = process.cwd();
      const readmePath = path.join(cwd, 'README-HETZNER.md');

      console.log(chalk.blue('Scaffolding Hetzner Cloud deployment files...'));

      let writeReadme = true;
      if (fs.existsSync(readmePath)) {
        const response = await prompts({
          type: 'confirm',
          name: 'value',
          message: 'README-HETZNER.md already exists. Overwrite?',
          initial: false
        });

        if (typeof response.value === 'undefined') {
          console.log(chalk.yellow('\nOperation cancelled.'));
          process.exit(0);
        }

        writeReadme = response.value;
      }

      if (writeReadme) {
        fs.writeFileSync(readmePath, README_HETZNER_TEMPLATE);
        console.log(chalk.green('✔ Created README-HETZNER.md'));
      } else {
        console.log(chalk.gray('Skipped README-HETZNER.md'));
      }

      console.log(chalk.blue('\nHetzner Cloud setup complete!'));
      console.log('See README-HETZNER.md for deployment instructions.');
    });


  deploy
    .command('modal')
    .description('Scaffold Modal deployment configuration')
    .action(async () => {
      const cwd = process.cwd();
      const readmePath = path.join(cwd, 'README-MODAL.md');

      console.log(chalk.blue('Scaffolding Modal deployment files...'));

      let writeReadme = true;
      if (fs.existsSync(readmePath)) {
        const response = await prompts({
          type: 'confirm',
          name: 'value',
          message: 'README-MODAL.md already exists. Overwrite?',
          initial: false
        });

        if (typeof response.value === 'undefined') {
          console.log(chalk.yellow('\nOperation cancelled.'));
          process.exit(0);
        }

        writeReadme = response.value;
      }

      if (writeReadme) {
        fs.writeFileSync(readmePath, README_MODAL_TEMPLATE);
        console.log(chalk.green('✔ Created README-MODAL.md'));
      } else {
        console.log(chalk.gray('Skipped README-MODAL.md'));
      }

      console.log(chalk.blue('\nModal setup complete!'));
      console.log('See README-MODAL.md for deployment instructions.');
    });

  deploy
    .command('deno')
    .description('Scaffold Deno Deploy deployment configuration')
    .action(async () => {
      const cwd = process.cwd();
      const readmePath = path.join(cwd, 'README-DENO.md');

      console.log(chalk.blue('Scaffolding Deno Deploy files...'));

      let writeReadme = true;
      if (fs.existsSync(readmePath)) {
        const response = await prompts({
          type: 'confirm',
          name: 'value',
          message: 'README-DENO.md already exists. Overwrite?',
          initial: false
        });

        if (typeof response.value === 'undefined') {
          console.log(chalk.yellow('\nOperation cancelled.'));
          process.exit(0);
        }

        writeReadme = response.value;
      }

      if (writeReadme) {
        fs.writeFileSync(readmePath, README_DENO_TEMPLATE);
        console.log(chalk.green('✔ Created README-DENO.md'));
      } else {
        console.log(chalk.gray('Skipped README-DENO.md'));
      }

      console.log(chalk.blue('\nDeno setup complete!'));
      console.log('See README-DENO.md for deployment instructions.');
    });

  deploy
    .command('vercel')
    .description('Scaffold Vercel deployment configuration')
    .action(async () => {
      const cwd = process.cwd();
      const readmePath = path.join(cwd, 'README-VERCEL.md');

      console.log(chalk.blue('Scaffolding Vercel deployment files...'));

      let writeReadme = true;
      if (fs.existsSync(readmePath)) {
        const response = await prompts({
          type: 'confirm',
          name: 'value',
          message: 'README-VERCEL.md already exists. Overwrite?',
          initial: false
        });

        if (typeof response.value === 'undefined') {
          console.log(chalk.yellow('\nOperation cancelled.'));
          process.exit(0);
        }

        writeReadme = response.value;
      }

      if (writeReadme) {
        fs.writeFileSync(readmePath, README_VERCEL_TEMPLATE);
        console.log(chalk.green('✔ Created README-VERCEL.md'));
      } else {
        console.log(chalk.gray('Skipped README-VERCEL.md'));
      }

      console.log(chalk.blue('\nVercel setup complete!'));
      console.log('See README-VERCEL.md for deployment instructions.');
    });
}
