#### 1. Context & Goal
- **Objective**: Implement "Duplicate Composition" functionality (Save As workflow) in Studio, allowing users to clone existing compositions.
- **Trigger**: Vision gap "Studio IDE" implies file management; "Prototype Fast" principle requires rapid iteration via duplication.
- **Impact**: Enables users to fork/version compositions without manual file system operations, speeding up the creative loop.

#### 2. File Inventory
- **Create**: `packages/studio/src/components/DuplicateCompositionModal.tsx` (New Modal UI)
- **Create**: `packages/studio/src/components/DuplicateCompositionModal.css` (Styles)
- **Modify**: `packages/studio/src/server/discovery.ts` (Add `duplicateComposition` logic)
- **Modify**: `packages/studio/vite-plugin-studio-api.ts` (Add API endpoint)
- **Modify**: `packages/studio/src/context/StudioContext.tsx` (Add frontend state/method)
- **Modify**: `packages/studio/src/components/CompositionSettingsModal.tsx` (Add trigger button)
- **Modify**: `packages/studio/src/App.tsx` (Mount modal)
- **Read-Only**: `packages/studio/src/components/CreateCompositionModal.tsx` (Reference for modal logic)

#### 3. Implementation Spec
- **Architecture**:
    - **Backend**: New utility function using Node's `fs.cpSync` for recursive directory copying.
    - **API**: New REST endpoint `POST /api/compositions/duplicate` handling the request.
    - **Frontend**: React State in Context to manage modal visibility; new Component for the user interaction.
- **Pseudo-Code**:
    - **`discovery.ts`**:
      ```typescript
      export function duplicateComposition(rootDir: string, sourceId: string, newName: string) {
          // Resolve project root
          // Sanitize newName to create dirName
          // Check if target directory exists -> Throw error if yes
          // Perform fs.cpSync(sourceDir, targetDir, { recursive: true })
          // If composition.json exists in target, read it, update 'name' (optional), write it back
          // Return new CompositionInfo
      }
      ```
    - **`DuplicateCompositionModal.tsx`**:
      - Render a modal similar to `CreateCompositionModal`.
      - Input: "New Name" (default: `Copy of {sourceName}`).
      - On Submit: Call `duplicateComposition(source.id, newName)`.
      - On Success: Close modal, context updates active composition.
- **Public API Changes**:
    - `StudioContext`: `duplicateComposition(sourceId: string, newName: string): Promise<void>`
    - `StudioContext`: `isDuplicateOpen: boolean`, `setDuplicateOpen(v: boolean)`
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
    1. Run `npx helios studio`.
    2. Open an existing composition (e.g., "Basic").
    3. Click the "Settings" (Gear) icon.
    4. Click the new "Duplicate" button.
    5. Enter a new name "Basic V2" and confirm.
    6. Verify that "Basic V2" loads immediately.
    7. Verify in file explorer that a new directory "basic-v2" exists with identical files.
- **Success Criteria**:
    - New composition appears in the Switcher.
    - Files are physically copied.
    - User is redirected to the new composition.
- **Edge Cases**:
    - Duplicate with a name that already exists (API should return 400/500, UI should show error).
    - Source composition is deleted while modal is open (API should return 404).
