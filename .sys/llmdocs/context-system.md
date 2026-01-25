# Context: System (Global Constraints)

## A. Milestones
1. **Canvas MVP End-to-End** (Mostly Complete)
   - Core Logic, Canvas Rendering, FFmpeg Output, CLI.
2. **DOM to Video Path**
   - Playwright capture loop for DOM elements.
3. **In-Browser Player Polish**
   - `<helios-player>` synchronization, Client-Side Export (WebCodecs).
4. **Diagnostics and GPU Detection**
   - `helios.diagnose()` for environment checks.
5. **Documentation and Examples**
   - Quickstart, Realistic Examples (React, Vue, Svelte).
6. **Distributed Rendering Research**
7. **Helios Studio**
   - Browser-based IDE for composition (UI, Playback Controls, Asset Discovery implemented).

## B. Role Boundaries
1. **Core (`packages/core`)**:
   - **MUST NOT** import from `renderer` or `player`.
   - **MUST** remain environment-agnostic (Node.js, Browser, Worker).
2. **Renderer (`packages/renderer`)**:
   - Imports `core` for types and logic reuse.
   - **MUST** handle Headless Chrome interactions.
3. **Player (`packages/player`)**:
   - Imports `core` for types.
   - **MUST** work as a standalone Web Component.
4. **Studio (`packages/studio`)**:
   - Imports `player` for preview.
   - **MUST** provide the browser-based development environment.

## C. Shared Commands
- `npm run build:examples`: Bundles all examples in `examples/` using Vite, making them ready for the Renderer.
- `npm run dev`: Starts the development environment.
- `npm test -w packages/core`: Runs Core unit tests.
