#### 1. Context & Goal
- **Objective**: Document the remaining implemented Cloud Execution Adapters (`FlyMachinesAdapter`, `DockerAdapter`, and `KubernetesAdapter`) in the infrastructure README.
- **Trigger**: Vision gap - Several adapters are implemented but missing from the product surface documentation.
- **Impact**: Provides users with clarity on how to utilize Fly.io Machines, Docker/Local Swarm, and Kubernetes for distributed rendering workflows, closing the documentation gap.

#### 2. File Inventory
- **Create**: None
- **Modify**:
  - `packages/infrastructure/README.md`
- **Read-Only**:
  - `packages/infrastructure/src/adapters/fly-machines-adapter.ts`
  - `packages/infrastructure/src/adapters/docker-adapter.ts`
  - `packages/infrastructure/src/adapters/kubernetes-adapter.ts`

#### 3. Implementation Spec
- **Architecture**: Update documentation to explain the `FlyMachinesAdapter`, `DockerAdapter`, and `KubernetesAdapter` patterns.
- **Pseudo-Code**:
  - Insert a new bullet point for `FlyMachinesAdapter` under the "Cloud Execution Adapters" heading in `packages/infrastructure/README.md`. Describe how it provisions tasks using the Fly.io Machines REST API and manages VM lifecycles.
  - Insert a new bullet point for `DockerAdapter`. Describe how it runs rendering tasks using local Docker containers via `spawn` and manages container lifecycles.
  - Insert a new bullet point for `KubernetesAdapter`. Describe how it provisions tasks using the Kubernetes Batch V1 API using `@kubernetes/client-node`.
- **Public API Changes**: None
- **Dependencies**: None
- **Cloud Considerations**: Notes specific adapter requirements like `kubeconfigPath` for K8s, `dockerArgs` for Docker, and Bearer tokens for Fly.

#### 4. Test Plan
- **Verification**: Run `npm run test` in `packages/infrastructure` to ensure formatting or links don't break anything unexpectedly, though it's mainly a documentation update.
- **Success Criteria**: Tests pass and the `README.md` file contains the new documentation entries.
- **Edge Cases**: Verify that the Markdown formatting is consistent with the rest of the list.
- **Integration Verification**: Verify the link or format works appropriately within standard markdown viewers.