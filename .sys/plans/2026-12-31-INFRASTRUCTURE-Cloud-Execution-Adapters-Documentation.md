#### 1. Context & Goal
- **Objective**: Document the remaining Cloud Execution Adapters (`DockerAdapter`, `DenoDeployAdapter`, and `HetznerCloudAdapter`) in the infrastructure package README.
- **Trigger**: The `packages/infrastructure/README.md` file is missing documentation for several existing Cloud Execution Adapters that have been implemented, violating the goal to document V2 features for clarity.
- **Impact**: Enhances documentation clarity and helps users understand how to configure and use these adapters for distributed rendering.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/infrastructure/README.md`
- **Read-Only**:
  - `packages/infrastructure/src/adapters/docker-adapter.ts`
  - `packages/infrastructure/src/adapters/deno-deploy-adapter.ts`
  - `packages/infrastructure/src/adapters/hetzner-cloud-adapter.ts`

#### 3. Implementation Spec
- **Architecture**: Add concise descriptions for the `DockerAdapter`, `DenoDeployAdapter`, and `HetznerCloudAdapter` within the `Cloud Execution Adapters` section of `packages/infrastructure/README.md`.
- **Pseudo-Code**: N/A
- **Public API Changes**: None (Documentation only).
- **Dependencies**: None.
- **Cloud Considerations**: N/A

#### 4. Test Plan
- **Verification**: `grep -E "DockerAdapter|DenoDeployAdapter|HetznerCloudAdapter" packages/infrastructure/README.md`
- **Success Criteria**: The README contains the added descriptions for each of the new adapters.
- **Edge Cases**: N/A
- **Integration Verification**: N/A
