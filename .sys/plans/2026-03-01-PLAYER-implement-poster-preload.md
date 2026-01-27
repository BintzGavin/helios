# 2026-03-01 - Implement Poster and Preload Attributes

#### 1. Context & Goal
- **Objective**: Implement `poster` and `preload` attributes to improve initial load performance and providing a custom preview image.
- **Trigger**: "In-Browser Preview" vision gap; current implementation loads iframes immediately (performance issue) and shows a blank/loading state (visual issue).
- **Impact**: Enables "Click-to-Load" behavior for better page performance (especially with multiple players) and improves aesthetics with custom preview images.

#### 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Implement attributes, UI, and logic)
- **Modify**: `packages/player/src/index.test.ts` (Add tests for new attributes and behavior)

#### 3. Implementation Spec
- **Architecture**:
  - Enhance `HeliosPlayer` Web Component with new observed attributes.
  - Introduce a "Poster Layer" in Shadow DOM (image + big play button) that sits above the iframe.
  - Implement a "Lazy Load" state machine that defers setting the iframe's `src` until interaction if `preload="none"`.

- **Pseudo-Code**:
  - **Class `HeliosPlayer`**:
    - Add `poster` and `preload` to `observedAttributes`.
    - Add `pendingSrc` (string | null) and `isLoaded` (boolean) to state.
    - **UI**:
      - Add `.poster-container` to template (absolute, inset 0, z-index high).
      - Add `.poster-image` (img) and `.big-play-btn` (button) inside container.
    - **`attributeChangedCallback`**:
      - `poster`: Update `.poster-image.src`. Toggle container visibility based on value.
      - `src`:
        - If `preload === 'none'` AND `!isLoaded`: Save to `pendingSrc`. Do NOT set `iframe.src`. Show Poster.
        - Else: Set `iframe.src`. Mark `isLoaded = true`.
    - **`load()` Method**:
      - If `pendingSrc`: Set `iframe.src = pendingSrc`. `isLoaded = true`. Show "Loading..." overlay.
    - **Interaction**:
      - Click on `.big-play-btn`: Call `load()`. Once connected (or immediately if `auto`), call `play()`.
      - `play()`: If `!isLoaded`, `load()`. Then delegate to controller.
    - **Lifecycle**:
      - On `play` event (from controller): Add `.hidden` class to `.poster-container`.
      - On `ended` event: Optionally show poster again? (Standard video doesn't, usually resets to first frame). Keep hidden for now.

- **Public API Changes**:
  - New Attribute: `poster` (URL string).
  - New Attribute: `preload` ("auto" | "none" | "metadata"). Default "auto". ("metadata" treated as "auto" for now as we need iframe for metadata).

- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run test -w packages/player`
- **Success Criteria**:
  - `preload="none"`: Verify `iframe.getAttribute('src')` is empty initially when `src` attribute is present.
  - `poster`: Verify `.poster-image` has correct `src`.
  - Interaction: Verify clicking `.big-play-btn` sets `iframe.src` and starts playback.
  - Visibility: Verify poster is hidden when `play` event fires.
- **Edge Cases**:
  - `preload="auto"` (default) should load immediately.
  - Changing `src` dynamically should reset `isLoaded` if `preload="none"` (or maybe always load if already loaded? Standard behavior is to reset).
  - Invalid `poster` URL (handled by browser img error, optional fallback).
