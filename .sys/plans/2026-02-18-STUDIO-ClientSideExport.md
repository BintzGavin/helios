# Context & Goal
- **Objective**: Implement Client-Side Video Export (WebCodecs) in the Studio UI.
- **Trigger**: Vision gap ("Client-Side WebCodecs as Primary Export" is planned but hidden in UI).
- **Impact**: Allows users to export MP4/WebM videos directly from the browser without server-side rendering, leveraging local GPU. This fulfills a key Vision V1.x promise.

# File Inventory
- **Modify**: `packages/studio/src/context/StudioContext.tsx`
    - Import `ClientSideExporter` from `@helios-project/player`.
    - Add `exportVideo(options)` function to `StudioContextType`.
    - Add `isExporting` (boolean) and `exportProgress` (number) state.
    - Implement export logic using `ClientSideExporter`.
- **Modify**: `packages/studio/src/components/RendersPanel/RendersPanel.tsx`
    - Add UI section for "Client Export".
    - Add Format selector (MP4/WebM).
    - Add "Export Video" button.
    - Display progress bar and "Cancel" button during export.
- **Read-Only**: `packages/player/src/features/exporter.ts` (Reference implementation).

# Implementation Spec
- **Architecture**:
    - `StudioContext` holds the export state (`isExporting`, `progress`).
    - `exportVideo` instantiates `ClientSideExporter` using the current `controller` (Direct/Bridge).
    - Since `ClientSideExporter` is framework-agnostic, we can use it directly.
    - We will pass a dummy `iframe` to `ClientSideExporter` constructor if required by type signature, as it is unused in the export method (verified via code analysis).
    - We will use `AbortController` to handle cancellation.
    - **Note**: `ClientSideExporter` is already implemented in `@helios-project/player`, we are just surfacing it in the Studio UI.

- **Pseudo-Code**:
    ```typescript
    // StudioContext.tsx
    import { ClientSideExporter } from '@helios-project/player';

    // In StudioProvider...
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);
    const abortControllerRef = useRef<AbortController | null>(null);

    const exportVideo = async (format: 'mp4' | 'webm') => {
        if (!controller) return;
        setIsExporting(true);
        setExportProgress(0);
        abortControllerRef.current = new AbortController();

        // iframe arg is legacy/unused in export(), passing null casted or dummy
        // Check constructor signature: (controller: HeliosController, iframe: HTMLIFrameElement)
        const exporter = new ClientSideExporter(controller, null as unknown as HTMLIFrameElement);

        try {
            await exporter.export({
                format,
                mode: 'canvas', // Default to canvas for performance
                onProgress: setExportProgress,
                signal: abortControllerRef.current.signal,
                includeCaptions: true // Or driven by UI toggle if we want
            });
        } catch (e: any) {
            if (e.message !== "Export aborted") {
                console.error("Export failed", e);
                // Optionally set error state to show in UI
            }
        } finally {
            setIsExporting(false);
            abortControllerRef.current = null;
        }
    };

    const cancelExport = () => {
        abortControllerRef.current?.abort();
    };
    ```

    ```typescript
    // RendersPanel.tsx
    // Add new section at top or bottom
    <div className="client-export-section">
      <h3>Client-Side Export</h3>
      <div className="export-controls">
         <select value={format} onChange={...}>
            <option value="mp4">MP4 (H.264)</option>
            <option value="webm">WebM (VP9)</option>
         </select>
         {isExporting ? (
             <button onClick={cancelExport} className="cancel-btn">Cancel</button>
         ) : (
             <button onClick={() => exportVideo(format)} className="export-btn">Export Video</button>
         )}
      </div>
      {isExporting && (
          <div className="progress-bar">
              <div style={{ width: `${exportProgress * 100}%` }} />
          </div>
      )}
    </div>
    ```

- **Dependencies**:
    - `@helios-project/player` must export `ClientSideExporter` (Verified).
    - `@helios-project/studio` must depend on `@helios-project/player` (Verified).

# Test Plan
- **Verification**:
    1. Run `npm run dev` (or `npx helios studio` if linked).
    2. Open "Renders" panel in the Studio UI.
    3. Verify "Client-Side Export" section is visible.
    4. Select "MP4" and click "Export Video".
    5. Verify progress bar updates (0% -> 100%).
    6. Verify browser downloads `video.mp4` upon completion.
    7. Play the downloaded video to verify content and audio.
    8. Try exporting again and click "Cancel" mid-way; verify process stops.
- **Success Criteria**:
    - Video downloads successfully.
    - UI correctly reflects "Exporting" state.
    - No console errors during happy path.
- **Edge Cases**:
    - **No Controller**: Button should be disabled if no composition is loaded.
    - **Unsupported Browser**: `ClientSideExporter` throws error if `VideoEncoder` is missing; verify error is logged (or handled gracefully).
