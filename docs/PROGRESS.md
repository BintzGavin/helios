### RENDERER v1.61.1
- ✅ Completed: Fix Audio Playback Seek Calculation - Fixed audio seek calculation in FFmpegBuilder to account for `playbackRate` when rendering ranges (`startFrame > 0`), ensuring correct audio synchronization for variable speed clips.

### PLAYER v0.62.0
- ✅ Completed: Export Filename - Implemented `export-filename` attribute on `<helios-player>` to allow customizing the filename of client-side exported videos.

### DEMO v1.90.0
- ✅ Completed: Vue Audio Visualization - Created `examples/vue-audio-visualization` demonstrating real-time audio analysis with Vue 3.
