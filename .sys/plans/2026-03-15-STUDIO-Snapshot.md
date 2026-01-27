# 2026-03-15 - Studio Snapshot Feature

#### 1. Context & Goal
- **Objective**: Implement a "Take Snapshot" feature in the Studio Stage to allow users to instantly download the current frame as a PNG image.
- **Trigger**: The Vision promises a WYSIWYG editing experience. Being able to capture and verify a static frame confirms the output quality without running a full render job.
- **Impact**: Enables quick visual verification, thumbnail generation, and sharing of work-in-progress frames.

#### 2. File Inventory
- **Modify**: `packages/studio/src/context/StudioContext.tsx` (Add `takeSnapshot` method)
- **Modify**: `packages/studio/src/components/Stage/Stage.tsx` (Pass `takeSnapshot` to toolbar)
- **Modify**: `packages/studio/src/components/Stage/StageToolbar.tsx` (Add Snapshot button)

#### 3. Implementation Spec
- **Architecture**:
  - The `StudioContext` holds the `HeliosController` reference.
  - The `takeSnapshot` method calls `controller.captureFrame()`.
  - We use the browser's `canvas` API to convert the `VideoFrame` to a PNG Data URL.
  - We use a temporary `<a>` tag to trigger the download.
  - The feature respects the current `renderConfig.mode` (Canvas vs DOM) to ensure the snapshot matches the selected render strategy.

- **Pseudo-Code (StudioContext.takeSnapshot)**:
```typescript
async function takeSnapshot() {
  if (!controller) return;

  const frameNumber = playerState.currentFrame;
  const mode = renderConfig.mode;

  try {
    const videoFrame = await controller.captureFrame(frameNumber, { mode });
    if (!videoFrame) return; // Handle error/null

    const canvas = document.createElement('canvas');
    canvas.width = videoFrame.displayWidth;
    canvas.height = videoFrame.displayHeight;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.drawImage(videoFrame, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');

      const compName = activeComposition?.name || 'composition';
      const filename = `snapshot-${compName}-${frameNumber}.png`;

      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = filename;
      a.click();
    }

    videoFrame.close(); // Important resource cleanup
  } catch (e) {
    console.error("Snapshot failed", e);
  }
}
```

- **Public API Changes**:
  - `StudioContext`: `takeSnapshot: () => Promise<void>` added to interface and value.
  - `StageToolbarProps`: `onSnapshot?: () => void` added.

#### 4. Test Plan
- **Verification**:
  1. Start Studio: `npx helios studio`
  2. Load a composition.
  3. Locate the Camera icon (📷) in the Stage Toolbar.
  4. Click the button.
  5. Verify a PNG file is downloaded.
  6. Verify the filename format: `snapshot-[name]-[frame].png`.
  7. Open the PNG and verify it matches the visual stage content.
- **Success Criteria**: Button exists, click triggers download, image is correct.
- **Edge Cases**:
  - `controller` is null (button disabled or no-op).
  - `captureFrame` returns null (log error).
  - Browser blocks download (unlikely for user-initiated click).
