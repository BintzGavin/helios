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
}

export class Helios {
  private state: HeliosState;
  private subscribers: Set<Subscriber> = new Set();
  private animationFrameId: number | null = null;
  private syncWithDocumentTimeline = false;

  constructor(options: HeliosOptions) {
    this.state = {
      ...options,
      currentFrame: 0,
      isPlaying: false,
    };
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

    // If we are controlling document.timeline, update it
    if (typeof document !== 'undefined' && document.timeline) {
        const timeInMs = (newFrame / this.state.fps) * 1000;
        // Check if we can set it (some browsers might differ, but standard says read-only unless we use AnimationController which is separate)
        // Actually, document.timeline.currentTime is read-only in standard WAAPI, but Playwright overrides it?
        // Wait, the renderer uses: (document.timeline as any).currentTime = timeValue;
        // This implies the renderer is "hacking" the timeline in the context of the headless browser.
        // In a normal browser, we can't set document.timeline.currentTime directly.

        // For now, Helios core should probably NOT try to set document.timeline.currentTime for normal playback
        // unless we are in a special "render mode" or we are using a custom timeline.

        // Let's stick to the plan: `bindToDocumentTimeline` allows Helios to READ from it.
    }
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
    this.animationFrameId = requestAnimationFrame(this.tick);
  }
}

// Export animation helpers
export * from './animation-helpers';
