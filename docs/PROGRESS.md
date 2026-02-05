# Helios Project Progress Log

This file serves as a central index. Each agent maintains their own progress file to avoid merge conflicts.

## Agent Progress Files

Each agent should update **their own dedicated progress file** instead of this file:

- **CORE**: Update `docs/PROGRESS-CORE.md`
- **PLAYER**: Update `docs/PROGRESS-PLAYER.md`
- **RENDERER**: Update `docs/PROGRESS-RENDERER.md`
- **DEMO**: Update `docs/PROGRESS-DEMO.md`
- **STUDIO**: Update `docs/PROGRESS-STUDIO.md`
- **SKILLS**: Update `docs/PROGRESS-SKILLS.md`

### PLAYER v0.70.2
- ✅ Verified: Granular Playback - Verified expanded playback speed options (0.25x - 2x) via unit tests.

### CLI v0.11.0
- ✅ Completed: Implement List Command - Implemented `helios list` to display installed components.
- ✅ Verified: List Command - Verified `helios list` correctly lists installed components, handles empty lists, and missing config.

### RENDERER v1.71.1
- ✅ Completed: Deterministic Randomness - Enforced deterministic Math.random() in `CdpTimeDriver` and `SeekTimeDriver` by injecting a seeded Mulberry32 PRNG via `page.addInitScript`, ensuring consistent generative rendering. Verified with `verify-random-determinism.ts`.

### CLI v0.10.1
- ✅ Completed: Sync & Verify - Synced CLI version, updated context documentation, and verified distributed rendering concurrency flags.

### RENDERER v1.71.0
- ✅ Completed: Hardware Accelerated Codec Priority - Updated `CanvasStrategy` to prioritize hardware-accelerated codecs (checking `navigator.mediaCapabilities.encodingInfo` for `powerEfficient: true`) and prefer H.264 over VP9 when hardware support is equivalent. Verified with `verify-hardware-codec-selection.ts`.

### CLI v0.8.0
- ✅ Completed: Auto-Install Dependencies - Implemented automatic dependency installation for `helios add` with `--no-install` flag.

### CLI v0.7.0
- ✅ Completed: Remote Registry Support - Implemented `RegistryClient` to fetch components from a remote URL with local fallback.

### CLI v0.6.0
- ✅ Completed: Implement Merge Command - Implemented `helios merge` command to stitch multiple video files into a single output without re-encoding.
- **DOCS**: Update `docs/PROGRESS-DOCS.md`

### CLI v0.4.1
- ✅ Completed: Implement `helios render` command - Implemented and verified the `render` command using `@helios-project/renderer`.

### DOCS v1.10.0
- ✅ Completed: Daily Documentation Review - Player Export API & CLI Sync. Updated Changelogs (Renderer, CLI, Player), API Docs (Player.export, CLI merge/add, Renderer Hardware Accel), and Examples.

### DOCS v1.9.0
- ✅ Completed: Daily Documentation Review - CLI & Studio Sync. Created CLI Docs, updated all changelogs and API docs.

### RENDERER v1.64.1
- ✅ Completed: Verify and Sync - Verified v1.64.0 distributed rendering and synced documentation. Verified with `verify-distributed.ts` and `npm run test`.

### RENDERER v1.64.0
- ✅ Completed: Distributed Audio Mixing - Updated `RenderOrchestrator` to decouple audio mixing from distributed video rendering chunks. Chunks are now rendered silently and concatenated, with audio mixed in a final pass to prevent glitches. Verified with `verify-distributed.ts`.

### RENDERER v1.63.2
- ✅ Completed: Verify Virtual Time Binding - Updated `SeekTimeDriver` to warn (once per session) if the Helios player is not reactively bound to virtual time, ensuring developers are aware of potential polling fallbacks. Verified with `verify-virtual-time-binding.ts`.

## RENDERER v1.65.0
- ✅ Completed: Smart Audio Fades - Updated audio fading logic to respect clip duration for accurate fade-out timing.

## PLAYER v0.68.1
- ✅ Completed: Robust Audio Metering - Refactored `AudioMeter` to support non-destructive toggling, preventing audio playback from stopping when metering is disabled.

## PLAYER v0.68.0
- ✅ Completed: Expose Export API - Implemented public `export()` method on `<helios-player>` to allow programmatic triggering of client-side exports with configurable options (format, resolution, bitrate, etc.).
