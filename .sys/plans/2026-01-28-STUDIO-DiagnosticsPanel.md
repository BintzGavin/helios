# 1. Context & Goal
- **Objective**: Implement a System Diagnostics panel in Studio that reports both Client-side (Browser Preview) and Server-side (Headless Renderer) capabilities.
- **Trigger**: The Vision requires "Diagnostics for AI Environments" to help agents and users debug environment issues (e.g., missing GPU support, WebCodecs availability).
- **Impact**: Provides visibility into the dual-environment nature of Helios (Preview vs Render) and helps diagnose why a composition might work in one but fail in the other.

# 2. File Inventory
- **Create**:
  - `packages/studio/src/components/DiagnosticsModal.tsx`: New component for the modal UI.
  - `packages/studio/src/components/DiagnosticsModal.css`: Styles for the modal.
- **Modify**:
  - `packages/studio/src/server/render-manager.ts`: Add `diagnoseServer` function which calls `Renderer.diagnose`.
  - `packages/studio/vite-plugin-studio-api.ts`: Add `/api/diagnose` endpoint.
  - `packages/studio/src/context/StudioContext.tsx`: Add `isDiagnosticsOpen` state and setter.
  - `packages/studio/src/components/Sidebar/Sidebar.tsx`: Add Diagnostics button (pulse icon) to footer.
  - `packages/studio/src/App.tsx`: Render `DiagnosticsModal`.
- **Read-Only**:
  - `packages/core/src/index.ts` (To verify `Helios.diagnose`)
  - `packages/renderer/src/index.ts` (To verify `Renderer.diagnose`)

# 3. Implementation Spec
- **Architecture**:
  - **Server-Side**: Expose `Renderer.diagnose()` via a new API endpoint. This instantiates a headless browser and checks its capabilities.
  - **Client-Side**: Use `Helios.diagnose()` (from `@helios-project/core`) in the browser to check local capabilities.
  - **UI**: A modal displaying a side-by-side comparison of "Studio Preview" (Client) and "Production Renderer" (Server) capabilities.
- **Pseudo-Code**:
  - `render-manager.ts`: Export `diagnoseServer()` which awaits `new Renderer({ mode: 'canvas' }).diagnose()`.
  - `vite-plugin-studio-api.ts`: Route `GET /api/diagnose` -> `diagnoseServer()`.
  - `StudioContext`: `isDiagnosticsOpen` state.
  - `DiagnosticsModal`:
    - On mount: Call `Helios.diagnose()` (client) and `fetch('/api/diagnose')` (server).
    - Render two columns.
    - Show checkmarks/crosses for `webCodecs`, `waapi`, `offscreenCanvas`.
    - Show `userAgent` string.
- **Public API Changes**:
  - `StudioContext`: Added `isDiagnosticsOpen` (boolean) and `setDiagnosticsOpen` (setter).
  - API: `GET /api/diagnose` returns JSON with server diagnostic report.
- **Dependencies**: None.

# 4. Test Plan
- **Verification**:
  - Run `npx helios studio`.
  - Click the new "Diagnostics" (pulse icon) button in the Sidebar footer.
  - Verify the modal opens.
  - Verify "Studio Preview" column populates immediately (Client data).
  - Verify "Production Renderer" column shows "Loading..." then populates (Server data).
  - Confirm key metrics (WebCodecs, OffscreenCanvas, UserAgent) are visible for both.
- **Success Criteria**:
  - Both Client and Server diagnostics are successfully retrieved and displayed.
- **Edge Cases**:
  - Server diagnostics fail (e.g., browser launch error) -> Show error message in Server column.
