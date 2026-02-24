# 2026-03-01-CLI-GCP-Stateless-Job.md

## 1. Context & Goal
- **Objective**: Update the GCP deployment template to support dynamic, stateless job execution via environment variables.
- **Trigger**: The "Stateless worker architecture" vision requires avoiding per-job container rebuilds. The current GCP template hardcodes `job.json`, forcing a rebuild for every new render job.
- **Impact**: Enables users to deploy a single worker image and execute different render jobs (uploaded to URLs) by overriding an environment variable, significantly reducing iteration time and cost.

## 2. File Inventory
- **Modify**: `packages/cli/src/templates/gcp.ts` (Update `CLOUD_RUN_JOB_TEMPLATE` and `README_GCP_TEMPLATE`)
- **Read-Only**: `packages/cli/src/commands/deploy.ts` (Consumes the template), `packages/cli/src/commands/__tests__/deploy.test.ts` (Verifies the template usage)

## 3. Implementation Spec
- **Architecture**:
  - Introduce `HELIOS_JOB_SPEC` environment variable in the Cloud Run Job definition, defaulting to `job.json`.
  - Update the entrypoint args to use this variable: `npm exec -- helios job run ${HELIOS_JOB_SPEC} --chunk ${CLOUD_RUN_TASK_INDEX}`.
- **Pseudo-Code (Template Change)**:
  ```yaml
  # In CLOUD_RUN_JOB_TEMPLATE
  args:
    - "npm exec -- helios job run ${HELIOS_JOB_SPEC} --chunk ${CLOUD_RUN_TASK_INDEX}"
  env:
    - name: HELIOS_JOB_SPEC
      value: "job.json"
  ```
- **Documentation Update**:
  - Update `README_GCP_TEMPLATE` to add a section on "Stateless / Remote Job Execution".
  - Explain how to upload `job.json` to a URL (e.g., GCS) and trigger the job with `--update-env-vars HELIOS_JOB_SPEC=...`.

## 4. Test Plan
- **Verification**:
  - Run `helios deploy gcp` in a clean directory (manual check).
  - Verify `cloud-run-job.yaml` contains the `HELIOS_JOB_SPEC` env var and usage in `args`.
  - Verify `README-GCP.md` contains the new instructions.
  - Run `npm test` within `packages/cli` to ensure the template changes do not break existing `deploy` command tests (which import the template variables directly).
- **Success Criteria**:
  - The generated YAML is valid.
  - The command line args use the shell variable syntax correctly.
  - Unit tests pass.
- **Edge Cases**:
  - Ensure the shell variable syntax `${VAR}` works within the YAML list item string (it should be passed to `/bin/sh -c` as a string).

## 5. Pre-Commit
- Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
