# CLI: AWS Lambda Deployment

## 1. Context & Goal
- **Objective**: Enable users to scaffold AWS Lambda deployment configuration for distributed rendering.
- **Trigger**: `AGENTS.md` V2 Platform Direction specifies "Helios must support distributed rendering suitable for cloud execution" and "Cloud execution adapter (AWS Lambda)" is a backlog item.
- **Impact**: Unlocks distributed rendering on AWS Lambda, allowing users to scale rendering jobs using serverless infrastructure.

## 2. File Inventory
- **Create**:
    - `packages/cli/src/templates/aws.ts`: Contains templates for Dockerfile, SAM template, Lambda handler, and README.
- **Modify**:
    - `packages/cli/src/commands/deploy.ts`: Register `aws` subcommand.
    - `packages/cli/src/commands/render.ts`: Update to respect `PUPPETEER_EXECUTABLE_PATH`.
- **Read-Only**:
    - `packages/cli/src/templates/gcp.ts` (for reference)
    - `packages/cli/src/types/job.ts`

## 3. Implementation Spec
- **Architecture**:
    - Add a new subcommand `helios deploy aws` that scaffolds files in the user's project.
    - Provide a Dockerfile optimized for AWS Lambda (using `public.ecr.aws/lambda/nodejs:18`) that installs Playwright dependencies.
    - Provide a SAM `template.yaml` for easy deployment.
    - Provide a `lambda.js` handler that bridges the Lambda event (chunk ID) to the `helios job run` command.
    - Ensure `helios render` (invoked by `job run`) respects `PUPPETEER_EXECUTABLE_PATH` so it uses the browser installed in the container.
- **Pseudo-Code**:
    - **`packages/cli/src/commands/render.ts`**:
        - In `registerRenderCommand`, read `process.env.PUPPETEER_EXECUTABLE_PATH`.
        - If present, set `renderOptions.browserConfig.executablePath` to this value.
    - **`packages/cli/src/templates/aws.ts`**:
        - Export const `LAMBDA_DOCKERFILE_TEMPLATE` with `FROM public.ecr.aws/lambda/nodejs:18`, `RUN npx playwright install --with-deps chromium`, etc.
        - Export const `SAM_TEMPLATE` with `AWS::Serverless::Function` definition.
        - Export const `LAMBDA_HANDLER_TEMPLATE` which exports `handler` function spawning `helios job run`.
    - **`packages/cli/src/commands/deploy.ts`**:
        - Import templates.
        - Register `.command('aws')`.
        - Prompt user to overwrite files.
        - Write files to CWD.
- **Public API Changes**:
    - New CLI command: `helios deploy aws`.
    - `helios render` now respects `PUPPETEER_EXECUTABLE_PATH` env var.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
    - Run `helios deploy aws` in a clean directory and verify `Dockerfile`, `template.yaml`, `lambda.js`, `README-AWS.md` are created.
    - Verify `helios render` picks up `PUPPETEER_EXECUTABLE_PATH` by setting it to a dummy path and checking logs/error message (e.g., "Using custom browser executable: ...").
- **Success Criteria**:
    - Files are created with correct content.
    - `helios render` log confirms custom executable path usage.
- **Edge Cases**:
    - Files already exist (should prompt).
    - User cancels prompt (should not overwrite).
