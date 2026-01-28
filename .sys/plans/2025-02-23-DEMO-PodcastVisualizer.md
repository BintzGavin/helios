# 2025-02-23-DEMO-PodcastVisualizer.md

## 1. Context & Goal
- **Objective**: Create `examples/podcast-visualizer` to demonstrate multi-track audio mixing and kinetic typography.
- **Trigger**: The README promises "Basic (FFmpeg)" audio mixing and "Realistic" examples, but no current example demonstrates mixing multiple audio tracks (e.g., voiceover + background music) or "Kinetic Typography" style animation.
- **Impact**: This example will verify the renderer's ability to mix multiple audio sources and provide a template for "Use What You Know" content creation (podcasts, social clips).

## 2. File Inventory
- **Create**:
  - `examples/podcast-visualizer/vite.config.js`: Standard Vite config for the example.
  - `examples/podcast-visualizer/composition.html`: HTML entry point.
  - `examples/podcast-visualizer/src/main.jsx`: React application entry.
  - `examples/podcast-visualizer/src/App.jsx`: Main composition logic (Audio + Typography).
  - `examples/podcast-visualizer/src/assets/media.js`: Contains Base64 strings for "Background Music" and "Voiceover".
- **Modify**:
  - `vite.build-example.config.js`: Add `podcast_visualizer` to the rollup input options.
- **Read-Only**:
  - `examples/social-media-story/src/main.jsx` (Reference for setup)

## 3. Implementation Spec
- **Architecture**:
  - React-based composition.
  - Uses `autoSyncAnimations: true` to drive two `<audio>` elements via `DomDriver`.
  - Uses `interpolate` and `spring` to drive CSS transforms for typography.
- **Pseudo-Code (App.jsx)**:
  - Import `Helios` from `../../../packages/core/src/index.ts`.
  - Initialize Helios with `autoSyncAnimations: true`.
  - Define `MUSIC_SRC` and `VOICE_SRC` (Base64 WAVs) in `media.js`.
  - In `App.jsx`, render:
    - `<audio src={MUSIC} loop volume={0.2} />`
    - `<audio src={VOICE} volume={1.0} />`
    - Typography components that animate based on `useVideoFrame`.
  - Sync Logic:
    - Text "Welcome to the show" appears at frame 0.
    - Text "Today we talk about..." appears at frame 60 (simulated voice start).
- **Public API Changes**: None.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: Run `npm run build:examples`.
- **Success Criteria**: The build completes successfully, and `output/example-build` contains the compiled `podcast_visualizer` entry.
- **Edge Cases**: Ensure Base64 assets are valid and do not cause memory issues during build.
