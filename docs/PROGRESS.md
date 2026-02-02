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
- **DOCS**: Update `docs/PROGRESS-DOCS.md`

## Instructions for Each Agent

### CORE Agent
- **Your progress file**: `docs/PROGRESS-CORE.md`
- Find or create a version section: `## CORE vX.Y.Z`
- Add your entry under that version section:
  ```markdown
  ### CORE vX.Y.Z
  - ✅ Completed: [Task Name] - [Brief Result]
  ```
- If this is a new version, create the section at the top of the file (after any existing content)
- Group multiple completions under the same version section if they're part of the same release

## SKILLS v1.1.0
- ✅ Completed: Daily Skills Review
  - Updated API skills for `core`
  - Created API skills for `renderer`, `player`
  - Created workflow skills for `create-composition`, `render-video`
  - Created example skills for `react`, `vue`, `canvas`

### PLAYER Agent
- **Your progress file**: `docs/PROGRESS-PLAYER.md`
- Find or create a version section: `## PLAYER vX.Y.Z`
- Add your entry under that version section:
  ```markdown
  ### PLAYER vX.Y.Z
  - ✅ Completed: [Task Name] - [Brief Result]
  ```
- If this is a new version, create the section at the top of the file (after any existing content)
- Group multiple completions under the same version section if they're part of the same release

### PLAYER v0.48.2
- ✅ Completed: Enforce Bridge Connection Security - Added missing `event.source` check in `connectToParent` (bridge.ts) to verify messages originate from the parent window, completing the bridge security hardening.

### PLAYER v0.46.0
- ✅ Completed: Visualize Markers - Implemented visual rendering of timeline markers on the scrubber, including clickable interaction to seek to the marker's timestamp.

### PLAYER v0.45.0
- ✅ Completed: Interactive Playback Range - Implemented `I` (In), `O` (Out), and `X` (Clear) keyboard shortcuts to set the playback loop range interactively.

### PLAYER v0.34.0
- ✅ Completed: Implement Seeking Events & Played Property - Implemented seeking/seeked events and played property to complete HTMLMediaElement parity.

### PLAYER v0.32.1
- ✅ Completed: Fix Player Dependencies - Updated @helios-project/core dependency and fixed build environment to enable verification.

### PLAYER v0.30.0
- ✅ Completed: Audio Export Enhancements - Implemented `loop` and `startTime` support for client-side audio export, plus declarative `volume` attribute parsing.

### RENDERER Agent
- **Your progress file**: `docs/PROGRESS-RENDERER.md`
- Find or create a version section: `## RENDERER vX.Y.Z`
- Add your entry under that version section:
  ```markdown
  ### RENDERER vX.Y.Z
  - ✅ Completed: [Task Name] - [Brief Result]
  ```
- If this is a new version, create the section at the top of the file (after any existing content)
- Group multiple completions under the same version section if they're part of the same release

### DEMO Agent
- **Your progress file**: `docs/PROGRESS-DEMO.md`
- Find or create a version section: `## DEMO vX.Y.Z`
- Add your entry under that version section:
  ```markdown
  ### DEMO vX.Y.Z
  - ✅ Completed: [Task Name] - [Brief Result]
  ```
- If this is a new version, create the section at the top of the file (after any existing content)
- Group multiple completions under the same version section if they're part of the same release

### STUDIO Agent
- **Your progress file**: `docs/PROGRESS-STUDIO.md`
- Find or create a version section: `## STUDIO vX.Y.Z`
- Add your entry under that version section:
  ```markdown
  ### STUDIO vX.Y.Z
  - ✅ Completed: [Task Name] - [Brief Result]
  ```
- If this is a new version, create the section at the top of the file (after any existing content)
- Group multiple completions under the same version section if they're part of the same release

### DOCS Agent
- **Your progress file**: `docs/PROGRESS-DOCS.md`
- Find or create a version section: `## DOCS vX.Y.Z`
- Add your entry under that version section:
  ```markdown
  ### DOCS vX.Y.Z
  - ✅ Completed: [Task Name] - [Brief Result]
  ```
- If this is a new version, create the section at the top of the file (after any existing content)
- Group multiple completions under the same version section if they're part of the same release

## DEMO v1.86.1
- ✅ Verified: Vanilla Transitions - Verified build and E2E tests for the existing implementation.

## DEMO v1.86.0
- ✅ Completed: Vanilla Transitions - Created `examples/vanilla-transitions` demonstrating sequenced scene transitions using Vanilla JS and the `sequence()` utility.

