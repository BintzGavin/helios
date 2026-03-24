#### 1. Context & Goal
- **Objective**: Implement drag and drop media support (audio/video) for the Timeline component.
- **Trigger**: Vision gap identified from `docs/prompts/planning-studio.md` indicating "Timeline Drag & Drop - Drag and drop media support (auto-detecting audio vs video) for the timeline, ensuring functionality within iframe environments."
- **Impact**: Enhances the WYSIWYG editing experience by allowing users to easily bring assets from the Assets Panel directly onto the Timeline.

#### 2. File Inventory
- **Create**: None
- **Modify**:
  - `packages/studio/src/components/Timeline.tsx`: Add drag-and-drop event handlers to the timeline.
  - `packages/studio/src/components/Timeline.css`: Add a `.timeline-drag-over` CSS class for visual feedback.
- **Read-Only**:
  - `packages/studio/src/context/ToastContext.tsx`: To determine how to display a notification on successful drop.
  - `packages/studio/src/components/AssetsPanel/AssetItem.tsx`: To understand the payload structure of the dragged asset (`application/helios-asset`, `application/helios-asset-id`, `text/plain`).

#### 3. Implementation Spec
- **Architecture**:
  - The `Timeline` component will intercept drag events (`dragover`, `dragenter`, `dragleave`, `drop`) on the `.timeline-content` element.
  - Add a new state variable `isDragOver` to track when an asset is being dragged over the timeline.
  - On a successful `drop`, prevent the default browser behavior, parse the `application/helios-asset` payload from `e.dataTransfer`.
  - Calculate the drop position (time/frame) on the timeline based on the mouse X coordinate using the existing `getFrameFromEvent` logic and the `fps` state.
  - Provide feedback to the user about the drop: copy the asset's URL to the clipboard and inspect `ToastContext.tsx` to find the correct method to trigger a toast notification (e.g., "Dropped [Asset Name] at [Timecode]. URL copied to clipboard.").
  - Apply the `.timeline-drag-over` class conditionally when `isDragOver` is true to provide a visual cue.

- **Pseudo-Code**:
  ```tsx
  // In Timeline.tsx
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('application/helios-asset')) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const assetData = e.dataTransfer.getData('application/helios-asset');
    if (!assetData) return;

    try {
      const asset = JSON.parse(assetData);
      const frame = getFrameFromEvent(e);
      const time = frame / fps;

      // Copy to clipboard
      navigator.clipboard.writeText(asset.url);

      // trigger a toast using the method found in ToastContext.tsx
      triggerToast(`Dropped ${asset.name} at ${time.toFixed(2)}s. URL copied to clipboard.`);
    } catch (err) {
      console.error('Failed to parse dropped asset', err);
    }
  };
  ```

- **Public API Changes**: None
- **Dependencies**: The notification system (e.g., `ToastContext`).

#### 4. Test Plan
- **Verification**: Run `npx tsx packages/studio/src/components/Timeline.test.tsx` to ensure existing timeline functionality isn't broken. Modify the test suite to include drag/drop event coverage if necessary.
- **Success Criteria**: Visual feedback is shown when dragging an asset over the timeline. Upon dropping, the asset's URL is copied to the clipboard, and a toast notification displays the correct drop time.
- **Edge Cases**: Dragging non-asset items (e.g., text, unknown files) should be ignored. Handling drops when no composition is loaded.
