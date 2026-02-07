# 📋 STUDIO: Implement Distributed Job Spec Export

## 1. Context & Goal
- **Objective**: Implement the ability to export a distributed render job specification (JSON) directly from the Studio UI.
- **Trigger**: "Vision Gap" - Studio supports configuring distributed rendering (concurrency) but forces users to drop to CLI (`helios render --emit-job`) to actually generate the job spec for cloud execution.
- **Impact**: Unlocks the "Prototype Fast, Scale Later" workflow by allowing users to design and test locally, then easily "eject" to a cloud-ready job specification.

## 2. File Inventory
- **Modify**: `packages/studio/src/context/StudioContext.tsx` (Add `exportJobSpec` to context)
- **Modify**: `packages/studio/src/server/render-manager.ts` (Implement `generateJobSpec` logic)
- **Modify**: `packages/studio/src/server/plugin.ts` (Add `POST /api/render/job-spec` endpoint)
- **Modify**: `packages/studio/src/components/RendersPanel/RendersPanel.tsx` (Add "Export Job Spec" button)
- **Read-Only**: `packages/cli/src/commands/render.ts` (Reference for logic duplication)

## 3. Implementation Spec
- **Architecture**:
  - **Frontend**: Adds an "Export Job Spec" button to `RendersPanel`. When clicked, it calls `StudioContext.exportJobSpec()`.
  - **Context**: `exportJobSpec` sends a POST request to `/api/render/job-spec` with the current render configuration. Upon response, it triggers a browser download of the returned JSON.
  - **Backend**: The `/api/render/job-spec` endpoint delegates to `render-manager.ts`.
  - **Logic**: `render-manager.ts` implements `generateJobSpec` which duplicates the chunking and command generation logic found in the CLI. It constructs a `JobSpec` object containing metadata, chunks, and the merge command.
  - **Constraint**: Since `RenderOrchestrator` does not yet expose a public `plan()` method, we must duplicate the planning logic (chunk size calculation) in the Studio backend. This is accepted technical debt.

- **Pseudo-Code (render-manager.ts)**:
  ```typescript
  export interface RenderJobChunk {
    id: number;
    startFrame: number;
    frameCount: number;
    outputFile: string;
    command: string;
  }

  export interface JobSpec {
    metadata: { totalFrames: number; fps: number; width: number; height: number; duration: number };
    chunks: RenderJobChunk[];
    mergeCommand: string;
  }

  export function generateJobSpec(options: StartRenderOptions): JobSpec {
     // 1. Calculate total frames (from options.duration * options.fps or explicit frameCount)
     // 2. Determine concurrency (default 1)
     // 3. Calculate chunkSize = ceil(totalFrames / concurrency)
     // 4. Loop i from 0 to concurrency:
     //    - Calculate chunkStart and chunkCount
     //    - Construct chunk output path (part_i.mov)
     //    - Construct 'helios render' command args:
     //      - Force --audio-codec pcm_s16le
     //      - Respect width, height, fps, mode
     //    - Push to chunks array
     // 5. Generate 'helios merge' command with all chunk paths
     // 6. Return JobSpec object
  }
  ```

- **Public API Changes**:
  - New Endpoint: `POST /api/render/job-spec`
  - `StudioContext`: Added `exportJobSpec` method.

- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
  1. Create a verification script `tests/verify-job-export.ts` (using `tsx`) that starts the Studio server (or mocks the API handler) and sends a request to `/api/render/job-spec`.
  2. Assert the response is valid JSON and contains `chunks` and `mergeCommand`.
  3. Start the full Studio (`npx helios studio`) and manually click the button to verify the file download works in the browser.
- **Success Criteria**:
  - `JobSpec` JSON is generated correctly with `concurrency > 1`.
  - The generated commands in the JSON look correct (e.g. `helios render ...`).
- **Edge Cases**:
  - `concurrency=1` (Should still generate a spec, just 1 chunk).
  - Missing metadata (should default safely).
