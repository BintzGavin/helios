# Context: PLAYER Domain
**Agent:** RENDERER
**Domain:** `packages/player`
**Responsibility:** The Web Component player.

## Section A: Component Structure
- Custom Element: `<helios-player>`
- Shadow DOM Layout: Wrapper > Iframe (Sandbox) + Controls Overlay

## Section B: Events
- Dispatches custom events mirroring HTMLMediaElement and HTMLVideoElement API: `playing`, `waiting`, `suspend`, `stalled`, `abort`, `emptied`, `progress`, `seeking`, `seeked`, `error`, `audiometering`, `enterpictureinpicture`, `leavepictureinpicture`, `waitingforkey`, `encrypted`
- TextTrack, AudioTrack, VideoTrack events: `addtrack`, `removetrack`, `change`
- Helios-specific events for composition, state, and export

## Section C: Attributes
- Observed attributes: `src`, `width`, `height`, `muted`, `playsinline`, `disableremoteplayback`, `mediagroup`, `autopictureinpicture`, `defaultmuted`, `loop`, `autoplay`, `controls`

## Section D: Methods
- Extends standard media methods: `play()`, `pause()`, `load()`, `setPlaybackRange()`, `clearPlaybackRange()`
- Adds methods: `captureStream()`, `startAudioMetering()`, `stopAudioMetering()`, `getVideoPlaybackQuality()`, `requestVideoFrameCallback()`, `cancelVideoFrameCallback()`, `setDuration()`, `setFps()`, `setSize()`, `setMarkers()`, `getController()`, `getStartDate()`, `setMediaKeys()`

## Section E: Track Events (TrackEvent)
- Track Lists now dispatch `addtrack` and `removetrack` using the standard `TrackEvent` interface (via `HeliosTrackEvent`), ensuring parity with standard web APIs.