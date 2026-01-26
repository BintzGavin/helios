# Plan: Implement Caption Rendering in `<helios-player>`

#### 1. Context & Goal
- **Objective**: Implement caption rendering within the `<helios-player>` Web Component, toggled via a new "CC" button, utilizing the `activeCaptions` state from `packages/core`.
- **Trigger**: The roadmap item "Captions & Audio" identifies caption support as a key feature, and while `packages/core` exposes caption state, `packages/player` lacks the UI to display it.
- **Impact**: Enables users to preview subtitles/captions directly in the player, improving the "In-Browser Preview" parity with final renders and supporting accessibility workflows.

#### 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Add UI structure, styles, and rendering logic)
- **Modify**: `packages/player/src/index.test.ts` (Add unit tests for caption toggling and rendering)

#### 3. Implementation Spec
- **Architecture**:
    - **DOM**: Add a `.captions-container` div inside the Shadow DOM, absolutely positioned above the controls overlay.
    - **UI**: Add a `.cc-btn` (toggle button) to the control bar next to the volume control.
    - **State**: Track a local `showCaptions` boolean state (default: `false`).
    - **Update Loop**: In `updateUI`, check `state.activeCaptions`. If `showCaptions` is true and captions exist, render them as child divs of `.captions-container`.
- **Pseudo-Code**:
    ```typescript
    // In template styles
    .captions-container {
        position: absolute;
        bottom: 60px; /* Above controls */
        left: 50%;
        transform: translateX(-50%);
        text-align: center;
        width: 80%;
        pointer-events: none;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
    }
    .caption-cue {
        background: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 16px;
        text-shadow: 0 1px 2px black;
    }

    // In class
    private showCaptions = false;

    toggleCaptions() {
        this.showCaptions = !this.showCaptions;
        this.ccBtn.classList.toggle('active', this.showCaptions);
        // re-render current frame to update UI immediately
        if (this.controller) this.updateUI(this.controller.getState());
    }

    updateUI(state) {
        // ... existing code ...

        // Render Captions
        this.captionsContainer.innerHTML = '';
        if (this.showCaptions && state.activeCaptions && state.activeCaptions.length > 0) {
            state.activeCaptions.forEach(cue => {
                const div = document.createElement('div');
                div.className = 'caption-cue';
                div.textContent = cue.text;
                this.captionsContainer.appendChild(div);
            });
        }
    }
    ```
- **Public API Changes**: None (Internal UI change only).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm test -w packages/player`
- **Success Criteria**:
    - Test `should toggle captions on CC button click` passes.
    - Test `should render active captions when enabled` passes.
    - Test `should hide captions when disabled` passes.
    - Manual inspection (if possible) shows captions appearing above controls.
- **Edge Cases**:
    - `activeCaptions` is undefined/null (should handle gracefully).
    - Long caption text (should wrap or be centered).
    - Multiple simultaneous cues (should stack).
