### CORE v5.7.0
- ✅ Completed: Enable Audio State Persistence - Added `audioTracks` to `HeliosOptions` and updated constructor to initialize mixer state (volume/muted per track) from configuration, enabling full session save/load.

### CORE v5.6.0
- ✅ Completed: Audio Fade Easing - Implemented `data-helios-fade-easing` support in `DomDriver`, allowing non-linear audio fades (e.g. "quad.in").

### PLAYER v0.62.0
- ✅ Completed: Export Filename - Implemented `export-filename` attribute on `<helios-player>` to allow customizing the filename of client-side exported videos.

### DEMO v1.90.0
- ✅ Completed: Vue Audio Visualization - Created `examples/vue-audio-visualization` demonstrating real-time audio analysis with Vue 3.
