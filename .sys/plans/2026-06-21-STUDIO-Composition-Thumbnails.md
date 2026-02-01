# Context & Goal
- **Objective**: Implement the ability to set and view thumbnails for compositions in Helios Studio.
- **Trigger**: Vision alignment ("Visual Studio" environment) and UX gap (Composition Switcher is text-only).
- **Impact**: Improves navigation speed and project management by providing visual cues for compositions in the Switcher and Settings.

# File Inventory
- **Create**: None.
- **Modify**:
  - `packages/studio/src/server/discovery.ts`: Update `findCompositions` to detect `thumbnail.png` and update `CompositionInfo` interface.
  - `packages/studio/src/server/plugin.ts`: Add `POST /api/compositions/:id/thumbnail` endpoint.
  - `packages/studio/src/context/StudioContext.tsx`: Add `updateThumbnail` function, update `Composition` interface.
  - `packages/studio/src/components/CompositionSettingsModal.tsx`: Add thumbnail preview and "Update from Current Frame" button.
  - `packages/studio/src/components/CompositionSwitcher.tsx`: Display thumbnail in the list.
- **Read-Only**: `packages/studio/src/components/Stage/Stage.tsx` (reference for capture logic).

# Implementation Spec

## Architecture
- **Backend**:
  - `discovery.ts` will check for `thumbnail.png` in each composition directory.
  - `plugin.ts` will handle the upload of the thumbnail image (binary/base64) and save it to the composition directory.
  - `CompositionInfo` will include a `thumbnailUrl` property (e.g., `/@fs/.../thumbnail.png`).
- **Frontend**:
  - `StudioContext` will reuse the logic from `takeSnapshot` (rendering current frame to a canvas) but instead of downloading, it will `blob` it and `POST` to the new endpoint.
  - `CompositionSettingsModal` will display the current `thumbnailUrl` (if exists) and provide a button to trigger the update.
  - `CompositionSwitcher` will show the thumbnail on the left side of the composition name.

## Pseudo-Code

**Backend (`discovery.ts`):**
```typescript
interface CompositionInfo {
  // ... existing fields
  thumbnailUrl?: string;
}

function findCompositions(...) {
  // ...
  const thumbPath = path.join(dir, 'thumbnail.png');
  let thumbnailUrl;
  if (fs.existsSync(thumbPath)) {
    thumbnailUrl = `/@fs${thumbPath}`; // Use standard Vite fs serving
  }
  // ... return info with thumbnailUrl
}
```

**Backend (`plugin.ts`):**
```typescript
// POST /api/compositions/:id/thumbnail
// Body: Raw image data or FormData
// Action: Write to {compDir}/thumbnail.png
```

**Frontend (`StudioContext.tsx`):**
```typescript
interface Composition {
  // ... existing
  thumbnailUrl?: string;
}

const updateThumbnail = async (compId: string) => {
  // 1. Capture current frame (reuse logic from takeSnapshot)
  const result = await controller.captureFrame(...)
  // 2. Draw to canvas (resize to max 320px width), get blob
  canvas.toBlob(blob => {
    // 3. POST to /api/compositions/:id/thumbnail
    fetch(..., { method: 'POST', body: blob })
    // 4. Refresh compositions
    fetchCompositions()
  })
}
```

## Public API Changes
- `CompositionInfo` interface (internal to Studio) updated.
- New API Endpoint: `POST /api/compositions/:id/thumbnail`.

## Dependencies
- None.

# Test Plan
- **Verification**:
  1. Open Studio (`npx helios studio`).
  2. Select a composition.
  3. Move playhead to a distinct frame.
  4. Open "Settings" (gear icon or menu).
  5. Click "Update Thumbnail".
  6. Verify the thumbnail appears in the modal.
  7. Open "Switcher" (Cmd+K).
  8. Verify the thumbnail appears next to the composition name.
  9. Restart Studio.
  10. Verify thumbnail persists.
- **Success Criteria**:
  - Thumbnail is saved to disk as `thumbnail.png`.
  - Thumbnail is displayed in Switcher and Settings.
  - Logic handles missing thumbnails gracefully (no broken image icons).
- **Edge Cases**:
  - Read-only file system (should error gracefully).
  - Composition with same name/ID issues (handled by ID lookup).
  - Very large images (canvas `toBlob` handles compression, resize to 320px width).
