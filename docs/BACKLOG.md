# Helios Backlog

## Milestones

### 1. Canvas MVP End-to-End
- [x] Implement `HeliosEngine` core logic (Timeline, State).
- [x] Create a basic Canvas rendering example (using Helios core).
- [x] Implement `renderFrames` function in renderer.
- [x] Wire up FFmpeg for video output.
- [x] Create a CLI entry point for rendering.
- [x] Refactor `Renderer` to use `WebCodecs` (High Performance) instead of `toDataURL` (current MVP).
- [x] Add test script to packages/core.

### 2. DOM to Video Path
- [x] Implement Playwright capture loop for DOM elements.
- [x] Handle asset preloading.

### 3. In-Browser Player Polish
- [x] Ensure `<helios-player>` works with `HeliosEngine`.
- [x] Sync player state with engine state.
- [x] Implement robust Client-Side Export (WebCodecs) using the correct `seek` mechanism.
- [x] Add proper UI feedback for "Loading" state.

### 4. Diagnostics and GPU Detection
- [x] Implement `helios.diagnose()` for environment checks.
- [x] Expose programmatic diagnostics in Renderer (`renderer.diagnose()`).

### 5. Documentation and Examples
- [ ] Add Quickstart guide.
- [ ] Add realistic examples (Canvas and DOM).

### 6. Distributed Rendering Research
- [x] Scaffolding for distributed rendering.

### 7. Helios Studio
- [x] Scaffold `packages/studio` package.
- [x] Implement Studio UI (Timeline, Props).
- [x] Implement CLI integration.
- [x] Implement Asset Discovery (Backend & UI).

### 8. Maintenance
- [x] Synchronize package versions (Fix CORE 2.7.1 dependency mismatch in PLAYER/RENDERER).
- [ ] Fix workspace version mismatch between packages/renderer and packages/core (Core 2.11.0 vs Renderer req 2.10.0).
- [ ] **Fix GSAP Timeline Synchronization in SeekTimeDriver**
  - **Problem**: Promo video (`examples/promo-video/composition.html`) renders a black video with only the background visible. All scenes (Logo Reveal, Tagline, Code to Video, Frameworks, CTA, End Card) are missing because GSAP timeline animations aren't being seeked during rendering.
  - **Last Working State**: Commit `9558e19` (Jan 29, 2026) - "✨ PROMO: Add Promo Video Example and Render Script"
  - **Root Cause**: The composition uses GSAP timeline (`tl`) with `paused: true` and a Helios subscription that seeks the timeline:
    ```javascript
    helios.subscribe((state) => {
      const timeInSeconds = state.currentFrame / FPS;
      tl.seek(timeInSeconds);
    });
    ```
    The original working flow was: `SeekTimeDriver.setTime()` sets `window.__HELIOS_VIRTUAL_TIME__` → `bindToDocumentTimeline()` polling loop detects change → Updates Helios internal state → Triggers subscription callback → Subscription seeks GSAP timeline.
  - **What Broke**:
    - **GSAP timeline availability**: `window.__helios_gsap_timeline__` is not available when `setTime()` first runs because `main.js` (ES module) executes asynchronously, even after `waitUntil: 'networkidle'`.
    - **Subscription timing**: `helios.subscribe()` uses `effect()` which may not fire synchronously when `helios.seek()` is called. The signal update happens, but the effect callback may be deferred.
    - **Polling loop reliability**: `bindToDocumentTimeline()` polls via `requestAnimationFrame`, which may not fire frequently enough during fast frame-by-frame rendering.
  - **Key Commits That May Have Broken It**:
    - `97a5d2a` - "✨ CORE: Bind Virtual Time" - Added virtual time check to `bindToDocumentTimeline()`
    - `38230fb` - "✨ RENDERER: Enforce deterministic Date.now()" - Changed `initialDate` from `Date.now()` to fixed epoch
    - `dc5615f` - "✨ RENDERER: Recursive Animation Discovery" - Added Shadow DOM support
    - `a08325b` - "✨ RENDERER: Enable Shadow DOM Media Sync" - Enhanced media element finding
  - **Files Involved**:
    - `packages/renderer/src/drivers/SeekTimeDriver.ts` - Primary fix location (added Helios seek and GSAP timeline seeking logic)
    - `packages/core/src/index.ts` - `bindToDocumentTimeline()` implementation (may need subscription timing adjustments)
    - `examples/promo-video/src/main.js` - Composition that uses GSAP + Helios subscription (exposes `window.__helios_gsap_timeline__ = tl;`)
  - **Recommended Approach**:
    1. Examine working code: `git show 9558e19:packages/renderer/src/drivers/SeekTimeDriver.ts` and `git show 9558e19:packages/core/src/index.ts` - compare line-by-line with current versions
    2. Ensure timeline availability: Wait for `window.__helios_gsap_timeline__` to be available before starting to render (possibly in renderer's `prepare()` phase or by checking in `setTime()` with a short wait)
    3. Investigate subscription firing: Add logging to verify if/when the Helios subscription callback fires
    4. Verify polling loop: Ensure `bindToDocumentTimeline()` polling loop runs frequently enough during fast rendering
    5. Consider alternatives: If subscription approach is unreliable, consider using `CdpTimeDriver` instead of `SeekTimeDriver` for DOM mode (though it had hanging issues before), or ensure GSAP timeline is exposed and available before rendering starts
  - **Current State**: Render completes but produces black video. GSAP timeline is not being seeked, so all elements remain at `opacity: 0` (their initial CSS state).
  - **Success Criteria**: Promo video renders correctly with all scenes visible (Logo Reveal, Tagline, Code to Video, Frameworks, CTA, End Card). GSAP timeline animations are synchronized with frame capture. No regressions in other rendering scenarios.
