#### 1. Context & Goal
- **Objective**: Improve documentation clarity for the governance module within the Infrastructure package.
- **Trigger**: The INFRASTRUCTURE domain is functionally aligned with the V2 vision (stateless workers, cloud adapters, artifact storage, and governance tooling are all implemented). According to AGENTS.md, "Documentation clarity / Knowledge Management" is a permitted fallback action when no feature gaps exist. The `governance` module (e.g., `syncWorkspaceDependencies`) lacks dedicated documentation explaining its purpose and constraints.
- **Impact**: Provides clear guidance on how internal versions are propagated safely across the monorepo without violating agent boundaries, ensuring future planners understand the governance rules.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/infrastructure/README.md` (Add a detailed section for the Governance module and `syncWorkspaceDependencies`)
- **Read-Only**: `packages/infrastructure/src/governance/sync-workspace.ts`, `AGENTS.md`

#### 3. Implementation Spec
- **Architecture**: Expand the existing README to include a detailed breakdown of the `governance` module.
- **Pseudo-Code**:
  - Open `packages/infrastructure/README.md`.
  - Locate the "Governance Tooling" section.
  - Expand this section to explain *why* it exists (referencing the "DEPENDENCY GOVERNANCE" law from `AGENTS.md`) and *how* `syncWorkspaceDependencies` operates (syncing dependencies during test/build processes without manual agent intervention).
- **Public API Changes**: None.
- **Dependencies**: None.
- **Cloud Considerations**: None directly, but robust governance ensures cloud adapters and worker runtimes are correctly versioned across the workspace.

#### 4. Test Plan
- **Verification**: Read the updated `README.md` to ensure the new section is present and clear.
- **Success Criteria**: The README includes a comprehensive explanation of the `governance` module and its alignment with `AGENTS.md` dependency laws.
- **Edge Cases**: None.
- **Integration Verification**: Ensure existing tests pass (`npm run test -w packages/infrastructure`) as a sanity check.