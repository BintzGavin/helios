# Plan: Smart PiP Visibility

## 1. Context & Goal
- **Objective**: Automatically hide the Picture-in-Picture (PiP) button when PiP is unavailable (e.g., no canvas found, cross-origin restrictions, or browser support missing).
- **Trigger**: Journal entry identifying "PiP Gap in DOM Mode" where the button is active but non-functional.
- **Impact**: Improves Player UX by ensuring the interface reflects available capabilities.

## 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Implement `updatePipVisibility` logic).
- **Modify**: `packages/player/src/features/pip.test.ts` (Add tests for visibility logic).

## 3. Implementation Spec
- **Architecture**:
  - Enhance `HeliosPlayer` with a capability check for Picture-in-Picture.
  - The check will verify:
    1. Browser support (`document.pictureInPictureEnabled`).
    2. User preference (`disablepictureinpicture` attribute).
    3. Content capability (Existence of a `<canvas>` element reachable within the iframe).
  - This check will be triggered during initialization (`setController`) and when relevant attributes change.

- **Logic Flow**:
  1. **Check explicit disable**: If the `disablepictureinpicture` attribute is present on the component, hide the PiP button immediately and exit.
  2. **Check browser support**: If the global `document.pictureInPictureEnabled` flag is false, hide the PiP button and exit.
  3. **Check content capability**:
     - Attempt to access the iframe's content document.
     - If access fails (e.g., due to Cross-Origin restrictions), catch the error and assume PiP is unavailable (hide button).
     - If access succeeds, query the document for an element matching the `canvas-selector` attribute (defaulting to "canvas").
     - If a matching element is found, show the PiP button.
     - If no matching element is found, hide the PiP button.
  4. **Integration**:
     - Call this logic whenever `updateControlsVisibility` is invoked.
     - Additionally, invoke this logic when the controller is set (indicating the composition has loaded) to handle the initial state of the content.

- **Dependencies**: None.

## 4. Test Plan
- **Verification**: Run `npm run test -w packages/player`
- **Success Criteria**:
  - `pip.test.ts` passes with new test cases covering:
    - `disablepictureinpicture` attribute presence.
    - `document.pictureInPictureEnabled` being false.
    - Cross-origin iframe simulation (access denied).
    - Same-origin iframe with missing canvas.
    - Same-origin iframe with valid canvas.
  - Existing tests in `packages/player` pass.
