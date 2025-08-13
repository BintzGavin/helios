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
  }

  private tick = () => {
    if (!this.state.isPlaying) return;

    const totalFrames = this.state.duration * this.state.fps;
    const nextFrame = this.state.currentFrame + 1;

    if (nextFrame >= totalFrames) {
      this.setState({ currentFrame: totalFrames });
      this.pause();
      return;
    }

    this.setState({ currentFrame: nextFrame });
    this.animationFrameId = requestAnimationFrame(this.tick);
  }
}
