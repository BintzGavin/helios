# 2026-08-15-PLAYER-Media-Session.md

#### 1. Context & Goal
- **Objective**: Implement `navigator.mediaSession` integration in `<helios-player>` to support native hardware media keys, mobile lock screen controls, and "Now Playing" metadata.
- **Trigger**: Vision gap ("Native Always Wins", "Standard Media API"). Users expect native media controls to work with the player, but currently, they do not because the player uses an iframe/canvas architecture instead of a standard `<video>` tag for playback logic.
- **Impact**: Unlocks native media control integration (Play, Pause, Seek, Previous/Next Track) and metadata display on OS level (macOS Touch Bar, Windows Media Overlay, Mobile Lock Screen). Enhances accessibility and UX.

#### 2. File Inventory
- **Create**: `packages/player/src/features/media-session.ts` (Encapsulates Media Session logic)
- **Modify**: `packages/player/src/index.ts` (Integrate MediaSession feature, add attributes)
- **Read-Only**: `packages/player/src/controllers.ts` (Use controller interface)

#### 3. Implementation Spec
- **Architecture**:
  - Create a `HeliosMediaSession` class that manages the `navigator.mediaSession` state.
  - It subscribes to the `HeliosController` state to update `playbackState` and `positionState`.
  - It listens for `setActionHandler` events (`play`, `pause`, `seekto`, `seekbackward`, `seekforward`) and proxies them to the controller.
  - It observes new attributes on `<helios-player>` (`media-title`, `media-artist`, `media-album`, `media-artwork`) to update `metadata`.
  - It feature-detects `navigator.mediaSession` to ensure compatibility.

- **Public API Changes**:
  - New attributes on `<helios-player>`:
    - `media-title`: String (Title of the composition)
    - `media-artist`: String (Artist name)
    - `media-album`: String (Album name)
    - `media-artwork`: URL (defaults to `poster` if not set)
  - No new methods exposed on `HeliosPlayer` instance (internal feature).

- **Pseudo-Code**:
  ```typescript
  // packages/player/src/features/media-session.ts

  export class HeliosMediaSession {
    constructor(private player: HeliosPlayer, private controller: HeliosController) {
      if (!('mediaSession' in navigator)) return;

      this.updateMetadata();
      this.setupHandlers();

      // Subscribe to state changes
      this.unsubscribe = controller.subscribe(state => this.updateState(state));

      // Observe attribute changes (handled by player calling updateMetadata)
    }

    updateMetadata() {
      if (!('mediaSession' in navigator)) return;

      const title = this.player.getAttribute('media-title') || '';
      const artist = this.player.getAttribute('media-artist') || '';
      const album = this.player.getAttribute('media-album') || '';
      let artworkSrc = this.player.getAttribute('media-artwork');

      // Fallback to poster if artwork not set
      if (!artworkSrc) {
        artworkSrc = this.player.getAttribute('poster');
      }

      const artwork = artworkSrc ? [{ src: artworkSrc }] : [];

      navigator.mediaSession.metadata = new MediaMetadata({
        title,
        artist,
        album,
        artwork
      });
    }

    setupHandlers() {
      if (!('mediaSession' in navigator)) return;

      const actions = [
        ['play', () => this.controller.play()],
        ['pause', () => this.controller.pause()],
        ['seekbackward', (details) => this.seekRelative(-(details.seekOffset || 10))],
        ['seekforward', (details) => this.seekRelative(details.seekOffset || 10)],
        ['seekto', (details) => {
            if (details.seekTime !== undefined) {
                 // Calculate frame from seekTime and call controller.seek
                 // controller.seek(Math.floor(details.seekTime * fps));
            }
        }],
        ['stop', () => {
             this.controller.pause();
             this.controller.seek(0);
        }]
      ];

      for (const [action, handler] of actions) {
        try {
            navigator.mediaSession.setActionHandler(action as MediaSessionAction, handler);
        } catch (e) {
            // Ignore unsupported actions
        }
      }
    }

    seekRelative(seconds) {
        // Calculate frames from seconds and call controller.seek
    }

    updateState(state) {
      if (!('mediaSession' in navigator)) return;

      navigator.mediaSession.playbackState = state.isPlaying ? 'playing' : 'paused';

      if (state.duration > 0 && state.fps > 0) {
        try {
            navigator.mediaSession.setPositionState({
              duration: state.duration,
              playbackRate: state.playbackRate || 1,
              position: state.currentFrame / state.fps
            });
        } catch (e) {
            // Log warning (e.g. invalid position)
        }
      }
    }

    destroy() {
       // Clean up handlers? MediaSession API doesn't support "removeActionHandler" explicitly
       // other than setting it to null.
       if ('mediaSession' in navigator) {
           navigator.mediaSession.setActionHandler('play', null);
           // ... clear others
           navigator.mediaSession.playbackState = 'none';
       }
       if (this.unsubscribe) this.unsubscribe();
    }
  }
  ```

- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run build -w packages/player`
- **Unit Tests**:
  - Mock `navigator.mediaSession` in JSDom setup or inside the test file.
  - Verify `navigator.mediaSession.metadata` is set correctly when attributes change.
  - Verify `navigator.mediaSession.setActionHandler` is called for supported actions.
  - Verify `playbackState` updates when controller state changes.
  - **Success Criteria**: Tests pass and build succeeds.
- **Edge Cases**:
  - `navigator.mediaSession` is undefined (e.g. some older browsers or environments).
  - Rapid attribute changes.
  - Duration is 0 or NaN (handle `setPositionState` errors).
