#### 1. Context & Goal
- **Objective**: Document the remaining cloud execution adapters in `packages/infrastructure/README.md`.
- **Trigger**: Several adapters (Docker, Fly Machines, Deno Deploy, Hetzner Cloud, Kubernetes, Modal, Vercel) have been implemented and tested but are missing from the `README.md`'s Cloud Execution Adapters section.
- **Impact**: Provides users with complete information on all supported cloud adapters and their configuration requirements.

#### 2. File Inventory
- **Modify**: `packages/infrastructure/README.md` (Add documentation for the missing adapters under the "Cloud Execution Adapters" heading)
- **Read-Only**: `packages/infrastructure/src/adapters/*.ts` (To verify configuration schemas and adapter behavior)

#### 3. Implementation Spec
- **Architecture**: Append the following adapter descriptions to the "Cloud Execution Adapters" list in `packages/infrastructure/README.md`:
  - **FlyMachinesAdapter**: Provisions and invokes rendering tasks on Fly.io Machines infrastructure using the Machines API. Configurable via API token, app name, and image reference.
  - **DockerAdapter**: Executes rendering chunks within isolated local Docker containers via `child_process.spawn`. Configurable with specific docker images and optional arguments.
  - **DenoDeployAdapter**: Provisions and invokes execution tasks on Deno Deploy. It constructs targeted JSON payloads detailing job execution coordinates (including remote `jobDefUrl` and `chunkId`) sent to a configurable service URL.
  - **HetznerCloudAdapter**: Provisions and invokes rendering tasks on Hetzner Cloud VMs. Configurable with an API token, server type, image, and optional SSH keys or location data.
  - **KubernetesAdapter**: Submits rendering jobs to a Kubernetes cluster using the Batch V1 API via `@kubernetes/client-node`. Provides fine-grained namespace and service account configurations.
  - **ModalAdapter**: Provisions and invokes execution tasks on Modal's serverless platform via endpoint URLs with optional Bearer token authentication.
  - **VercelAdapter**: Provisions and invokes rendering tasks on Vercel Serverless Functions. It constructs targeted JSON payloads detailing job execution coordinates (including remote `jobDefUrl` and `chunkId`) sent to a configurable service URL.
- **Pseudo-Code**: N/A - Documentation update only.
- **Public API Changes**: N/A
- **Dependencies**: None.
- **Cloud Considerations**: Provides clarity on specific cloud providers.

#### 4. Test Plan
- **Verification**: `grep -i "FlyMachinesAdapter" packages/infrastructure/README.md`
- **Success Criteria**: The README contains all 7 newly documented adapters.
- **Edge Cases**: N/A
- **Integration Verification**: N/A
