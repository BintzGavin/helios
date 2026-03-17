# INFRASTRUCTURE: Quickstart Documentation

## 1. Context & Goal
- **Objective**: Add a Quickstart guide to the Infrastructure package README.
- **Trigger**: Backlog item "Documentation: Add Quickstart guide." under Maintenance & Stability.
- **Impact**: Provides users with a clear, step-by-step example of how to use the infrastructure orchestrator and cloud adapters to submit and manage a distributed rendering job.

## 2. File Inventory
- **Create**:
  - None
- **Modify**:
  - `packages/infrastructure/README.md`: Add a new "Quickstart" section demonstrating the usage of `JobManager`, `FileJobRepository`, and a `WorkerAdapter`.
- **Read-Only**:
  - `packages/infrastructure/src/orchestrator/job-manager.ts`: Reference the API.
  - `packages/infrastructure/examples/job-manager-standalone.ts`: Use as inspiration for the Quickstart snippet.

## 3. Implementation Spec
- **Architecture**:
  - Add a `## Quickstart` section below `## Features` in the README.
- **Pseudo-Code**:
  - Initialize a `FileJobRepository`.
  - Initialize a `VideoStitcher` (e.g., `FfmpegStitcher`).
  - Initialize a `WorkerAdapter` (e.g., `LocalWorkerAdapter`).
  - Initialize `JobManager` with these components.
  - Demonstrate calling `submitJob` with a minimal `JobSpec`.
- **Public API Changes**: None. Documentation only.
- **Dependencies**: None.
- **Cloud Considerations**: The Quickstart should mention that `LocalWorkerAdapter` is used for demonstration, but can be easily swapped with `AwsLambdaAdapter` or others.

## 4. Test Plan
- **Verification**: `npm run test -w packages/infrastructure`
- **Success Criteria**: Tests still pass, and the README clearly explains how to bootstrap a job.
- **Edge Cases**: None.
- **Integration Verification**: The example code in the Quickstart should be syntactically correct and align with the actual exported APIs.
