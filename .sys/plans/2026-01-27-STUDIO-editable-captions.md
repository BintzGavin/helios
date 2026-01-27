# 2026-01-27-STUDIO-editable-captions.md

## 1. Context & Goal
- **Objective**: Implement an editable Captions Panel in Helios Studio, allowing users to add, edit, and delete caption cues directly in the UI.
- **Trigger**: Vision Gap - Studio acts as an IDE but currently provides read-only access to captions imported via SRT.
- **Impact**: Enables a complete workflow for captioning (Import -> Edit -> Verify) within the Studio, improving user efficiency.

## 2. File Inventory
- **Modify**: `packages/studio/src/components/CaptionsPanel/CaptionsPanel.tsx` (Add editing logic and UI)
- **Modify**: `packages/studio/src/components/CaptionsPanel/CaptionsPanel.css` (Style inputs and buttons)
- **Create**: `packages/studio/src/components/CaptionsPanel/CaptionsPanel.test.tsx` (Unit tests for editing logic)
- **Read-Only**: `packages/studio/src/context/StudioContext.tsx` (Reference for `controller` interaction)

## 3. Implementation Spec
- **Architecture**:
    - The component will continue to receive `captions` from `StudioContext` (driven by `Helios` state).
    - It will implement local handlers (`add`, `update`, `delete`) that modify the caption list and push changes back to `Helios` via `controller.setCaptions` (or `inputProps` fallback).
    - UI will switch from static text to Input fields (Time and Text).

- **Pseudo-Code**:
    ```typescript
    const updateCaptions = (newCaptions) => {
       // Sort by startTime to ensure order
       newCaptions.sort((a, b) => a.startTime - b.startTime);

       if (controller.setCaptions) {
          controller.setCaptions(newCaptions);
       } else {
          controller.setInputProps({ ...playerState.inputProps, captions: newCaptions });
       }
    }

    const handleAdd = () => {
       const currentTime = Math.round(playerState.currentFrame / playerState.fps * 1000);
       const newCue = {
           startTime: currentTime,
           endTime: currentTime + 2000, // Default 2s duration
           text: "New Caption"
       };
       updateCaptions([...captions, newCue]);
    }

    const handleUpdate = (index, field, value) => {
       const updated = [...captions];
       updated[index] = { ...updated[index], [field]: value };
       updateCaptions(updated);
    }

    const handleDelete = (index) => {
       const updated = captions.filter((_, i) => i !== index);
       updateCaptions(updated);
    }
    ```

- **Public API Changes**: None (internal component).

- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
    - Run `npm test -w packages/studio` to verify new unit tests.
    - Start Studio (`npx helios studio`).
    - Import an SRT file (optional).
    - Click "Add Caption" and verify a new item appears.
    - Edit text/time and verify it persists.
    - Delete a caption and verify removal.
    - Check Timeline to see if markers update.
- **Success Criteria**:
    - Captions can be added, edited, and deleted.
    - Changes persist in `playerState`.
    - Unit tests pass.
- **Edge Cases**:
    - Adding caption when list is empty.
    - Overlapping times (allowed by schema, but checking sorting).
    - Invalid time format input (should be handled/validated).

## 5. Complete pre commit steps
- Complete pre commit steps to make sure proper testing, verifications, reviews and reflections are done.
