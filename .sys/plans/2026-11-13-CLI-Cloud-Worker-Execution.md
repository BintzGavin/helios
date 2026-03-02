# 2026-11-13-CLI-Cloud-Worker-Execution

## 1. Context & Goal
- **Objective**: Integrate infrastructure cloud adapters (`AwsLambdaAdapter`, `CloudRunAdapter`) into the CLI `job run` command.
- **Trigger**: Vision gap: "Primary interface for ... workflows". Currently, `helios job run` only uses `LocalWorkerAdapter` and hardcodes local execution. To fulfill the distributed rendering vision, the CLI must expose the ability to use cloud adapters.
- **Impact**: Unlocks true distributed rendering by allowing users to dispatch rendering chunks to AWS Lambda or Google Cloud Run directly from the CLI.

## 2. File Inventory
- **Create**: None
- **Modify**:
  - `packages/cli/src/commands/job.ts`: Add CLI options for AWS and GCP, parse them, and instantiate the correct `WorkerAdapter`.
- **Read-Only**:
  - `packages/infrastructure/src/adapters/aws-adapter.ts`: To understand constructor parameters.
  - `packages/infrastructure/src/adapters/cloudrun-adapter.ts`: To understand constructor parameters.

## 3. Implementation Spec
- **Architecture**:
  - Add `--adapter <type>` option to `job run` (values: `local`, `aws`, `gcp`). Default is `local`.
  - Add AWS-specific options: `--aws-region`, `--aws-function-name`, `--aws-job-def-url`.
  - Add GCP-specific options: `--gcp-service-url`, `--gcp-job-def-url`.
  - In `action`, instantiate the correct adapter based on the `--adapter` option.
  - Throw helpful errors if required options for the selected adapter are missing.
- **Pseudo-Code**:
  - `import { AwsLambdaAdapter, CloudRunAdapter, LocalWorkerAdapter }` from `@helios-project/infrastructure`
  - Add `.option('--adapter <type>', 'Adapter to use (local, aws, gcp)', 'local')`
  - Add other options.
  - In action:
    ```typescript
    let adapter: WorkerAdapter;
    if (options.adapter === 'aws') {
      if (!options.awsFunctionName) throw new Error('...');
      adapter = new AwsLambdaAdapter({
         region: options.awsRegion,
         functionName: options.awsFunctionName,
         jobDefUrl: options.awsJobDefUrl || file // fallback to file if it's a URL
      });
    } else if (options.adapter === 'gcp') {
      // ... similar for gcp ...
    } else {
      adapter = new LocalWorkerAdapter();
    }
    ```
- **Public API Changes**: Adds new CLI options to the `job run` command.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: Run `npm run test` and `npm run build` in the CLI directory.
- **Success Criteria**: The CLI parses the new adapter options and successfully instantiates the requested adapter. Running `helios job run http://example.com/job.json --adapter aws --aws-function-name my-func` should attempt to use the AWS adapter.
- **Edge Cases**: Missing required flags for a specific adapter, invalid adapter type.
