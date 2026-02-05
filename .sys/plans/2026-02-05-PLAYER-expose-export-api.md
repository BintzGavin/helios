# 2026-02-05-PLAYER-expose-export-api

#### 1. Context & Goal
- **Objective**: Expose a public `export()` method on the `<helios-player>` Web Component to allow programmatic triggering of client-side exports.
- **Trigger**: The current export functionality is tightly coupled to the internal "Export" button, preventing external control or custom UI implementations. Users cannot trigger exports programmatically, and using `controlslist="nodownload"` effectively disables the feature entirely.
- **Impact**: Unlocks custom player interfaces, automated workflows, and better Agent Experience by allowing scripts/agents to trigger exports without simulating user interactions.

#### 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Implement `export()` method, refactor `renderClientSide`)
- **Modify**: `packages/player/src/features/exporter.ts` (Remove unused `iframe` parameter from constructor)
- **Modify**: `packages/player/src/features/exporter.test.ts` (Update test instantiation of `ClientSideExporter`)

#### 3. Implementation Spec
- **Architecture**:
    - The `HeliosPlayer` class will expose a public async `export(options)` method.
    - `ClientSideExporter` will be decoupled from the `iframe` element (which was unused).
    - The internal `renderClientSide` method (UI handler) will be refactored to use the new public `export()` method, ensuring consistent behavior (locking UI, handling errors).

- **Public API Changes**:
    ```typescript
    // New Interface
    export interface HeliosExportOptions {
      format?: 'mp4' | 'webm';
      filename?: string;
      mode?: 'auto' | 'canvas' | 'dom';
      width?: number;
      height?: number;
      bitrate?: number;
      includeCaptions?: boolean;
      onProgress?: (progress: number) => void;
      signal?: AbortSignal;
      canvasSelector?: string;
    }

    // HeliosPlayer Class
    public async export(options?: HeliosExportOptions): Promise<void>;
    ```

- **Pseudo-Code**:
    ```typescript
    // packages/player/src/features/exporter.ts
    export class ClientSideExporter {
      // Remove iframe from constructor
      constructor(private controller: HeliosController) {}
      // ...
    }

    // packages/player/src/index.ts
    export class HeliosPlayer extends HTMLElement {
      // ...
      public async export(options: HeliosExportOptions = {}): Promise<void> {
         if (this.isExporting) throw new Error("Already exporting");
         if (!this.controller) throw new Error("Not connected");

         this.isExporting = true;
         this.lockPlaybackControls(true);

         try {
             // Merge options with attributes (options take precedence)
             const finalOptions = {
                 mode: options.mode || (this.getAttribute('export-mode') as any) || 'auto',
                 format: options.format || (this.getAttribute('export-format') as any) || 'mp4',
                 filename: options.filename || this.getAttribute('export-filename') || 'video',
                 width: options.width || parseFloat(this.getAttribute('export-width') || ''),
                 height: options.height || parseFloat(this.getAttribute('export-height') || ''),
                 bitrate: options.bitrate || parseInt(this.getAttribute('export-bitrate') || ''),
                 canvasSelector: options.canvasSelector || this.getAttribute('canvas-selector') || 'canvas',
                 includeCaptions: options.includeCaptions ?? this.showCaptions, // Default to UI state if not specified
                 ...options
             };

             // Handle caption-mode logic if using attributes (UI logic might need to be replicated or moved here)
             // But 'includeCaptions' in options overrides it.

             const exporter = new ClientSideExporter(this.controller);
             await exporter.export(finalOptions);
         } finally {
             this.isExporting = false;
             this.lockPlaybackControls(false);
         }
      }

      // Refactor renderClientSide to use this.export()
      private renderClientSide = async () => {
          // Setup AbortController, UI text update ('Cancel')
          // Call this.export({ signal: this.abortController.signal, onProgress: ... })
          // Handle errors (show status)
      }
    }
    ```

- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm test -w packages/player`
- **Success Criteria**:
    - `ClientSideExporter` tests pass with updated constructor.
    - `HeliosPlayer` can initiate export programmatically (mocked in unit test).
    - Internal "Export" button still functions correctly (regression test).
- **Edge Cases**:
    - Calling `export()` while another export is in progress (should throw).
    - Calling `export()` when disconnected (should throw).
    - Aborting the export via signal.
