# CLI All Worker Execution

## Context & Goal
- **Objective**: Add CLI options to `helios job run` for executing jobs via the remaining Tier 1, 2, and 3 infrastructure adapters (Fly.io Machines, Docker, Kubernetes, Deno Deploy, Modal, Vercel, Hetzner Cloud).
- **Trigger**: `docs/BACKLOG.md` indicates that cloud execution adapters for these platforms are implemented, but they are not exposed in the CLI (`packages/cli/src/commands/job.ts`).
- **Impact**: Makes the CLI the primary orchestrator for all supported cloud execution environments, fulfilling the vision of distributed rendering capabilities.

## File Inventory
- **Create**:
  - `None`
- **Modify**:
  - `packages/cli/src/commands/job.ts`: Add new `.option()` statements for the new adapters and instantiate the correct `WorkerAdapter` based on the `--adapter` flag.
- **Read-Only**:
  - `packages/infrastructure/src/adapters/*.ts`: To understand the options each adapter expects.

## Implementation Spec
- **Architecture**: Expand Commander.js `.option()` entries in `packages/cli/src/commands/job.ts` for all configuration variables required by the new adapters. Instantiate the corresponding adapter based on the `--adapter` flag.
- **Pseudo-Code**:
```typescript
// In registerJobCommand(program: Command)
jobCommand
  .command('run <file>')
  // Expand adapter choices
  .option('--adapter <type>', 'Adapter to use (local, aws, gcp, cloudflare, azure, fly, docker, kubernetes, deno, vercel, modal, hetzner)', 'local')
  // Fly.io Machines Options
  .option('--fly-api-token <token>', 'Fly.io API token')
  .option('--fly-app-name <name>', 'Fly.io application name')
  .option('--fly-image-ref <ref>', 'Fly.io docker image reference')
  .option('--fly-region <region>', 'Fly.io region')
  // Docker Options
  .option('--docker-image <image>', 'Docker image for worker')
  .option('--docker-args <args>', 'Comma-separated additional arguments for docker run')
  // Kubernetes Options
  .option('--k8s-kubeconfig <path>', 'Path to kubeconfig file')
  .option('--k8s-namespace <namespace>', 'Kubernetes namespace', 'default')
  .option('--k8s-image <image>', 'Kubernetes worker image')
  .option('--k8s-service-account <name>', 'Kubernetes service account name')
  // Deno Deploy Options
  .option('--deno-service-url <url>', 'Deno Deploy service URL')
  .option('--deno-auth-token <token>', 'Deno Deploy authorization token')
  // Vercel Serverless Functions Options
  .option('--vercel-service-url <url>', 'Vercel Serverless Function service URL')
  .option('--vercel-auth-token <token>', 'Vercel authorization token')
  .option('--vercel-job-def-url <url>', 'Static job definition URL for Vercel')
  // Modal Options
  .option('--modal-endpoint-url <url>', 'Modal endpoint URL')
  .option('--modal-auth-token <token>', 'Modal authorization token')
  // Hetzner Cloud Options
  .option('--hetzner-api-token <token>', 'Hetzner Cloud API token')
  .option('--hetzner-server-type <type>', 'Hetzner Cloud server type')
  .option('--hetzner-image <image>', 'Hetzner Cloud server image')
  .option('--hetzner-ssh-key-id <id>', 'Hetzner Cloud SSH Key ID')
  .option('--hetzner-location <loc>', 'Hetzner Cloud location')
  .action(async (file, options) => {
    // ...
    // Instantiate correct adapter based on options.adapter, passing the corresponding CLI args into the constructor config options
    // e.g., if (options.adapter === 'fly') {
    //   if (!options.flyApiToken || !options.flyAppName || !options.flyImageRef) throw new Error('Fly adapter requires ...');
    //   adapter = new FlyMachinesAdapter({ apiToken: options.flyApiToken, appName: options.flyAppName, imageRef: options.flyImageRef, region: options.flyRegion });
    // }
    // ...
  });
```
- **Public API Changes**: Adds new CLI flags to `helios job run`.
- **Dependencies**: No pending implementations in `packages/infrastructure`. All listed adapters are fully implemented.

## Test Plan
- **Verification**: Run `npm run build` in `packages/cli` then `./bin/helios.js job run --help` and verify all the new options appear.
- **Success Criteria**: CLI help output lists all the newly added flags for Fly, Docker, Kubernetes, Deno, Vercel, Modal, and Hetzner.
- **Edge Cases**: Missing required options (like `--docker-image` if `--adapter docker` is used) should gracefully exit with a helpful error.
