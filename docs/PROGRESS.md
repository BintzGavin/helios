### PLAYER v0.63.1
- ✅ Completed: Fix cuechange on Disable - Fixed bug where disabling a track cleared active cues without dispatching the cuechange event.

### CORE v5.8.0
- ✅ Completed: Expose Fade Easing Metadata - Added `fadeEasing` to `AudioTrackMetadata` and updated `DomDriver` to parse `data-helios-fade-easing` attribute, exposing non-linear fade configurations to consumers.

### DEMO v1.92.0
- ✅ Completed: Svelte Audio Visualization - Created `examples/svelte-audio-visualization` demonstrating real-time audio analysis using Svelte derived stores.

### STUDIO v0.84.0
- ✅ Completed: Timeline Persistence - Implemented persistence for Current Frame, In Point, Out Point, and Loop state across reloads and composition switches.

### STUDIO v0.83.0
- ✅ Completed: Loop Range - Implemented logic to loop playback within defined In/Out points (including handling of Out Point = 0 for full duration), ensuring smooth playback for specific sections.

### RENDERER v1.61.1
- ✅ Completed: Fix Audio Playback Seek - Updated `FFmpegBuilder` to correctly calculate input seek time (`-ss`) when using `playbackRate` with `startFrame > 0`.

### CORE v5.7.0
- ✅ Completed: Enable Audio State Persistence - Added `audioTracks` to `HeliosOptions` and updated constructor to initialize mixer state (volume/muted per track) from configuration, enabling full session save/load.

### CORE v5.6.0
- ✅ Completed: Audio Fade Easing - Implemented `data-helios-fade-easing` support in `DomDriver`, allowing non-linear audio fades (e.g. "quad.in").

### PLAYER v0.62.1
- ✅ Completed: Fix SRT Export Filename - Updated SRT export to respect `export-filename` attribute instead of using hardcoded "captions.srt".

### PLAYER v0.62.0
- ✅ Completed: Export Filename - Implemented `export-filename` attribute on `<helios-player>` to allow customizing the filename of client-side exported videos.

### DEMO v1.91.0
- ✅ Completed: Lottie Animation - Created `examples/lottie-animation` demonstrating integration with `lottie-web`.

### DEMO v1.90.0
- ✅ Completed: Vue Audio Visualization - Created `examples/vue-audio-visualization` demonstrating real-time audio analysis with Vue 3.

## PLAYER v0.63.0
- ✅ Completed: Implement Active Cues - Added `activeCues` property and `cuechange` event to `HeliosTextTrack`, and updated `HeliosPlayer` to drive cue updates via the main UI loop.
