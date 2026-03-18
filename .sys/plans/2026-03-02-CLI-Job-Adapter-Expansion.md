#### 1. Context & Goal
- **Objective**: Expose the Docker, Fly.io, and Kubernetes cloud execution adapters in the `helios job run` CLI command.
- **Trigger**: `docs/BACKLOG.md` defines these adapters as completed under Tier 1/2 of "Cloud execution adapter", but they are completely missing from the CLI command `helios job run` (which is meant to act as the primary interface for distributed execution), creating a vision gap.
- **Impact**: Enables users to orchestrate distributed rendering jobs natively using Docker Swarm/Local, Fly.io Machines, and Kubernetes via the CLI, fulfilling the "Distributed Rendering" platform direction outlined in `AGENTS.md`.

#### 2. File Inventory
- **Create**: None
- **Modify**:
  - `packages/cli/src/commands/job.ts`: Import `FlyMachinesAdapter`, `KubernetesAdapter`, and `DockerAdapter` from `@helios-project/infrastructure` and add CLI flags/configuration setup for them.
- **Read-Only**:
  - `packages/infrastructure/src/adapters/index.ts`

#### 3. Implementation Spec
- **Architecture**: Update the Commander.js configuration in `registerJobCommand` within `packages/cli/src/commands/job.ts` to include options for Docker, Fly.io, and Kubernetes. Add conditional logic to instantiate the appropriate adapter based on the `--adapter` flag.
- **Pseudo-Code**:
  ```typescript
  // In job.ts, import the new adapters
  import { ..., FlyMachinesAdapter, KubernetesAdapter, DockerAdapter } from '@helios-project/infrastructure';

  // Add options to the job command
  .option('--adapter <type>', 'Adapter to use (local, aws, gcp, cloudflare, azure, fly, kubernetes, docker)', 'local')
  .option('--fly-api-token <token>', 'Fly.io API token')
  .option('--fly-app-name <name>', 'Fly.io app name')
  .option('--k8s-namespace <namespace>', 'Kubernetes namespace', 'default')
  .option('--k8s-job-image <image>', 'Kubernetes job image')
  .option('--docker-image <image>', 'Docker image to use')

  // In the action handler, add conditional logic
  } else if (options.adapter === 'fly') {
     if (!options.flyApiToken || !options.flyAppName) throw new Error('Fly adapter requires...');
     adapter = new FlyMachinesAdapter({ apiToken: options.flyApiToken, appName: options.flyAppName, ... });
  } else if (options.adapter === 'kubernetes') {
     if (!options.k8sJobImage) throw new Error('Kubernetes adapter requires...');
     adapter = new KubernetesAdapter({ namespace: options.k8sNamespace, jobImage: options.k8sJobImage, ... });
  } else if (options.adapter === 'docker') {
     if (!options.dockerImage) throw new Error('Docker adapter requires...');
     adapter = new DockerAdapter({ image: options.dockerImage, ... });
  }
  ```
- **Public API Changes**: Adds new CLI flags to `helios job run`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm run build -w packages/cli` and then `node packages/cli/bin/helios.js job run --help`. Verify that the new `--adapter` types and associated flags for Fly.io, Kubernetes, and Docker are listed in the help output.
- **Success Criteria**: The CLI parses the new adapter flags correctly.
- **Edge Cases**: Missing required flags for a specific adapter should throw clear error messages.
