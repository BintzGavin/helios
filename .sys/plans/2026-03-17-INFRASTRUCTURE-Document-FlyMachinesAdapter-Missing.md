#### 1. Context & Goal
- **Objective**: Document the `FlyMachinesAdapter` under the "Cloud Execution Adapters" section in the README.
- **Trigger**: Vision gap - The adapter is implemented but not documented in the product surface.
- **Impact**: Provides users with clarity on how to utilize Fly.io Machines for distributed rendering, closing the documentation gap.

#### 2. File Inventory
- **Create**: None
- **Modify**:
  - `packages/infrastructure/README.md` (Add `FlyMachinesAdapter` entry)
- **Read-Only**:
  - `packages/infrastructure/src/adapters/fly-machines-adapter.ts` (To verify adapter features and capabilities)

#### 3. Implementation Spec
- **Architecture**: Update documentation to explain the `FlyMachinesAdapter` pattern.
- **Pseudo-Code**:
  - Insert a new bullet point under the "Cloud Execution Adapters" heading in `packages/infrastructure/README.md`.
  - Describe how it provisions and invokes tasks using the Fly.io Machines REST API.
  - Mention authentication via Bearer tokens (`apiToken`), VM lifecycle management (create, poll, stop), and the `imageRef` payload configuration.
- **Public API Changes**: None
- **Dependencies**: None
- **Cloud Considerations**: Notes its capability to launch distinct full VMs per chunk, highlighting its suitability for intensive WebGL/GPU renderings.

#### 4. Test Plan
- **Verification**: Run `npm run test` in `packages/infrastructure`.
- **Success Criteria**: Tests pass and the `README.md` file contains the new `FlyMachinesAdapter` documentation.
- **Edge Cases**: Verify that the Markdown formatting is consistent with the rest of the list.
- **Integration Verification**: Verify the link or format works appropriately within standard markdown viewers.