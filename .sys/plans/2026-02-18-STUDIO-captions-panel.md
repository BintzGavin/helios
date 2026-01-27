# Plan: Implement Captions Import Panel

## 1. Context & Goal
- **Objective**: Implement a Captions Panel in Studio to import `.srt` files and inject them as `inputProps` into the composition.
- **Trigger**: Vision gap "Planned: Caption/subtitle import (SRT)" in `README.md`.
- **Impact**: Unlocks caption workflows by allowing users to import subtitle files, visualizing them in the Studio, and accessing them in their composition code via `inputProps.captions`.

## 2. File Inventory
- **Create**:
  - `packages/studio/src/components/CaptionsPanel/CaptionsPanel.tsx`: New component for managing captions.
  - `packages/studio/src/components/CaptionsPanel/CaptionsPanel.css`: Styles for the panel.
  - `packages/studio/src/utils/srt.ts`: Utility to parse SRT strings into JSON objects.
- **Modify**:
  - `packages/studio/src/components/Sidebar/Sidebar.tsx`: Add "Captions" tab to the sidebar navigation.
  - `packages/studio/src/context/StudioContext.tsx`: Add `captions` state, `importCaptions` function, and logic to sync `captions` with `controller.setInputProps`.
- **Read-Only**:
  - `packages/studio/src/App.tsx`: Reference for layout integration.

## 3. Implementation Spec
- **Architecture**:
  - **SRT Parsing**: Pure TypeScript implementation in `srt.ts` to parse standard SRT format (timestamp `HH:MM:SS,ms`) into an array of caption objects.
  - **State Management**: `StudioContext` will hold the parsed `captions` array. A `useEffect` hook will observe this state and automatically update the player's input props: `controller.setInputProps({ ...inputProps, captions })`.
  - **UI Interaction**:
    - `Sidebar` gains a new tab for "Captions".
    - `CaptionsPanel` provides a file upload interface (native file input + drag/drop).
    - The panel displays a scrollable list of captions showing Start Time, End Time, and Text.
    - The active caption (where `currentFrame/fps` is within the range) will be highlighted in the list for visual feedback.

- **Pseudo-Code**:

  **srt.ts**:
  ```typescript
  export interface Caption { id: string; start: number; end: number; text: string; }

  export function parseSRT(data: string): Caption[] {
     // Split by double newline
     // Regex match timestamps
     // Convert timestamp to seconds
     // Return array
  }
  ```

  **StudioContext.tsx**:
  ```typescript
  const [captions, setCaptions] = useState<Caption[]>([]);

  const importCaptions = async (file: File) => {
    const text = await file.text();
    const parsed = parseSRT(text);
    setCaptions(parsed);
  };

  // Sync with Controller
  useEffect(() => {
     if (controller && captions.length > 0) {
         const currentProps = controller.getState()?.inputProps || {};
         controller.setInputProps({ ...currentProps, captions });
     }
  }, [captions, controller]);
  ```

  **CaptionsPanel.tsx**:
  ```typescript
  export const CaptionsPanel = () => {
     const { captions, importCaptions, playerState } = useStudio();
     const currentTime = playerState.currentFrame / playerState.fps;

     return (
       <div className="captions-panel">
          <input type="file" accept=".srt" onChange={...} />
          <div className="captions-list">
             {captions.map(cap => (
                <div className={currentTime >= cap.start && currentTime <= cap.end ? 'active' : ''}>
                   {cap.text}
                </div>
             ))}
          </div>
       </div>
     )
  }
  ```

- **Dependencies**: None. Pure TypeScript implementation.

## 4. Test Plan
- **Verification**:
  1. Launch Studio: `npx helios studio`.
  2. Navigate to "Captions" tab in Sidebar.
  3. Upload a valid `.srt` file.
  4. Confirm the list of captions is displayed.
  5. Play the composition and verify the active caption is highlighted in the list as time progresses.
  6. Check the "Properties" panel (Props Editor) to confirm that `captions` field appears in the `inputProps` JSON.
- **Success Criteria**:
  - SRT parsing is accurate (timestamps converted correctly).
  - Captions are injected into `inputProps` automatically.
  - UI provides clear feedback on active caption.
- **Edge Cases**:
  - Invalid SRT format (should show error or handle gracefully).
  - Empty file.
  - User manually overwriting `captions` in Props Editor (Context should probably take precedence or merge).
