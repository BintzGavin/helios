type HeliosState = {
  duration: number;
  fps: number;
  currentFrame: number;
  isPlaying: boolean;
};

type Subscriber = (state: HeliosState) => void;

interface HeliosOptions {
  duration: number; // in seconds
  fps: number;
  autoSyncAnimations?: boolean;
}

export class Helios {
  private state: HeliosState;
  private subscribers: Set<Subscriber> = new Set();
  private animationFrameId: number | null = null;
  private syncWithDocumentTimeline = false;
  private autoSyncAnimations = false;

  constructor(options: HeliosOptions) {
    this.state = {
      duration: options.duration,
      fps: options.fps,
      currentFrame: 0,
      isPlaying: false,
    };
    this.autoSyncAnimations = options.autoSyncAnimations || false;
  }

  // --- State Management ---
  private setState(newState: Partial<HeliosState>) {
    this.state = { ...this.state, ...newState };
    this.notifySubscribers();
  }

  public getState(): Readonly<HeliosState> {
    return this.state;
  }

  // --- Subscription ---
  public subscribe(callback: Subscriber): () => void {
    this.subscribers.add(callback);
    callback(this.state); // Immediately notify with current state
    return () => this.unsubscribe(callback);
  }

  public unsubscribe(callback: Subscriber) {
    this.subscribers.delete(callback);
  }

  private notifySubscribers() {
    for (const subscriber of this.subscribers) {
      subscriber(this.state);
    }
  }

  // --- Playback Controls ---
  public play() {
    if (this.state.isPlaying) return;
    this.setState({ isPlaying: true });
    this.animationFrameId = requestAnimationFrame(this.tick);
  }

  public pause() {
    if (!this.state.isPlaying) return;
    this.setState({ isPlaying: false });
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public seek(frame: number) {
    const newFrame = Math.max(0, Math.min(frame, this.state.duration * this.state.fps));
    this.setState({ currentFrame: newFrame });

    if (this.autoSyncAnimations) {
      this.syncDomAnimations((newFrame / this.state.fps) * 1000);
    }
  }

  private syncDomAnimations(timeInMs: number) {
    if (typeof document === 'undefined' || !document.getAnimations) return;

    document.getAnimations().forEach((anim) => {
      anim.currentTime = timeInMs;
      // Ensure it doesn't auto-play if we are driving it
      if (anim.playState !== 'paused') {
        anim.pause();
      }
    });
  }

  /**
   * Binds the Helios instance to document.timeline.
   * This is useful when the timeline is being driven externally (e.g. by the Renderer).
   * Helios will poll document.timeline.currentTime and update its internal state.
   */
  public bindToDocumentTimeline() {
    if (typeof document === 'undefined' || !document.timeline) {
        console.warn('document.timeline is not available.');
        return;
    }

    this.syncWithDocumentTimeline = true;

    // Start a loop to poll the timeline
    const poll = () => {
        if (!this.syncWithDocumentTimeline) return;

        const currentTime = document.timeline.currentTime;
        if (currentTime !== null && typeof currentTime === 'number') {
            const frame = Math.round((currentTime / 1000) * this.state.fps);
            if (frame !== this.state.currentFrame) {
                 this.setState({ currentFrame: frame });
            }
        }
        requestAnimationFrame(poll);
    };

    requestAnimationFrame(poll);
  }

  public unbindFromDocumentTimeline() {
      this.syncWithDocumentTimeline = false;
  }

  private tick = () => {
    if (!this.state.isPlaying) return;

    // If we are syncing FROM document.timeline, we shouldn't drive our own loop logic
    // But play() implies we ARE driving.
    if (this.syncWithDocumentTimeline) {
        // If we are synced, we just let the poll loop handle updates.
        // But we still need to keep the loop alive if we want to support 'isPlaying' semantics
        // alongside external drivers?
        // Actually, if we are synced, 'play' might be meaningless if the external timeline isn't moving.
        this.animationFrameId = requestAnimationFrame(this.tick);
        return;
    }

    const totalFrames = this.state.duration * this.state.fps;
    const nextFrame = this.state.currentFrame + 1;

    if (nextFrame >= totalFrames) {
      this.setState({ currentFrame: totalFrames - 1 });
      this.pause();
      return;
    }

    this.setState({ currentFrame: nextFrame });

    if (this.autoSyncAnimations) {
      this.syncDomAnimations((nextFrame / this.state.fps) * 1000);
    }

    this.animationFrameId = requestAnimationFrame(this.tick);
  }
}

// Export animation helpers
export * from './animation-helpers';
