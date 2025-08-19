export class Helios {
    state;
    subscribers = new Set();
    animationFrameId = null;
    constructor(options) {
        this.state = {
            ...options,
            currentFrame: 0,
            isPlaying: false,
        };
    }
    // --- State Management ---
    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.notifySubscribers();
    }
    getState() {
        return this.state;
    }
    // --- Subscription ---
    subscribe(callback) {
        this.subscribers.add(callback);
        callback(this.state); // Immediately notify with current state
        return () => this.unsubscribe(callback);
    }
    unsubscribe(callback) {
        this.subscribers.delete(callback);
    }
    notifySubscribers() {
        for (const subscriber of this.subscribers) {
            subscriber(this.state);
        }
    }
    // --- Playback Controls ---
    play() {
        if (this.state.isPlaying)
            return;
        this.setState({ isPlaying: true });
        this.animationFrameId = requestAnimationFrame(this.tick);
    }
    pause() {
        if (!this.state.isPlaying)
            return;
        this.setState({ isPlaying: false });
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }
    seek(frame) {
        const newFrame = Math.max(0, Math.min(frame, this.state.duration * this.state.fps));
        this.setState({ currentFrame: newFrame });
    }
    tick = () => {
        if (!this.state.isPlaying)
            return;
        const totalFrames = this.state.duration * this.state.fps;
        const nextFrame = this.state.currentFrame + 1;
        if (nextFrame >= totalFrames) {
            this.setState({ currentFrame: totalFrames - 1 });
            this.pause();
            return;
        }
        this.setState({ currentFrame: nextFrame });
        this.animationFrameId = requestAnimationFrame(this.tick);
    };
}
// Export animation helpers
export * from './animation-helpers';
