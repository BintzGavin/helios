#### 1. Context & Goal
- **Objective**: Integrate Fly.io, Kubernetes, and Docker execution adapters into the `helios job run` command.
- **Trigger**: The infrastructure package has implemented adapters for Fly.io, Kubernetes, and Docker (Tier 1 & 2 in `docs/BACKLOG.md`), but the CLI lacks the configuration options to use them for distributed rendering. This closes a vision gap for Cloud Worker Execution platform expansion.
- **Impact**: Enables users to orchestrate distributed rendering jobs natively across Fly.io machines, Kubernetes clusters, and local Docker swarms directly from the CLI.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/cli/src/commands/job.ts` (Add new CLI options and adapter instantiation logic)
- **Read-Only**: `packages/infrastructure/src/adapters/fly-machines-adapter.ts`, `packages/infrastructure/src/adapters/kubernetes-adapter.ts`, `packages/infrastructure/src/adapters/docker-adapter.ts`

#### 3. Implementation Spec
- **Architecture**:
  - Extend Commander.js `.option()` configurations in `packages/cli/src/commands/job.ts` to include configuration arguments for `fly`, `k8s`, and `docker` adapters.
  - Expand the `options.adapter` check to instantiate `FlyMachinesAdapter`, `KubernetesAdapter`, or `DockerAdapter` when selected, passing the newly added CLI options.
- **Pseudo-Code**:
  - Import the target adapters from `@helios-project/infrastructure`
  - Expand the `--adapter` help text to include `fly, k8s, docker`
  - Add Commander `.option()` declarations for:
    - Fly: `--fly-api-token`, `--fly-app-name`, `--fly-image-ref`, `--fly-region`
    - K8s: `--k8s-kubeconfig`, `--k8s-namespace`, `--k8s-image`, `--k8s-job-prefix`, `--k8s-service-account`
    - Docker: `--docker-image`, `--docker-args`
  - Add `else if` conditions in the action handler to instantiate the selected adapter, throwing an error if required flags for that adapter are missing.
- **Public API Changes**: `helios job run` will accept `fly`, `k8s`, and `docker` as valid `--adapter` values along with their respective configuration flags.
- **Dependencies**: None. Adapters already exist in `@helios-project/infrastructure`.

#### 4. Test Plan
- **Verification**: Run `npm run build` in `packages/cli` to ensure TypeScript compilation passes. Run `node dist/index.js job run --help` to verify the new options are listed.
- **Success Criteria**: The CLI correctly parses the new adapter types and options, throwing the appropriate validation errors if required parameters are missing.
- **Edge Cases**: Verify that optional parameters gracefully fallback to `undefined` without crashing the instantiation.
