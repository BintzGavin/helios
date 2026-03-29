#### 1. Context & Goal
- **Objective**: Implement drag-and-drop support for the Timeline to auto-detect audio/video assets and update the composition schema constraints.
- **Trigger**: Address the identified gap in the Studio domain tracking regarding "Timeline Drag & Drop", as mentioned in the journal and requirements.
- **Impact**: Enables a more intuitive and fluid editing experience by allowing users to drag assets directly from the Assets Panel onto the Timeline, automatically updating `inputProps` based on schema constraints.

#### 2. File Inventory
- **Modify**:
  - `packages/studio/src/components/Timeline.tsx`: Add `onDragOver`, `onDragLeave`, and `onDrop` handlers to the `timeline-container` div. Implement logic to parse `application/helios-asset` from dataTransfer, match the dropped asset type with schema `accept` constraints, and update `inputProps`.
- **Read-Only**:
  - `packages/studio/src/context/StudioContext.tsx`: To understand how `inputProps`, `schema`, and `controller.setInputProps` are structured and managed.
  - `packages/studio/src/components/AssetsPanel/AssetItem.tsx`: To verify the data transfer format of dragged assets (`application/helios-asset`).

#### 3. Implementation Spec
- **Architecture**:
  - Add drag event listeners (`onDragOver`, `onDragLeave`, `onDrop`) to the main `timeline-container` div in `Timeline.tsx`.
  - Maintain a local state `isDraggingOver` to provide visual feedback (e.g., highlighting the timeline track area).
  - In `onDrop`, parse the dragged asset data from `application/helios-asset` (verified using `grep` that `AssetItem.tsx` sets this).
  - Iterate through `schema` properties to find a suitable match for the dropped asset. For example, look for a property of type 'string' with `format: 'asset'` and `accept` containing the asset type or mimeType.
  - If a matching property is found, update `inputProps` via `controller.setInputProps()` with the asset's URL (verified using `grep` that `controller` has `setInputProps(props: Record<string, any>)`).
- **Pseudo-Code**:
  ```typescript
  const handleDragOver = (e) => { e.preventDefault(); setIsDraggingOver(true); }
  const handleDragLeave = () => { setIsDraggingOver(false); }
  const handleDrop = (e) => {
    e.preventDefault(); setIsDraggingOver(false);
    const assetJson = e.dataTransfer.getData('application/helios-asset');
    if (!assetJson) return;
    const asset = JSON.parse(assetJson);

    let targetKey = null;
    for (const [key, def] of Object.entries(schema)) {
      if (def.type === 'string' && def.format === 'asset') {
         if (!def.accept || def.accept.includes(asset.type) || def.accept.some(t => asset.mimeType?.startsWith(t))) {
            targetKey = key;
            break;
         }
      }
    }

    if (targetKey && controller) {
      controller.setInputProps({ [targetKey]: asset.url });
    }
  }
  ```
- **Public API Changes**: None.
- **Dependencies**: The `AssetItem` component must properly set drag data, which it currently does.

#### 4. Test Plan
- **Verification**: Run `npm run test` to verify no regressions in the Studio workspace. Build and preview the studio. Create a composition with a schema containing an audio or video asset input. Drag an asset from the Assets Panel and drop it on the timeline. Verify that the corresponding `inputProp` updates.
- **Success Criteria**: Dropping a valid asset onto the timeline updates the composition's input props correctly according to the schema. Visual feedback is provided during drag over.
- **Edge Cases**: Dropping an unsupported asset type, or when no schema property accepts the asset type. Handle parsing errors safely.
