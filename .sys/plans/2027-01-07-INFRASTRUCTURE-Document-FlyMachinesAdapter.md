#### 1. Context & Goal
- **Objective**: Document the `FlyMachinesAdapter` in the infrastructure README and mark it as complete in the backlog.
- **Trigger**: The adapter has been implemented (`packages/infrastructure/src/adapters/fly-machines-adapter.ts`) but lacks documentation in the Cloud Execution Adapters section and is unchecked in `docs/BACKLOG.md`.
- **Impact**: Enables users to discover and configure distributed rendering on Fly.io infrastructure and accurately reflects project completion state.

#### 2. File Inventory
- **Create**: [None]
- **Modify**:
  - `packages/infrastructure/README.md`: Add FlyMachinesAdapter details to the Cloud Execution Adapters section.
  - `docs/BACKLOG.md`: Check off Fly.io Machines adapter.
- **Read-Only**: `packages/infrastructure/src/adapters/fly-machines-adapter.ts`

#### 3. Implementation Spec
- **Architecture**: Update the documentation to reflect the existing adapter pattern and update backlog completion state.
- **Pseudo-Code**:
  - In `packages/infrastructure/README.md`, add `- **FlyMachinesAdapter**: Provisions and invokes containerized rendering tasks on Fly.io using the native \`fetch\` API via HTTP POST to the Machines API. It constructs machine definitions containing job and chunk coordinates injected as \`HELIOS_JOB_PAYLOAD\` environment variables, provisions machines with \`auto_destroy\` enabled, polls for execution completion by repeatedly fetching machine state, and manages machine lifecycle cleanup via explicit DELETE requests.` to the `### Cloud Execution Adapters` section.
  - In `docs/BACKLOG.md`, change `- [ ] **Cloud execution adapter (Fly.io Machines).**` to `- [x] **Cloud execution adapter (Fly.io Machines).**`
- **Public API Changes**: [None]
- **Dependencies**: [None]
- **Cloud Considerations**: Notes that it uses `fetch` to create, poll, and delete machines using the Fly.io Machines API via bearer token authentication.

#### 4. Test Plan
- **Verification**: `cd packages/infrastructure && npm run lint`
- **Success Criteria**: Linter passes and documentation correctly describes the adapter.
- **Edge Cases**: [None]
- **Integration Verification**: Read `docs/BACKLOG.md` and `packages/infrastructure/README.md` to ensure modifications were applied.
