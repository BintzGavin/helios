# 2026-10-02 - PLAYER - Synchronize Caption Styling

#### 1. Context & Goal
- **Objective**: Ensure caption sizing and styling in the Player UI matches the client-side export (WYSIWYG), and allow customization via CSS variables.
- **Trigger**: Currently, the Player UI uses a fixed 16px font size for captions, while the Client-Side Exporter uses a dynamic size (5% of video height). This mismatch breaks the "Preview" promise, as exported captions appear much larger than in the preview.
- **Impact**: Users will see accurate caption sizing in the player preview before exporting, and will be able to customize caption styles (size, color, background) which are respected during export.

#### 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Implement CSS variables, responsive sizing via ResizeObserver, and pass styles to export)
- **Modify**: `packages/player/src/features/exporter.ts` (Update `drawCaptions` to use provided styles and responsive sizing logic)
- **Modify**: `packages/player/src/index.test.ts` (Add tests for style extraction and responsive behavior)

#### 3. Implementation Spec
- **Architecture**:
  - Introduce CSS variables for caption styling: `--helios-caption-scale` (default 0.05), `--helios-caption-color` (white), `--helios-caption-bg` (rgba(0,0,0,0.7)), `--helios-caption-font-family` (sans-serif).
  - Use `ResizeObserver` in `HeliosPlayer` to calculate a responsive font size (`height * scale`) and set it as an internal CSS variable (`--helios-internal-caption-font-size`).
  - Update `ClientSideExporter` to accept a `captionStyle` object in `export()` method options.
  - Ensure `ClientSideExporter.drawCaptions` uses the provided styles and scaling logic (relative to the frame height) to match the player's visual output.

- **Pseudo-Code**:
  ```typescript
  // packages/player/src/index.ts

  // In constructor
  this.resizeObserver = new ResizeObserver((entries) => {
    // ... existing logic
    const height = entry.contentRect.height;
    // Read scale from CSS variable or attribute, default to 0.05
    const scale = 0.05;
    const fontSize = Math.max(16, height * scale);
    this.style.setProperty('--helios-internal-caption-font-size', `${fontSize}px`);
  });

  // In CSS
  .caption-cue {
    font-size: var(--helios-internal-caption-font-size, 16px);
    color: var(--helios-caption-color, white);
    background: var(--helios-caption-bg, rgba(0, 0, 0, 0.7));
    font-family: var(--helios-caption-font-family, sans-serif);
  }

  // In export()
  const computedStyle = getComputedStyle(this);
  const captionStyle = {
      color: computedStyle.getPropertyValue('--helios-caption-color').trim() || 'white',
      backgroundColor: computedStyle.getPropertyValue('--helios-caption-bg').trim() || 'rgba(0, 0, 0, 0.7)',
      fontFamily: computedStyle.getPropertyValue('--helios-caption-font-family').trim() || 'sans-serif',
      // We pass the scale factor so exporter can calculate relative to resolution
      scale: parseFloat(computedStyle.getPropertyValue('--helios-caption-scale').trim()) || 0.05
  };

  await exporter.export({ ..., captionStyle });
  ```

  ```typescript
  // packages/player/src/features/exporter.ts

  // Interface update
  interface ExportOptions {
     // ...
     captionStyle?: {
         color?: string;
         backgroundColor?: string;
         fontFamily?: string;
         scale?: number;
     }
  }

  // In drawCaptions
  const scale = captionStyle?.scale ?? 0.05;
  const fontSize = Math.max(16, Math.round(height * scale));
  ctx.font = `${fontSize}px ${captionStyle?.fontFamily ?? 'sans-serif'}`;
  ctx.fillStyle = captionStyle?.backgroundColor ?? 'rgba(0, 0, 0, 0.7)';
  // Draw background...
  ctx.fillStyle = captionStyle?.color ?? 'white';
  // Draw text...
  ```

- **Public API Changes**:
  - `HeliosExportOptions` interface expanded to include `captionStyle`.
  - New CSS Variables exposed on `helios-player`.

- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm test -w packages/player`
- **Success Criteria**:
  - `packages/player/src/index.test.ts` passes.
  - New tests confirm that `captionStyle` is correctly populated in `export` calls.
  - New tests confirm that `ResizeObserver` logic updates the CSS variable.
- **Edge Cases**:
  - Player with 0 height (should fallback to min font size).
  - Missing CSS variables (should fallback to defaults).
  - Invalid scale values (should handle gracefully).
