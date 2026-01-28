# Context & Goal
- **Objective**: Ensure the `poster` image remains visible after the iframe loads until playback begins, and prevent the "Loading/Connecting" overlay from obscuring the poster.
- **Trigger**: Parity with standard HTML5 `<video>` element behavior; currently, the poster disappears immediately upon iframe load or is covered by the status overlay.
- **Impact**: Improves user experience by providing a seamless transition from the preview image to the video content, preventing "flash of frame 0" or black loading screens when a poster is provided.

# File Inventory
- **Create**: None
- **Modify**: `packages/player/src/index.ts` (Update `updatePosterVisibility`, `loadIframe`, and `connectedCallback`)
- **Read-Only**: `packages/player/src/controllers.ts`

# Implementation Spec
- **Architecture**: Logic update within the `HeliosPlayer` Web Component.
- **Pseudo-Code**:
  - Update `updatePosterVisibility()` in `packages/player/src/index.ts`:
    - Remove the condition `&& !this.isLoaded`.
    - Logic:
      - If `pendingSrc` is set -> Show poster (`classList.remove("hidden")`). Return.
      - If `poster` attribute exists:
        - Determine `shouldHide` flag.
        - If `controller` exists AND (`controller.getState().isPlaying` OR `controller.getState().currentFrame > 0`) -> `shouldHide = true`.
        - Else -> `shouldHide = false`.
        - If `!shouldHide` -> Show poster (`classList.remove("hidden")`).
        - Else -> Hide poster (`classList.add("hidden")`).
      - Else (no poster attr) -> Hide poster.
  - Update `loadIframe(src)`:
    - Before calling `this.showStatus("Loading...", false)`, check `if (!this.hasAttribute("poster"))`. Only show status if NO poster.
  - Update `connectedCallback()`:
    - Before calling `this.showStatus("Connecting...", false)`, check `if (!this.hasAttribute("poster"))`. Only show status if NO poster.

- **Public API Changes**: None.
- **Dependencies**: None.

# Test Plan
- **Verification**: Run `npm run build -w packages/player` to build the component.
- **Success Criteria**:
  - **Scenario 1 (Poster + Preload Auto)**: `<helios-player src="..." poster="img.jpg">`.
    - On load: Poster image is visible. No "Loading..." text overlay.
    - Click Play: Poster disappears, video plays.
  - **Scenario 2 (Poster + Preload None)**: `<helios-player src="..." poster="img.jpg" preload="none">`.
    - On load: Poster image is visible. Big Play Button is visible.
    - Click Play: Video loads (Status hidden), then plays. Poster disappears.
  - **Scenario 3 (No Poster)**: `<helios-player src="...">`.
    - On load: "Loading..." overlay is visible.
    - After load: Frame 0 is visible.
- **Edge Cases**:
  - **Error State**: If connection fails or export fails, `showStatus(msg, true)` is called. Since `isError` is true, ensure the overlay is shown (although the spec change only guarded the "Loading/Connecting" calls, we should ensure `showStatus` forces visibility). *Note: `showStatus` removes `hidden` class from overlay, so it will overlay the poster if called.*
