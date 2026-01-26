# Plan: Improve Export Error Handling

## 1. Context & Goal
- **Objective**: Display actionable error messages in the `<helios-player>` UI when client-side export fails.
- **Trigger**: Currently, users receive no visual feedback if `renderClientSide` throws an error (e.g., due to missing browser support), leading to confusion.
- **Impact**: Improves User Experience (UX) and Agent Experience (AX) by making failures visible and providing recovery options (Dismiss).

## 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Update `HeliosPlayer` class)
- **Read-Only**: `packages/player/src/features/exporter.ts` (Reference)

## 3. Implementation Spec
- **Architecture**: Extend the existing `status-overlay` system to support custom actions (e.g., "Dismiss") via a dynamic handler, replacing the hardcoded "Retry" reload logic.

### Pseudo-Code (`packages/player/src/index.ts`)

1.  **State Management**:
    - Add `private retryAction: () => void;` property to `HeliosPlayer`.
    - In `constructor`, initialize `this.retryAction` to wrap `this.retryConnection()`.
    - Update `this.retryBtn.onclick` to call `this.retryAction()`.

2.  **Update `showStatus` method**:
    - Add optional argument: `action?: { label: string, handler: () => void }`.
    - If `action` is provided:
        - Set button text to `action.label`.
        - Set `this.retryAction = action.handler`.
    - Else (Default/Error state):
        - Set button text to "Retry".
        - Reset `this.retryAction` to `this.retryConnection`.

3.  **Update `renderClientSide` method**:
    - Wrap the entire logic in `try/catch`.
    - **Catch Block**:
        - If error message is "Export aborted", return (ignore).
        - Otherwise, call `this.showStatus` with:
            - Message: `"Export Failed: " + e.message`
            - `isError`: `true`
            - `action`: `{ label: "Dismiss", handler: () => this.hideStatus() }`
    - **Finally Block**:
        - Ensure UI controls are unlocked (`lockPlaybackControls(false)`).
        - Reset "Export" button text and state.
        - Clear `abortController`.

## 4. Test Plan
- **Verification**:
    1.  Run `npm run build -w packages/player`.
    2.  Manual Verification:
        - Open an example composition with the built player.
        - Temporarily inject a throw in `renderClientSide` (or use a browser without `VideoEncoder` if possible) to trigger the error.
        - Verify the Red Error Overlay appears with the text "Export Failed: ...".
        - Verify the button says "Dismiss".
        - Click "Dismiss" and verify the overlay disappears and the player is usable.
- **Success Criteria**: Export errors are visible to the user and can be dismissed without reloading the page.
