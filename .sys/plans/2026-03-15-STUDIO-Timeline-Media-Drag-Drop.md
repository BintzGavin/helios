#### 1. Context & Goal
- **Objective**: Implement drag and drop media support for the Timeline in Helios Studio.
- **Trigger**: Vision gap identified from `docs/prompts/planning-studio.md` where "Timeline Drag & Drop - Drag and drop media support (auto-detecting audio vs video) for the timeline, ensuring functionality within iframe environments" is listed as a missing feature.
- **Impact**: Enhances the WYSIWYG editing experience by allowing users to drag media assets directly from the Assets Panel onto the Timeline to automatically update corresponding composition props.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/studio/src/components/Timeline.tsx` - Add `onDrop`, `onDragOver`, `onDragEnter`, and `onDragLeave` event handlers to the `.timeline-track-area` to accept media assets.
- **Modify**: `packages/studio/src/components/Stage/Stage.tsx` - Add global drag event listeners (`dragenter`, `dragleave`, `drop`) to toggle a state (`isDragging`) that activates an invisible overlay `div` over the `<helios-player>` to prevent the iframe from swallowing drag events.
- **Read-Only**: `packages/studio/src/components/AssetsPanel/AssetItem.tsx` - To verify the `dataTransfer` format of dragged internal assets (`application/helios-asset`).
- **Read-Only**: `packages/core/src/schema.ts` - To map dragged items correctly using `PropType` and `format`.

#### 3. Implementation Spec
- **Architecture**:
  - Implement a global drag overlay in `Stage.tsx`. We will track global drag state using `dragenter`, `dragleave`, and `drop` on the window or the main `.stage-container`. When an asset is being dragged, we overlay an invisible `div` on top of the `<helios-player>` (e.g., using `position: absolute`, `top: 0`, `left: 0`, `right: 0`, `bottom: 0`, `zIndex: 999`) to prevent the iframe from intercepting pointer events.
  - Use the HTML5 Drag and Drop API on the `.timeline-track-area` inside `Timeline.tsx`.
  - Add state `isDragOver` in `Timeline.tsx` to apply visual feedback (e.g., a CSS class `timeline-drag-over`) when an asset is dragged over the timeline.
  - In `Timeline.tsx`, `handleDragOver` will call `e.preventDefault()` and set `isDragOver` to true.
  - In `Timeline.tsx`, `handleDrop` will:
    1. Parse the dragged payload using `e.dataTransfer.getData('application/helios-asset')`.
    2. Extract the asset's URL and type (e.g., 'audio', 'video', 'image').
    3. Calculate the dropped frame using the existing `getFrameFromEvent(e)` and convert it to time (`time = frame / fps`).
    4. Automatically map the dropped asset to the `inputProps` based on the `HeliosSchema`. The logic will find a prop defined in the schema whose `type` matches the asset type (e.g. `def.type === 'audio'`).
    5. Call `controller.setInputProps()` to update the asset URL. If a corresponding time prop exists (e.g., a prop matching an audio asset, determined by checking if `def.type === 'number'` and `def.format === 'time'` and the key name contains the asset key name), it will update that prop as well.
- **Pseudo-Code**:
  ```tsx
  // In Stage.tsx
  const [isGlobalDragging, setIsGlobalDragging] = useState(false);

  useEffect(() => {
    let dragCounter = 0;
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter++;
      if (dragCounter === 1) setIsGlobalDragging(true);
    };
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter === 0) setIsGlobalDragging(false);
    };
    const handleDrop = (e: DragEvent) => {
      dragCounter = 0;
      setIsGlobalDragging(false);
    };
    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);
    // return cleanup...
  }, []);

  // In Stage render, wrap helios-player and overlay
  <div style={{ position: 'relative' }}>
    <helios-player ... />
    {isGlobalDragging && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} />}
  </div>

  // In Timeline.tsx
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!controller) return;

    const frame = getSnapFrame(getFrameFromEvent(e));
    const time = frame / fps;

    const internalData = e.dataTransfer.getData('application/helios-asset');
    if (internalData) {
      const asset = JSON.parse(internalData);
      const assetUrl = asset.relativePath || asset.url;
      const assetType = asset.type;

      // Find first matching asset prop in schema
      const targetPropEntry = Object.entries(schema).find(([key, def]) =>
        def.type === assetType || def.type === 'string'
      );

      if (targetPropEntry) {
         const updates: Record<string, any> = { [targetPropEntry[0]]: assetUrl };

         // Try to find a corresponding time prop
         const timePropEntry = Object.entries(schema).find(([key, def]) =>
            def.type === 'number' && def.format === 'time' && key.toLowerCase().includes(targetPropEntry[0].toLowerCase().replace('asset', ''))
         );

         if (timePropEntry) {
            updates[timePropEntry[0]] = time;
         }

         controller.setInputProps(updates);
      }
    }
  };
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm test -w packages/studio` to verify that no existing components are broken by the new drag-and-drop overlay and timeline handlers.
- **Success Criteria**:
  1. Dragging an asset from the Assets Panel into the viewport does not get swallowed by the iframe.
  2. The Timeline visually highlights when an asset is dragged over it.
  3. Dropping an audio/video asset calculates the correct time offset and updates the corresponding asset prop and time prop in `inputProps` via `controller.setInputProps()`.
- **Edge Cases**: Dragging files from the external OS, dragging when no compatible prop exists in the active composition's schema, and overlapping iframe boundaries.
