#### 1. Context & Goal
- **Objective**: Implement drag and drop media support for the timeline.
- **Trigger**: The Vision Document (README V1.x) and `planning-studio.md` specify "**Timeline Drag & Drop** - Drag and drop media support (auto-detecting audio vs video) for the timeline, ensuring functionality within iframe environments."
- **Impact**: Enhances the Studio IDE's usability by allowing quick insertion of assets into the composition timeline by dragging them from the Assets Panel directly to a specific frame.

#### 2. File Inventory
- **Create**: `.sys/plans/$(date +%Y-%m-%d)-STUDIO-TimelineDragDrop.md`
- **Modify**: `packages/studio/src/components/Timeline.tsx`
- **Read-Only**: `packages/studio/src/context/StudioContext.tsx`, `packages/studio/src/components/AssetsPanel/AssetItem.tsx`

#### 3. Implementation Spec
- **Architecture**:
  - The Studio isolates the user's composition inside an iframe (the `<helios-player>`). This prevents native drag-and-drop events from reaching the composition easily if dropped on the Stage.
  - However, the Timeline is part of the Studio's native React DOM, making it an ideal drop target.
  - Add `isDragOver` state to `Timeline.tsx` to provide visual feedback during the drag operation.
  - Add `onDragOver` to the `.timeline-track-area` or `.timeline-content` div. It will call `e.preventDefault()` to allow dropping and set `isDragOver = true`.
  - Add `onDragLeave` to set `isDragOver = false`.
  - Add `onDrop` handler:
    - Call `e.preventDefault()` and set `isDragOver = false`.
    - Extract the dragged asset data using `e.dataTransfer.getData('application/helios-asset')`.
    - Parse the JSON data to verify it is an `audio` or `video` asset (auto-detecting the media type).
    - Use the existing `getFrameFromEvent(e)` and `getSnapFrame(rawFrame)` logic to calculate the exact frame where the user dropped the asset.
    - Since Helios compositions are code-driven and schemas vary, we cannot blindly inject code into the user's source files. Instead, generate a standardized data snippet containing the asset's relative path, the calculated drop frame, and the type.
    - Copy this snippet to the user's clipboard and use `addToast` (from `ToastContext`) to notify the user: "Copied [Asset Name] snippet at frame [X] to clipboard."
    - This allows users to paste the correctly timed asset directly into their framework code (e.g., as a React `<video>` or `<audio>` tag).

- **Pseudo-Code**:
```tsx
const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const assetData = e.dataTransfer.getData('application/helios-asset');
    if (!assetData) return;

    try {
        const asset = JSON.parse(assetData);
        if (asset.type !== 'video' && asset.type !== 'audio') {
            addToast('Only media assets can be dropped here.', 'error');
            return;
        }

        const rawFrame = getFrameFromEvent(e);
        const frame = getSnapFrame(rawFrame);

        // Generate snippet based on type
        const tag = asset.type === 'video' ? 'video' : 'audio';
        const snippet = `<${tag} src="${asset.relativePath}" data-start-frame={${frame}} />`;

        navigator.clipboard.writeText(snippet);
        addToast(`Copied ${asset.name} snippet at frame ${frame} to clipboard`, 'success');

    } catch (e) {
        console.error('Invalid asset data', e);
    }
};
```

- **Public API Changes**:
  - None

- **Dependencies**:
  - None

#### 4. Test Plan
- **Verification**: Run `npm run dev` in `packages/studio`. Open the Studio UI.
- **Success Criteria**:
  1. Dragging an audio or video asset from the Assets Panel over the Timeline track area provides visual feedback (e.g., a subtle background color change or border).
  2. Dropping the asset triggers a toast notification indicating the asset and frame.
  3. The clipboard contains a formatted code snippet with the asset's path and the correct drop frame.
- **Edge Cases**: Dropping non-media assets (like JSON or fonts) should show a warning toast. Dropping outside the track area should reset the drag state without action.
