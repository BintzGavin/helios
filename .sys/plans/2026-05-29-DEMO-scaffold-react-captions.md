# 1. Context & Goal
- **Objective**: Create a new example `examples/react-captions-animation` to demonstrate how to integrate Helios's built-in SRT caption parsing with React using a custom hook.
- **Trigger**: The README lists "Captions" as a feature (supported in Core via `captions-animation`), but there is no idiomatic React example showing how to consume the `activeCaptions` signal.
- **Impact**: Provides a clear reference for React developers, "documenting by example" a feature that is currently under-documented and ensures React compatibility is verified.

# 2. File Inventory
- **Create**:
  - `examples/react-captions-animation/composition.html`: Entry point for Helios renderer.
  - `examples/react-captions-animation/vite.config.js`: Dev server configuration (standard pattern).
  - `examples/react-captions-animation/src/main.jsx`: React entry point.
  - `examples/react-captions-animation/src/App.jsx`: Main component instantiating Helios and rendering UI.
  - `examples/react-captions-animation/src/hooks/useCaptions.js`: Custom hook exposing `activeCaptions` state.
  - `examples/react-captions-animation/src/hooks/useVideoFrame.js`: Standard hook for frame syncing (if needed for other animations, or just for completeness).
- **Read-Only**:
  - `examples/react-animation-helpers/`: Reference for directory structure and config patterns.
  - `packages/core/src/index.ts`: Reference for `Helios` API.

# 3. Implementation Spec
- **Architecture**:
  - **Framework**: React + Vite (standard Helios example stack).
  - **State Management**:
    - `Helios` instance is a singleton (created in `App.jsx` scope).
    - `useCaptions` hook subscribes to `helios` state updates.
    - Since `activeCaptions` is a Signal in Core, the hook should efficiently update local React state only when the reference changes.
  - **Data Flow**: SRT String -> Helios Core (Parse) -> `activeCaptions` Signal -> `helios.subscribe` -> `useCaptions` Hook -> React Component Render.

- **Pseudo-Code**:

  **`src/hooks/useCaptions.js`**:
  ```
  FUNCTION useCaptions(heliosInstance):
    STATE captions = heliosInstance.activeCaptions.value

    EFFECT [heliosInstance]:
      SUBSCRIBE to heliosInstance:
        CALLBACK (state):
          SET captions = state.activeCaptions
      RETURN unsubscribe function

    RETURN captions
  ```

  **`src/App.jsx`**:
  ```
  CONST srtData = "..." // SRT formatted string
  CONST heliosInstance = NEW Helios({ captions: srtData, ... })
  BIND heliosInstance to DocumentTimeline
  EXPOSE heliosInstance to window (if defined)

  COMPONENT CaptionOverlay:
    CONST captions = useCaptions(heliosInstance)
    IF captions is empty RETURN null

    RETURN DIV container:
      FOR EACH cue IN captions:
        RENDER DIV with cue.text

  COMPONENT App:
    RETURN DIV root:
      RENDER CaptionOverlay
      RENDER other visual elements
  ```

- **Dependencies**: None (uses existing `@helios-project/core`).

# 4. Test Plan
- **Verification**:
  1. Run `npm run build:examples` to ensure the new example builds correctly.
  2. Run `npx tsx tests/e2e/verify-render.ts "React Captions"` to verify the rendering pipeline.
- **Success Criteria**:
  - The build command succeeds.
  - The `verify-render.ts` script finds `examples/react-captions-animation/composition.html`.
  - The renderer produces a video file (`output/react-captions-animation-render-verified.mp4`) without errors.
- **Edge Cases**:
  - Empty SRT string (should render nothing, no crash).
  - React component unmounting (should unsubscribe cleanly).
