#### 1. Context & Goal
- **Objective**: Synchronize the `@helios-project/infrastructure` dependency version in `packages/cli/package.json`.
- **Trigger**: The infrastructure package has evolved to `0.24.0` with significant distributed rendering capabilities (`JobManager`, `JobExecutor` with artifact storage, etc.), but the CLI is still depending on an outdated version (`^0.13.0`).
- **Impact**: Upgrading this dependency unblocks the CLI domain from implementing the V2 requirement to emit and orchestrate distributed rendering jobs correctly using the newest features.

#### 2. File Inventory
- **Create**:
  - None
- **Modify**:
  - `packages/cli/package.json`
- **Read-Only**:
  - `packages/infrastructure/package.json`

#### 3. Implementation Spec
- **Architecture**: A simple version bump in the `package.json` file.
- **Pseudo-Code**:
  - Open `packages/cli/package.json`.
  - Locate the `dependencies` block.
  - Change `"@helios-project/infrastructure": "^0.13.0"` to `"@helios-project/infrastructure": "^0.24.0"`.
- **Public API Changes**: None directly, but it exposes the newer infrastructure API to the CLI.
- **Dependencies**: None.
- **Cloud Considerations**: Enables the CLI to securely pass storage configurations for cloud deployments.

#### 4. Test Plan
- **Verification**: Run `npm install` from the root directory to verify the workspace resolves correctly. Then run `npm run lint` and `npm run test` in `packages/cli` to verify no typing breakages occurred due to the infrastructure update.
- **Success Criteria**: `packages/cli` successfully compiles and its tests pass with the new infrastructure version.
- **Edge Cases**: N/A
- **Integration Verification**: The CLI build succeeds via `npm run build -w packages/cli`.
