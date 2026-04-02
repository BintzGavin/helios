# 2027-05-15-CLI-Scaffold-Docker-Deployment.md

## 1. Context & Goal
- **Objective**: Implement `helios deploy docker` to scaffold a `docker-compose.yml` and `README-DOCKER.md` for running distributed rendering workloads via Docker Swarm/Compose.
- **Trigger**: The Infrastructure agent completed the `DockerAdapter` for Tier 2 cloud execution, but the CLI lacks a deployment scaffold for it.
- **Impact**: Unblocks the usage of the `DockerAdapter` for distributed on-prem/CI rendering and completes the product surface for Docker-based deployments.

## 2. File Inventory
- **Create**: None.
- **Modify**:
  - `packages/cli/src/commands/deploy.ts`: Add `.command('docker')` with scaffolding logic for `docker-compose.yml` and `README-DOCKER.md`.
- **Read-Only**:
  - `packages/infrastructure/src/adapters/docker-adapter.ts` (Reference for usage)

## 3. Implementation Spec
- **Architecture**:
  - Use Commander.js to add a `docker` subcommand under `deploy`.
  - Check for existing `docker-compose.yml` and `README-DOCKER.md` using `fs.existsSync` and prompt the user to overwrite if they exist.
  - Write standard templates to the current working directory.
- **Pseudo-Code**:
  ```typescript
  const DOCKER_COMPOSE_TEMPLATE = \`...\`;
  const README_DOCKER_TEMPLATE = \`...\`;

  deploy
    .command('docker')
    .description('Scaffold Docker Compose deployment configuration')
    .action(async () => {
       // scaffolding logic mirroring deploy kubernetes
    });
  ```
- **Public API Changes**: Adds `helios deploy docker` command.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: `npx tsx packages/cli/src/index.ts deploy docker` and verify that `docker-compose.yml` and `README-DOCKER.md` are correctly generated.
- **Success Criteria**:
  - Running the command scaffolds the two files.
  - The prompts logic works correctly when files already exist.
- **Edge Cases**:
  - User cancels the overwrite prompt (Ctrl+C).
  - Files already exist.
