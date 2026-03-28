#### 1. Context & Goal
- **Objective**: Implement drag-and-drop support on the Timeline to map dropped assets to input props based on schema constraints.
- **Trigger**: Vision gap identified in `.jules/STUDIO.md` where dropping assets directly onto the timeline to auto-fill inputs is missing.
- **Impact**: Enhances the "WYSIWYG" editing experience by allowing users to rapidly swap video/audio/image assets visually.

#### 2. File Inventory
- **Create**: []
- **Modify**:
  - `packages/studio/src/components/Timeline.tsx`: Add `onDragOver` and `onDrop` handlers to the main timeline track area to intercept asset drops, validate against the `playerState.schema`, and update `playerState.inputProps`.
- **Read-Only**:
  - `packages/studio/src/context/StudioContext.tsx`: To understand how `setInputProps` is accessed via the controller.
  - `packages/studio/src/components/AssetsPanel/AssetItem.tsx`: To understand the payload structure of `'application/helios-asset'`.

#### 3. Implementation Spec
- **Architecture**: The `Timeline.tsx` component will listen for drag events over its `timeline-track-area`. When an asset is dropped, it parses the `application/helios-asset` data payload. It then iterates through `playerState.schema` to find the first input prop of type `'asset'` that accepts the dropped asset's `type` (e.g., `'video'`, `'audio'`, `'image'`). If a matching prop is found, it calls `controller.setInputProps({ [propKey]: asset.relativePath })`.
- **Pseudo-Code**:
  - Add `onDragOver` to `timeline-track-area` to `e.preventDefault()` if the data transfer contains `application/helios-asset`.
  - Add `onDrop` handler to parse the asset JSON.
  - Find matching schema key: `Object.entries(schema).find(([key, def]) => def.type === 'asset' && def.accept?.includes(asset.type))`.
  - If found, `controller.setInputProps({ [key]: asset.relativePath })`.
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm run test -w packages/studio` to ensure no regressions. Then, run `npx helios studio` and test dragging an asset from the Assets Panel onto the Timeline to verify it updates the composition props.
- **Success Criteria**: Dropping a valid asset onto the timeline correctly updates the corresponding input prop in the composition.
- **Edge Cases**: Dropping an asset type that is not accepted by any schema prop should be ignored.
