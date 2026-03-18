#### 1. Context & Goal
- **Objective**: Document the remaining cloud execution adapters in the Infrastructure README.
- **Trigger**: The `docs/BACKLOG.md` defines several Cloud Execution Adapters (Kubernetes, Docker, Modal, Deno Deploy, Vercel, Hetzner Cloud) as completed deliverables that are currently missing from the `packages/infrastructure/README.md`.
- **Impact**: Ensures accurate documentation for users and agents, reflecting the full capabilities of the distributed rendering infrastructure.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/infrastructure/README.md`
- **Read-Only**:
  - `packages/infrastructure/src/adapters/kubernetes-adapter.ts`
  - `packages/infrastructure/src/adapters/docker-adapter.ts`
  - `packages/infrastructure/src/adapters/modal-adapter.ts`
  - `packages/infrastructure/src/adapters/deno-deploy-adapter.ts`
  - `packages/infrastructure/src/adapters/vercel-adapter.ts`
  - `packages/infrastructure/src/adapters/hetzner-cloud-adapter.ts`

#### 3. Implementation Spec
- **Architecture**: Update the Markdown documentation to include descriptions for the implemented adapters that are currently missing from the README.
- **Pseudo-Code**:
  - Locate the "Cloud Execution Adapters" section in `packages/infrastructure/README.md`.
  - Append descriptions for the following adapters based on their explicitly implemented properties:
    - **KubernetesAdapter**: Allows execution of distributed rendering jobs across a Kubernetes cluster via the Batch V1 API using `@kubernetes/client-node`.
    - **DockerAdapter**: Executes rendering chunks via local child processes using `spawn('docker', ...)`.
    - **ModalAdapter**: Provides an endpoint URL config for executing jobs, passing the job data via payload.
    - **DenoDeployAdapter**: Adapter for executing rendering chunks on Deno Deploy using endpoint URL and authorization tokens via native fetch POST requests.
    - **VercelAdapter**: Adapter for executing rendering chunks on Vercel Serverless Functions using endpoint URL, authorization token, and parsing job definition path and chunk IDs.
    - **HetznerCloudAdapter**: Adapter for executing rendering chunks using Hetzner Cloud API tokens, specifying server types, images, and managing remote server lifecycles.
- **Public API Changes**: None
- **Dependencies**: None
- **Cloud Considerations**: Accurate documentation is critical for users selecting the appropriate cloud execution environment.

#### 4. Test Plan
- **Verification**: `grep -E "KubernetesAdapter|DockerAdapter|ModalAdapter|DenoDeployAdapter|VercelAdapter|HetznerCloudAdapter" packages/infrastructure/README.md`
- **Success Criteria**: All missing adapters are documented in the README.
- **Edge Cases**: None
- **Integration Verification**: Ensure markdown formatting is valid.
