# Helios Project Backlog

## Milestones

### 1. Canvas MVP End-to-End (Current Focus)
- [ ] Verify `render:canvas-example` runs successfully.
- [ ] Implement `helios.diagnose()` for environment checks (FFmpeg, GPU).
- [ ] Add unit tests for `Renderer` class.
- [ ] Document "Canvas Capture" path clearly.

### 2. Core Architecture
- [ ] Expand `Helios` engine state management (add loop logic, complex timeline control).
- [ ] Add tests for `Helios` class.

### 3. WebCodecs Rendering Path (High Performance)
- [ ] Research and prototype `VideoEncoder` bridge from browser to Node.js.
- [ ] Replace `toDataURL` with `VideoFrame` transfer for canvas rendering.

### 4. DOM to Video Path
- [ ] Robust implementation of full DOM capture (beyond canvas).
- [ ] Asset preloading strategies.

### 5. In-Browser Player
- [ ] Integrate `Helios` core into the player component.
- [ ] Ensure player visualization matches renderer output.

### 6. Distributed Rendering
- [ ] Scaffolding for chunking logic.
- [ ] Research specific FFmpeg concat demuxer constraints.
