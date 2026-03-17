#### 1. Context & Goal
- **Objective**: Document the `FlyMachinesAdapter` in the infrastructure README.md.
- **Trigger**: The adapter has been implemented but lacks documentation in the Cloud Execution Adapters section.
- **Impact**: Enables users to discover and configure distributed rendering on Fly.io infrastructure.

#### 2. File Inventory
- **Create**: [None]
- **Modify**: `packages/infrastructure/README.md`
- **Read-Only**: `packages/infrastructure/src/adapters/fly-machines-adapter.ts`

#### 3. Implementation Spec
- **Architecture**: Update the documentation.
- **Pseudo-Code**:
  - Add `- **FlyMachinesAdapter**: Provisions and invokes containerized rendering tasks on Fly.io using the native \`fetch\` API via HTTP POST to the Machines API. It constructs machine definitions containing job and chunk coordinates injected as \`HELIOS_JOB_PAYLOAD\` environment variables, provisions machines with \`auto_destroy\` enabled, polls for execution completion by repeatedly fetching machine state, and manages machine lifecycle cleanup via explicit DELETE requests.` to the `### Cloud Execution Adapters` section of `packages/infrastructure/README.md`.
- **Public API Changes**: [None]
- **Dependencies**: [None]
- **Cloud Considerations**: Notes that it uses `fetch` to create, poll, and delete machines using the Fly.io Machines API via bearer token authentication.

#### 4. Test Plan
- **Verification**: `cd packages/infrastructure && npm run lint`
- **Success Criteria**: Linter passes.
- **Edge Cases**: [None]
- **Integration Verification**: [None]
