# Backlog

## Milestones

### 1. Canvas MVP End-to-End (Current Focus)
- [x] Basic render script (`packages/renderer/scripts/render.ts`)
- [ ] **Diagnostics Tool**: Verify environment (FFmpeg, GPU).
- [ ] **WebCodecs Path**: Update renderer to use `VideoEncoder` or efficient frame transfer instead of `toDataURL`.
- [ ] **Dev Server Integration**: Render from a local server instead of `file://`.
- [ ] **Example Polish**: Add a more complex canvas example with external assets.

### 2. DOM to Video Path
- [ ] Implement `renderDOM` method in renderer.
- [ ] Handle asset preloading strategy.
- [ ] Add `simple-animation` (DOM) render example.

### 3. Core Architecture
- [ ] Strengthen `HeliosEngine` usage in compositions.
- [ ] Ensure `packages/core` is the single source of truth for time.

### 4. Developer Experience
- [ ] CLI tool (`helios` command).
- [ ] Quickstart documentation.
- [ ] Better error handling for missing dependencies.

### 5. Future
- [ ] Distributed rendering research.
- [ ] Advanced audio support.
