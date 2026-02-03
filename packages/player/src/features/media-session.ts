import type { HeliosController } from "../controllers";

export class HeliosMediaSession {
  private unsubscribe: (() => void) | null = null;

  constructor(private player: HTMLElement, private controller: HeliosController) {
    if (!('mediaSession' in navigator)) return;

    this.updateMetadata();
    this.setupHandlers();

    // Subscribe to state changes
    this.unsubscribe = controller.subscribe(state => this.updateState(state));
    // Initial state update
    this.updateState(controller.getState());
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

    // @ts-ignore - MediaMetadata might not be in all TS envs yet
    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist,
      album,
      artwork
    });
  }

  setupHandlers() {
    if (!('mediaSession' in navigator)) return;

    const actions: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => this.controller.play()],
      ['pause', () => this.controller.pause()],
      ['seekbackward', (details) => this.seekRelative(-(details.seekOffset || 10))],
      ['seekforward', (details) => this.seekRelative(details.seekOffset || 10)],
      ['seekto', (details) => {
          if (details.seekTime !== undefined) {
               const state = this.controller.getState();
               if (state.fps) {
                   this.controller.seek(Math.floor(details.seekTime * state.fps));
               }
          }
      }],
      ['stop', () => {
           this.controller.pause();
           this.controller.seek(0);
      }]
    ];

    for (const [action, handler] of actions) {
      try {
          navigator.mediaSession.setActionHandler(action, handler);
      } catch (e) {
          // Ignore unsupported actions
      }
    }
  }

  seekRelative(seconds: number) {
      const state = this.controller.getState();
      if (state.fps && state.duration) {
          const currentSeconds = state.currentFrame / state.fps;
          const newSeconds = Math.max(0, Math.min(state.duration, currentSeconds + seconds));
          this.controller.seek(Math.floor(newSeconds * state.fps));
      }
  }

  updateState(state: any) {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.playbackState = state.isPlaying ? 'playing' : 'paused';

    if (state.duration > 0 && state.fps > 0) {
      try {
          navigator.mediaSession.setPositionState({
            duration: state.duration,
            playbackRate: state.playbackRate || 1,
            position: Math.min(state.duration, Math.max(0, state.currentFrame / state.fps))
          });
      } catch (e) {
          // Log warning (e.g. invalid position)
      }
    }
  }

  destroy() {
     if ('mediaSession' in navigator) {
         const actions: MediaSessionAction[] = ['play', 'pause', 'seekbackward', 'seekforward', 'seekto', 'stop'];
         actions.forEach(action => {
             try {
                 navigator.mediaSession.setActionHandler(action, null);
             } catch (e) { }
         });
         navigator.mediaSession.playbackState = 'none';
     }
     if (this.unsubscribe) {
         this.unsubscribe();
         this.unsubscribe = null;
     }
  }
}
