# Context & Goal
- **Objective**: Upgrade the Props Editor to support JSON editing for objects/arrays and improve UI for primitive types.
- **Trigger**: Vision Gap - The README promises a "Props editor", but the current implementation only supports simple strings/numbers/booleans. Complex props (objects/arrays) render as "Unsupported type", making them uneditable.
- **Impact**: Unlocks the ability for users to build and configure compositions with complex data structures (e.g., config objects, theme settings) directly in the Studio.

# File Inventory
- **Create**:
  - `packages/studio/src/components/PropsEditor.css` (for cleaner styling)
- **Modify**:
  - `packages/studio/src/components/PropsEditor.tsx` (implement JSON editor logic)
- **Read-Only**:
  - `packages/studio/src/context/StudioContext.tsx` (interface reference)

# Implementation Spec
- **Architecture**:
  - Move inline styles to CSS file `PropsEditor.css`.
  - Implement a `JsonPropInput` component using a `textarea` for props where `typeof value === 'object'`.
  - Implement local state for the `textarea` to allow invalid JSON while typing.
  - Validate JSON on `blur` or debounced change; show error state (red border) if invalid.
  - Maintain existing support for String/Number/Boolean but improve styling (e.g., proper labels, alignment).
  - Handle `null` values by defaulting to JSON editor (showing "null") or a specific placeholder.
- **Public API Changes**: None.
- **Dependencies**: None.

# Test Plan
- **Automated Verification**:
  - Run `npm run build -w packages/studio` to ensure the changes compile correctly without TypeScript errors.
- **Manual Verification**:
  1. Start studio: `npx helios studio`.
  2. **Manual Step**: Modify `examples/simple-animation/composition.html` to inject test props:
     ```javascript
     const helios = new Helios({
       // ... existing options
       inputProps: {
         title: "Test",
         config: { color: "#ff0000", scale: 1.5 },
         visible: true
       }
     });
     ```
  3. Reload Studio page (http://localhost:5173).
  4. Verify `config` prop appears as a text area with JSON content.
  5. Edit JSON to `{"color": "#00ff00", "scale": 2}` and blur.
  6. Verify the red box in the example works (if connected) or at least that the value persists in the editor.
  7. **Cleanup**: Revert changes to `examples/simple-animation/composition.html`.
- **Success Criteria**:
  - Object/Array props are editable via JSON text area.
  - Invalid JSON triggers an error state and does not crash the app.
