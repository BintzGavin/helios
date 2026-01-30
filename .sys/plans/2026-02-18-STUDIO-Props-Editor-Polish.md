# Plan: Props Editor Workflow Polish

## 1. Context & Goal
- **Objective**: Improve the "Live Editing" workflow by ensuring prop changes persist across Hot Module Reloading (HMR) and adding tools to copy/reset props.
- **Trigger**: Vision gap - "Live editing" is disrupted by HMR data loss; "Studio as a Tool" lacks export to code.
- **Impact**: Significantly improves Developer Experience (DX) for data-driven compositions, allowing seamless tweaking and code integration.

## 2. File Inventory
- **Modify**: `packages/studio/src/components/Stage/Stage.tsx` (Update HMR logic)
- **Modify**: `packages/studio/src/components/PropsEditor.tsx` (Add Toolbar)
- **Modify**: `packages/studio/src/components/SchemaInputs.tsx` (Export `getDefaultValueForType`)
- **Modify**: `packages/studio/src/components/PropsEditor.css` (Style the toolbar)

## 3. Implementation Spec

### Shared Utilities (SchemaInputs.tsx)
- Export the `getDefaultValueForType` helper function so it can be imported by `PropsEditor.tsx`.

### HMR State Preservation (Stage.tsx)
- Update `lastStateRef` definition to include `inputProps: Record<string, any> | null`.
- In the `useEffect` that tracks state (lines ~33):
  - Capture `playerState.inputProps` into `lastStateRef.current`.
- In the `useEffect` that handles controller reconnection (lines ~54):
  - Destructure `inputProps` from `lastStateRef.current`.
  - Check if `inputProps` exists and is not empty.
  - If valid, call `freshCtrl.setInputProps(inputProps)` **before** restoring frame/playback.
  - This ensures the new controller starts with the user's tweaked values.

### Props Editor Toolbar (PropsEditor.tsx)
- Create a `PropsToolbar` component (internal) that renders above the prop list.
- **Copy JSON Button**:
  - On click, execute `navigator.clipboard.writeText(JSON.stringify(inputProps, null, 2))`.
  - Show a temporary "Copied!" feedback (e.g., change button text or tooltip for 2s).
- **Reset Button**:
  - On click, calculate default values:
    - Iterate over `Object.keys(schema)`.
    - For each key, `value = schema[key].default ?? getDefaultValueForType(schema[key].type)`.
  - Call `controller.setInputProps(defaults)`.

### Styling (PropsEditor.css)
- Add styles for `.props-toolbar`: flex container, gap, margin-bottom.
- Add styles for toolbar buttons: similar to other studio buttons (dark bg, light text, hover effect).

## 4. Test Plan
- **Verification**:
  1. Start Studio: `npx helios studio`.
  2. Open a composition (e.g., Basic).
  3. **Test HMR**:
     - Change a prop value (e.g., color or text).
     - Edit the composition source code (e.g., add a comment).
     - Save file to trigger HMR.
     - **Success**: The prop value remains as changed, does not revert to default.
  4. **Test Copy**:
     - Click "Copy JSON".
     - Paste into a text editor.
     - **Success**: JSON output matches current UI values.
  5. **Test Reset**:
     - Change multiple props.
     - Click "Reset".
     - **Success**: All props revert to their original default values defined in the schema.
