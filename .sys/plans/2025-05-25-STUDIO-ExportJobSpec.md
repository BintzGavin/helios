# 📋 STUDIO: Implement Export Job Spec

#### 1. Context & Goal
- **Objective**: Implement "Export Job Spec" functionality in Studio Renders Panel to generate a distributed render job JSON file.
- **Trigger**: Vision gap in "Distributed Rendering". Users need a way to generate job specs for cloud rendering directly from the Studio UI, matching the capabilities of the CLI (`--emit-job`).
- **Impact**: Unlocks distributed rendering workflows from the Studio interface. Studio becomes a first-class citizen for configuring and dispatching render jobs.

#### 2. File Inventory
- **Create**: None.
- **Modify**:
    - `packages/studio/src/server/render-manager.ts`: Add `getRenderJobSpec` logic and types.
    - `packages/studio/src/server/plugin.ts`: Add `POST /api/render/job-spec` endpoint.
    - `packages/studio/src/context/StudioContext.tsx`: Add `exportJobSpec` method.
    - `packages/studio/src/components/RendersPanel/RendersPanel.tsx`: Add "Export Spec" button.
- **Read-Only**:
    - `packages/renderer/src/Orchestrator.ts` (to understand chunk logic).
    - `packages/cli/src/commands/render.ts` (to align with CLI job spec format).

#### 3. Implementation Spec
- **Architecture**:
    - **Backend (Node.js)**: Replicate the chunk calculation logic from CLI in `render-manager.ts` (since `RenderOrchestrator` lacks a public `plan()` method). Expose this via a new API endpoint.
    - **Frontend (React)**: Add a button in `RendersPanel` that triggers the API and initiates a file download of the JSON spec.
- **Pseudo-Code**:
    - **`getRenderJobSpec`**:
        - Calculate `totalFrames` (from duration/fps or frame count).
        - Determine `chunkSize` based on `concurrency`.
        - Generate `chunks` array:
            - For each chunk `i`:
                - Calculate `startFrame`, `frameCount`.
                - Construct command: `helios render <compositionId>/composition.html ...` (using relative path).
        - Construct `mergeCommand`.
        - Return `JobSpec` object.
    - **API Endpoint**:
        - Handle `POST /api/render/job-spec`.
        - Validate `compositionId`.
        - Call `getRenderJobSpec`.
        - Return JSON.
    - **Frontend**:
        - `exportJobSpec` fetches the JSON and triggers browser download (`blob:` URL).
- **Public API Changes**:
    - New Endpoint: `POST /api/render/job-spec`
- **Dependencies**:
    - None.

#### 4. Test Plan
- **Verification**:
    - Run `npx helios studio`.
    - Create/Select a composition.
    - In "Server-Side Render", set Concurrency > 1.
    - Click "Export Spec".
    - Verify `job-<id>.json` is downloaded.
- **Success Criteria**:
    - JSON contains `metadata` (correct fps, dimensions).
    - JSON contains `chunks` (correct count, start frames).
    - Commands in JSON use relative paths (e.g., `my-comp/composition.html`).
- **Edge Cases**:
    - Concurrency = 1 (1 chunk).
    - Custom In/Out points (should restrict total frames).
    - Invalid Composition ID (Backend should 404/400).
