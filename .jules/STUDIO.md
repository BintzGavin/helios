## 0.120.4 - Timeline Drag Drop
**Learning:** React drag events need `e.preventDefault()` on both `onDragOver` and `onDrop` to successfully trigger the drop event and calculate correct timeline placement metrics using cursor coordinates. And `playerState.schema` values might not have `inputProps` locally defined but it's available via context logic.
**Action:** Always ensure dragover receives `e.preventDefault()` to bypass default browser behaviors preventing the drop action.
