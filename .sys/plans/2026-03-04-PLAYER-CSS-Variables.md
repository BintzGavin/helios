# 📋 PLAYER: CSS Variables for Theming

#### 1. Context & Goal
- **Objective**: Expose CSS Custom Properties (variables) on the `<helios-player>` Web Component to enable theming and visual integration.
- **Trigger**: Vision gap. The "Drop-in Web Component" should be visually adaptable to the host site's brand, but currently relies on hardcoded styles.
- **Impact**: Unlocks branding customization (colors, fonts) for developers integrating the player, improving the "Agent Experience" (and human experience) by making the component more flexible.

#### 2. File Inventory
- **Modify**:
  - `packages/player/src/index.ts`: Update the shadow DOM styles to use CSS variables with fallbacks.
- **Read-Only**:
  - `packages/player/src/index.test.ts`: Ensure tests don't rely on specific computed styles that might break (unlikely).

#### 3. Implementation Spec
- **Architecture**: Define CSS variables in the `:host` selector with default values (matching current hardcoded styles). Update internal classes to consume these variables.
- **Pseudo-Code**:
  ```css
  :host {
    /* Define defaults */
    --helios-controls-bg: rgba(0, 0, 0, 0.6);
    --helios-text-color: white;
    --helios-accent-color: #007bff; /* Primary blue */
    --helios-range-track-color: #555;
    --helios-font-family: sans-serif;
  }

  .controls {
    background: var(--helios-controls-bg);
    color: var(--helios-text-color);
    font-family: var(--helios-font-family);
  }

  .play-pause-btn, .volume-btn, .fullscreen-btn, .cc-btn {
     color: var(--helios-text-color);
  }

  .export-btn {
    background-color: var(--helios-accent-color);
    color: var(--helios-text-color);
  }

  .volume-slider, .scrubber {
    background: var(--helios-range-track-color);
  }

  /* Scrubber Thumb */
  .scrubber::-webkit-slider-thumb {
     background: var(--helios-accent-color);
  }

  /* Focus rings & Active states */
  .speed-selector:focus {
     border-color: var(--helios-accent-color);
  }

  .cc-btn.active {
     color: var(--helios-accent-color);
     border-bottom-color: var(--helios-accent-color);
  }
  ```
- **Public API Changes**:
  - The component now supports the following CSS variables:
    - `--helios-controls-bg`
    - `--helios-text-color`
    - `--helios-accent-color`
    - `--helios-range-track-color`
    - `--helios-font-family`
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run build -w packages/player`
- **Success Criteria**:
  - Build succeeds.
  - Manual verification confirms that setting these variables on the `helios-player` element updates the styles.
- **Edge Cases**:
  - Ensure fallbacks in `:host` allow the player to look identical to before if no variables are provided.
