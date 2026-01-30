#### 1. Context & Goal
- **Objective**: Implement visual rendering of timeline markers on the `<helios-player>` scrubber to indicate key moments.
- **Trigger**: Vision gap. The `Helios` core and `HeliosState` support `markers` (id, time, label, color), but the player component currently ignores them.
- **Impact**: Enhances the user experience by allowing users to identify and navigate to specific points of interest (chapters, cues, keyframes) directly from the player UI.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/player/src/index.ts` (Update template with marker container, add CSS, implement rendering logic in `updateUI`)
- **Read-Only**: `packages/core/src/markers.ts` (Reference for Marker interface)

#### 3. Implementation Spec
- **Architecture**:
  - Inject a `.markers-container` `div` into the player's Shadow DOM, positioned absolute relative to the controls area, specifically aligned with the scrubber.
  - In the `updateUI` method, iterate over `state.markers` and render them as child `div` elements within the container.
  - Use CSS to position each marker based on its time relative to the total duration.
  - Enable interaction: clicking a marker should seek to its timestamp.
- **Pseudo-Code**:
  ```typescript
  // In template (HTML)
  <div class="markers-container" part="markers"></div>
  // positioned absolute, e.g., bottom: 20px, left: 16px, right: 16px

  // In template (CSS)
  .markers-container {
    position: absolute;
    bottom: 25px; /* Adjust to sit above scrubber */
    left: 16px;
    right: 16px;
    height: 6px;
    pointer-events: none;
  }
  .marker {
    position: absolute;
    width: 4px;
    height: 8px;
    background-color: var(--helios-accent-color);
    transform: translateX(-50%);
    cursor: pointer;
    pointer-events: auto;
    border-radius: 2px;
    top: 0;
  }
  .marker:hover {
    transform: translateX(-50%) scale(1.5);
    z-index: 10;
  }

  // In updateUI(state)
  const markersContainer = this.shadowRoot.querySelector(".markers-container");
  markersContainer.innerHTML = "";

  if (state.markers && state.duration > 0) {
    state.markers.forEach(marker => {
      const pct = (marker.time / state.duration) * 100;
      const el = document.createElement("div");
      el.className = "marker";
      el.style.left = `${pct}%`;
      if (marker.color) el.style.backgroundColor = marker.color;
      el.title = marker.label; // Native tooltip

      el.onclick = (e) => {
        e.stopPropagation();
        this.controller.seek(marker.time * state.fps);
      };

      markersContainer.appendChild(el);
    });
  }
  ```
- **Public API Changes**: None (Markers are already part of `HeliosState`).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run build -w packages/player`
- **Success Criteria**:
  - Markers render as visible elements on the timeline.
  - Markers are correctly positioned (e.g., a marker at 5s in a 10s video is at 50%).
  - Clicking a marker seeks the player to the correct frame.
  - Hovering a marker shows its label.
- **Edge Cases**:
  - Marker time exceeding duration (should be clamped or hidden by overflow).
  - Markers with no color (fallback to accent color).
  - Rapid state updates (performance check for DOM manipulation).
