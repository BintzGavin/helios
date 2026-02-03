# 2026-08-17-STUDIO-Distributed-Rendering-Config.md

#### 1. Context & Goal
- **Objective**: Expose distributed rendering configuration (concurrency) in the Studio UI and connect it to the backend `RenderOrchestrator`.
- **Trigger**: The Studio supports single-process rendering, but the Renderer package now has a `RenderOrchestrator` for local distributed rendering (multi-process) which is not accessible from the Studio UI.
- **Impact**: Users can speed up renders by utilizing multiple CPU cores. This closes the gap "Studio: Expand features to support distributed rendering configuration".
- **Limitations**: The progress bar may behave erratically during multi-process rendering due to lack of aggregation in `RenderOrchestrator`. This is a known issue to be addressed in the Renderer domain.

#### 2. File Inventory
- **Modify**: `packages/studio/src/components/RendersPanel/RenderConfig.tsx` (Add concurrency input)
- **Modify**: `packages/studio/src/server/render-manager.ts` (Update `startRender` to use `RenderOrchestrator`)
- **Read-Only**: `packages/renderer/src/Orchestrator.ts` (Reference for API)

#### 3. Implementation Spec
- **Architecture**:
    -   The `RenderConfig` component will add a new field for "Concurrency".
    -   The `RenderManager` (backend) will receive this new option.
    -   Instead of directly instantiating `Renderer`, `RenderManager` will use the static `RenderOrchestrator.render` method, which internally handles both single and multi-process rendering.
- **Pseudo-Code**:
    -   **RenderConfig.tsx**:
        -   Add `concurrency` property to `RenderConfigData` interface (optional number).
        -   Add a numeric input field to the UI:
            -   Label: "Concurrency (Workers)"
            -   Min: 1
            -   Max: 32 (Safe limit)
            -   Default: 1
    -   **render-manager.ts**:
        -   Update `StartRenderOptions` interface to include `concurrency`.
        -   Import `RenderOrchestrator` and `DistributedRenderOptions` from `@helios-project/renderer`.
        -   In `startRender`, log: `console.log(\`[RenderManager] Starting distributed render job \${jobId} with concurrency \${options.concurrency || 1}\`);`
        -   Construct `DistributedRenderOptions` including `concurrency`.
        -   Replace `new Renderer().render(...)` with `await RenderOrchestrator.render(...)`.
- **Public API Changes**:
    -   `StartRenderOptions` in `render-manager` gains optional `concurrency: number`.
- **Dependencies**:
    -   `@helios-project/renderer` already exports `RenderOrchestrator`.

#### 4. Test Plan
- **Verification**:
    1.  Read `packages/studio/src/server/render-manager.ts` to confirm `RenderOrchestrator` is imported and used, and the log statement is present.
    2.  Navigate to `packages/studio`: `cd packages/studio`.
    3.  Start Studio dev server: `npm run dev`.
    4.  Open browser to Studio URL.
    5.  Open Renders Panel.
    6.  Verify "Concurrency (Workers)" input exists and defaults to 1.
    7.  Set Concurrency to 2.
    8.  Start a render of a simple composition.
    9.  Check terminal output: Should see "[RenderManager] Starting distributed render job ... with concurrency 2".
    10. Verify output video plays correctly.
- **Success Criteria**:
    -   Render completes successfully with concurrency > 1.
    -   Output video is valid.
- **Edge Cases**:
    -   Concurrency = 1 (Should work exactly as before).
    -   Concurrency > Frame Count (Orchestrator handles this).
    -   Cancellation (Verify `AbortSignal` propagates to Orchestrator).
- **Pre-Commit**:
    -   Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
