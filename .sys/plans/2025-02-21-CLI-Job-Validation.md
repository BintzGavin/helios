# 2025-02-21-CLI-Job-Validation.md

## 1. Context & Goal
- **Objective**: Implement robust schema validation for distributed rendering job specifications using Zod.
- **Trigger**: Vision gap - "Distributed Rendering" requires reliability and robustness suitable for cloud execution. Current `helios job run` blindly trusts input JSON, leading to cryptic failures if the spec is malformed. Memory explicitly identifies this gap ("The `helios job run` command parses JSON job specifications but currently lacks schema validation").
- **Impact**: Ensures `helios job run` fails fast with clear errors when given invalid input. Improves developer experience and reliability of distributed workflows. Paves the way for safer cloud execution by establishing a strict contract for job specs.

## 2. File Inventory
- **Create**: `packages/cli/src/schemas/job.ts` (Define Zod schemas for Job Spec)
- **Modify**: `packages/cli/src/types/job.ts` (Update to export inferred types from Zod schemas to avoid duplication)
- **Modify**: `packages/cli/src/commands/job.ts` (Replace JSON.parse with Schema.parse and handle validation errors)
- **Modify**: `packages/cli/package.json` (Add `zod` dependency)

## 3. Implementation Spec
- **Architecture**:
  - Install `zod` library (`npm install zod` in `packages/cli`).
  - Define strictly typed Zod schemas for `RenderJobChunk`, `RenderJobMetadata`, and `JobSpec` in `src/schemas/job.ts`.
  - Infer TypeScript types from these schemas and export them from `src/types/job.ts` (re-exporting from schemas) to maintain type safety across the codebase.
  - Update `helios job run` command to parse the input file using `JobSpecSchema.parse()`.
  - Wrap the parsing logic in a try-catch block to catch `ZodError` and format it into a user-friendly error message (e.g., "Invalid job spec: chunks[0].id: Expected number, received string").

- **Pseudo-Code**:
  ```typescript
  // packages/cli/src/schemas/job.ts
  import { z } from 'zod';

  export const RenderJobChunkSchema = z.object({
    id: z.number(),
    startFrame: z.number(),
    frameCount: z.number(),
    outputFile: z.string(),
    command: z.string(),
  });

  export const RenderJobMetadataSchema = z.object({
    totalFrames: z.number(),
    fps: z.number(),
    width: z.number(),
    height: z.number(),
    duration: z.number(),
  });

  export const JobSpecSchema = z.object({
    metadata: RenderJobMetadataSchema,
    chunks: z.array(RenderJobChunkSchema),
    mergeCommand: z.string(),
  });

  // packages/cli/src/types/job.ts
  import { z } from 'zod';
  import { JobSpecSchema, RenderJobChunkSchema, RenderJobMetadataSchema } from '../schemas/job.js';

  export type JobSpec = z.infer<typeof JobSpecSchema>;
  export type RenderJobChunk = z.infer<typeof RenderJobChunkSchema>;
  export type RenderJobMetadata = z.infer<typeof RenderJobMetadataSchema>;

  // packages/cli/src/commands/job.ts
  import { JobSpecSchema } from '../schemas/job.js';
  import { ZodError } from 'zod';

  // Inside action:
  try {
    const content = fs.readFileSync(jobPath, 'utf-8');
    const rawJson = JSON.parse(content);
    const jobSpec = JobSpecSchema.parse(rawJson); // Validates structure
    // Proceed with execution using valid jobSpec...
  } catch (error) {
    if (error instanceof ZodError) {
       console.error(chalk.red('Invalid job specification:'));
       error.errors.forEach(err => {
         console.error(chalk.yellow(`- ${err.path.join('.')}: ${err.message}`));
       });
       process.exit(1);
    }
    throw error;
  }
  ```

- **Dependencies**:
  - `zod` (runtime dependency)

## 4. Test Plan
- **Verification**:
  1.  Run `npm run build` in `packages/cli` to ensure TypeScript compiles and changes are applied.
  2.  Create a valid `job.json` with correct structure (metadata, chunks, mergeCommand).
  3.  Run `helios job run job.json --no-merge --concurrency 1`.
  4.  Verify it proceeds to execution (chunks started).
  5.  Create an invalid `job-invalid.json` (e.g., missing `chunks` array, or `id` as string "1").
  6.  Run `helios job run job-invalid.json`.
  7.  Expect output: "Invalid job specification:" followed by specific field errors.
- **Success Criteria**:
  - Valid job specs execute correctly without regression.
  - Invalid job specs are rejected with clear, actionable error messages.
  - `zod` dependency is added correctly.

## 5. Pre Commit
- Complete pre commit steps to ensure proper testing, verifications, reviews and reflections are done.
