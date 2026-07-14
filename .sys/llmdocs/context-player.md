
# Component Structure
```html
<helios-player>
  #shadow-root (open)
    <div class="player-wrapper">
      <iframe class="sandbox-iframe" sandbox="allow-scripts allow-same-origin"></iframe>
      <div class="status-overlay"></div>
      <div class="controls-overlay">
        <!-- Play/Pause, Volume, Fullscreen, PIP, Scrubber -->
      </div>
    </div>
</helios-player>
```

# Events
- `timeupdate`: Fired when current time changes.
- `play`: Fired when playback starts.
- `pause`: Fired when playback is paused.
- `ended`: Fired when playback reaches the end.
- `durationchange`: Fired when duration is updated.
- `volumechange`: Fired when volume or muted state changes.
- `loadedmetadata`: Fired when composition metadata is loaded.
- `canplay`: Fired when the player has enough data to begin playback.
- `error`: Fired when an error occurs.
- `enterpictureinpicture`: Fired when PIP mode starts.
- `leavepictureinpicture`: Fired when PIP mode ends.
- `audiometering`: Fired when audio levels are metered.
- `seeking`: Fired when seeking starts.
- `seeked`: Fired when seeking completes.
- `playing`: Fired when playback is ready to start after having been paused or delayed due to lack of data.
- `waiting`: Fired when playback has stopped because of a temporary lack of data.
- `suspend`: Fired when media data loading has been suspended.
- `stalled`: Fired when the user agent is trying to fetch media data, but data is unexpectedly not forthcoming.
- `abort`: Fired when media data loading has been aborted.
- `emptied`: Fired when the media has become empty.
- `progress`: Fired periodically as the user agent is downloading media data.

# Attributes
- `src`: URL of the composition bundle.
- `autoplay`: Starts playback automatically when loaded.
- `loop`: Loops playback automatically.
- `controls`: Displays native player controls.
- `poster`: URL of an image to show before playback starts.
- `interactive`: Enables mouse/touch interaction with the composition.
- `muted`: Mutes audio playback.
- `playsinline`: Indicates that the video is to be played "inline".
- `disableremoteplayback`: Disables remote playback.
- `mediagroup`: Links multiple media elements together.

# Public Methods (HTMLMediaElement Parity)
- `play(): Promise<void>`
- `pause(): void`
- `load(): void`
- `fastSeek(time: number): void`
- `canPlayType(type: string): string`
- `captureStream(): MediaStream`
- `setSinkId(sinkId: string): Promise<void>`
- `getStartDate(): Date`
- `getVideoPlaybackQuality(): VideoPlaybackQuality`
- `requestVideoFrameCallback(callback: VideoFrameRequestCallback): number`
- `cancelVideoFrameCallback(handle: number): void`

# Public Properties (HTMLMediaElement Parity)
- `currentTime: number`
- `duration: number`
- `paused: boolean`
- `ended: boolean`
- `volume: number`
- `muted: boolean`
- `playbackRate: number`
- `defaultPlaybackRate: number`
- `src: string`
- `currentSrc: string`
- `readyState: number`
- `networkState: number`
- `error: MediaError | null`
- `crossOrigin: string | null`
- `preload: string`
- `autoplay: boolean`
- `loop: boolean`
- `controls: boolean`
- `defaultMuted: boolean`
- `seeking: boolean`
- `buffered: TimeRanges`
- `seekable: TimeRanges`
- `played: TimeRanges`
- `audioTracks: HeliosAudioTrackList`
- `videoTracks: HeliosVideoTrackList`
- `textTracks: HeliosTextTrackList`
- `disableRemotePlayback: boolean`
- `mediaGroup: string`
- `sinkId: string`
- `autoPictureInPicture: boolean`
- `remote: any`

# Custom Public Properties / Methods
- `interactive: boolean`
- `isScrubbing: boolean`
- `getSchema(): HeliosSchema | null`
- `startAudioMetering(): void`
- `stopAudioMetering(): void`
- `mediaTitle: string`
- `mediaArtist: string`
- `mediaAlbum: string`
- `mediaArtwork: string`
- `setDuration(durationInFrames: number): void`
- `setFps(fps: number): void`
- `setSize(width: number, height: number): void`
- `setMarkers(markers: Marker[]): void`
- `getController(): HeliosController | null`
