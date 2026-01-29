# Context & Goal
- **Objective**: Implement a "Create Composition" feature in Helios Studio to allow users to create new compositions directly from the UI.
- **Trigger**: Vision gap identified - Studio functions as an IDE but lacks file creation capabilities, forcing users to switch context to the file system.
- **Impact**: Improves the "Agent Experience" and Developer Experience by providing a seamless workflow for starting new projects.

# File Inventory
- **Create**:
  - `packages/studio/src/components/CreateCompositionModal.tsx`: New modal component for creating compositions.
  - `packages/studio/src/components/CreateCompositionModal.css`: Styles for the modal.
- **Modify**:
  - `packages/studio/src/server/discovery.ts`: Add `createComposition` function to scaffold new files.
  - `packages/studio/vite-plugin-studio-api.ts`: Add `POST /api/compositions` endpoint.
  - `packages/studio/src/context/StudioContext.tsx`: Add `createComposition` API call and `isCreateOpen` state.
  - `packages/studio/src/App.tsx`: Add "New Composition" button and render the modal.
- **Read-Only**:
  - `packages/studio/src/components/CompositionSwitcher.tsx`: For modal styling reference.

# Implementation Spec
- **Architecture**:
  - **Backend**: Extend the Vite server plugin to handle file system operations (scaffolding a new folder and `composition.html`).
  - **Frontend**: Add a modal UI to capture user input (composition name) and trigger the backend API.

- **Pseudo-Code**:
  - **`packages/studio/src/server/discovery.ts`**:
    ```typescript
    export function createComposition(rootDir: string, name: string): CompositionInfo {
      // 1. Sanitize name (kebab-case)
      // 2. Resolve target directory in project root
      // 3. Check if directory exists (throw if true)
      // 4. Create directory
      // 5. Write composition.html with boilerplate
      // 6. Return new CompositionInfo
    }
    ```
  - **`packages/studio/vite-plugin-studio-api.ts`**:
    - Add `POST /api/compositions` handler.
    - Parse body for `{ name }`.
    - Call `createComposition`.
    - Handle errors (400 if exists, 500 if fs fails).
    - Return JSON result.
  - **`packages/studio/src/context/StudioContext.tsx`**:
    - Add `createComposition(name: string)` method.
    - Calls `fetch('/api/compositions', { method: 'POST', ... })`.
    - On success: Re-fetch compositions, set the new one as active, close modal.
  - **`packages/studio/src/components/CreateCompositionModal.tsx`**:
    - Simple modal with "Name" input and "Create"/"Cancel" buttons.
    - Validation: Name cannot be empty.
    - Error handling: Show error from API.

- **Public API Changes**:
  - New internal API endpoint `POST /api/compositions`.
  - `StudioContext` interface update.

- **Dependencies**: None.

# Test Plan
- **Verification**:
  1. Start Studio: `npm run dev` in `packages/studio`.
  2. Click the new "+" button in the header.
  3. Enter a name (e.g., "test-comp-01").
  4. Click "Create".
  5. Verify the modal closes.
  6. Verify "Test Comp 01" is selected in the header.
  7. Verify a new folder "test-comp-01" exists in `examples/` (or `HELIOS_PROJECT_ROOT`) containing `composition.html`.
- **Success Criteria**:
  - The "Create" flow works end-to-end without errors.
  - The new composition is immediately usable.
- **Edge Cases**:
  - **Duplicate Name**: Attempt to create "test-comp-01" again. Expect error message in modal.
  - **Invalid Name**: Enter special characters. Expect sanitized folder name (or validation error).
  - **Permissions**: Run in a read-only directory (hard to test automatically, but code should handle try/catch).