## STUDIO v0.80.1
- ✅ Completed: Maintenance - Updated dependencies to align with Core v5 and Player v0.57.1, resolving workspace conflicts.

## DEMO v1.83.0
- ✅ Completed: Solid Three.js Canvas Animation - Created `examples/solid-threejs-canvas-animation` demonstrating Three.js integration with SolidJS and Helios.

## DEMO v1.78.0
- ✅ Completed: Verify Promo Video - Confirmed Promo Video example renders correctly, unblocking the demo.

## STUDIO v0.53.0
- ✅ Completed: Recursive Schema Support - Implemented ObjectInput and ArrayInput for recursive UI generation in Props Editor.

## CORE v2.17.0
- ✅ Completed: Implement Typed Arrays - Added support for Typed Arrays (Float32Array, etc.) in HeliosSchema and validateProps.

## CORE v2.17.1
- ✅ Completed: Fix Leaky Signal Subscriptions - Implemented `untracked` and updated `subscribe` to prevent dependency tracking within callbacks.

## CORE v2.18.0
- ✅ Completed: Schema Constraints - Added `minItems`, `maxItems`, `minLength`, `maxLength` constraints to `PropDefinition` and implemented validation logic.

## DEMO v1.71.0
- ✅ Completed: Scaffold React Captions Animation - Created `examples/react-captions-animation` demonstrating `useCaptions` hook for integrating Helios SRT parsing with React.

## SKILLS v1.8.0
- ✅ Completed: Daily Skills Review
  - Added SolidJS skill
  - Added Svelte 5 Runes pattern
  - Updated Core with RenderSession utility
  - Updated Player with Picture-in-Picture and Export Caption Mode

## SKILLS v1.7.0
- ✅ Completed: Daily Skills Review
  - Updated API skills for `core` (AI Context, Schema Groups)
  - Updated API skills for `renderer` (frameCount, H.264 priority)
  - Updated API skills for `player` (export-caption-mode, Text Tracks)
  - Updated API skills for `studio` (MCP, Persistent Jobs)
  - Updated workflow skills for `render-video`

## DOCS v1.6.0
- ✅ Completed: Daily Documentation Review
  - Updated API documentation for Core (Audio Tracks), Player (PiP), Renderer (Canvas Selector)
  - Synced changelog entries for all packages
  - Created documentation for 3 new examples and Audio Tracks guide
  - Updated Studio guide with new features
  - Updated navigation structure in `mint.json`

## STUDIO v0.72.1
- ✅ Verified: Robustness - Added output file verification to Render Manager to ensure failed renders (empty/missing files) are correctly reported as failures.

## STUDIO v0.72.0
- ✅ Completed: Helios Assistant - Implemented context-aware AI assistant with documentation search, replacing System Prompt Modal.

## DEMO v1.85.0
- ✅ Completed: Vanilla Captions Animation - Created `examples/vanilla-captions-animation` demonstrating Helios captions (SRT) support in Vanilla TypeScript, replacing the legacy `examples/captions-animation`.

## CORE v5.0.0
- ✅ Completed: Implement Audio Track Metadata - Updated `availableAudioTracks` signal to return `AudioTrackMetadata[]` instead of `string[]` (Breaking Change), including `startTime` and `duration` discovery.

## PLAYER v0.56.2
- ✅ Completed: Fix Core Dependency - Updated `packages/player/package.json` to depend on `@helios-project/core@^5.0.1` to resolve version mismatch and fix the build.

### PLAYER v0.57.0
- ✅ Completed: Configurable Export Resolution - Implemented `export-width` and `export-height` attributes to allow specifying target resolution for client-side exports, enabling high-quality DOM exports independent of player size.

### PLAYER v0.57.1
- ✅ Completed: Fix Test Environment & Sync Version - Updated package version to match status file, installed missing dependencies, and verified all tests pass (including Shadow DOM export).

## CORE v5.1.2
- ✅ Completed: Fix GSAP Synchronization - Forced subscriber notification in `bindToDocumentTimeline` when virtual time is present to ensure initial state synchronization with external libraries like GSAP, resolving black frames in render output.

## SKILLS v1.9.0
- ✅ Completed: Daily Skills Review
  - Updated `player/SKILL.md` with new export attributes (`export-width`, `export-height`) and `disablepictureinpicture`
  - Updated `examples/solid/SKILL.md` with Three.js integration patterns
  - Created `examples/vanilla/SKILL.md` for framework-less integration
  - Verified Svelte 5 patterns in `examples/svelte/SKILL.md`

### PLAYER v0.58.0
- ✅ Completed: Configurable Export Bitrate - Implemented `export-bitrate` attribute to control client-side export quality.
