# STUDIO: Array Reordering

## 1. Context & Goal
- **Objective**: Add reordering (move up/down) functionality to array inputs in the Props Editor.
- **Trigger**: Current array input allows adding/removing but not reordering, which is a critical gap for list management (e.g., slides, assets).
- **Impact**: Improved UX for array-based props, aligning Studio with standard IDE capabilities.

## 2. File Inventory
- **Modify**: `packages/studio/src/components/SchemaInputs.tsx` (Add logic and buttons)
- **Modify**: `packages/studio/src/components/PropsEditor.css` (Add styling)
- **Modify**: `packages/studio/src/components/PropsEditor.test.tsx` (Add unit tests)

## 3. Implementation Spec
- **Architecture**:
    - Enhance the `ArrayInput` component within `SchemaInputs.tsx` to include state manipulation functions for swapping items.
    - Use standard React state updates (creating a copy of the array) to ensure immutability.
    - Add UI controls (buttons) for "Move Up" and "Move Down" alongside the existing "Remove" button.
- **Pseudo-Code**:
    - In `ArrayInput`:
        - Define `handleMoveUp(index)`:
            - If index <= 0, return.
            - Clone `value` array.
            - Swap `copy[index]` with `copy[index-1]`.
            - Call `onChange(copy)`.
        - Define `handleMoveDown(index)`:
            - If index >= length-1, return.
            - Clone `value` array.
            - Swap `copy[index]` with `copy[index+1]`.
            - Call `onChange(copy)`.
        - In render loop:
            - Render a wrapper div `.prop-array-controls`.
            - Render `button` "↑" (Up):
                - onClick: `() => handleMoveUp(index)`
                - disabled: `index === 0`
                - title: "Move Up"
                - className: reuse `.props-toolbar-btn` or similar
            - Render `button` "↓" (Down):
                - onClick: `() => handleMoveDown(index)`
                - disabled: `index === safeValue.length - 1`
                - title: "Move Down"
                - className: reuse `.props-toolbar-btn` or similar
            - Move existing "Remove" button into this wrapper.
- **CSS**:
    - Define `.prop-array-controls` in `PropsEditor.css` to align buttons (e.g., `display: flex; gap: 4px;`).
    - Ensure buttons look consistent with the rest of the UI.
- **Public API Changes**: None.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
    - Run `npx helios studio` and verify the UI updates.
    - Create a composition with array props (e.g., a list of text strings) if one doesn't exist, and manually verify that clicking "Up" and "Down" correctly reorders the items in the preview.
- **Unit Tests**:
    - In `packages/studio/src/components/PropsEditor.test.tsx`:
        - Add a test case "reorders array items".
        - Setup: Render `PropsEditor` with a schema containing an array prop (e.g., `['A', 'B', 'C']`).
        - Action: Find "Down" button for first item ('A') and click it.
        - Expect: `onChange` (or `setInputProps` mock) to be called with `['B', 'A', 'C']`.
        - Action: Find "Up" button for last item ('C') and click it.
        - Expect: `onChange` to be called with `['A', 'C', 'B']`.
- **Success Criteria**:
    - Buttons appear for each array item.
    - Clicking buttons updates the prop value correctly.
    - Buttons are disabled when movement is impossible (start/end of list).
    - Unit tests pass.
