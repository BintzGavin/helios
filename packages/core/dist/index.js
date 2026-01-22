export class Helios {
    state;
    subscribers = new Set();
    animationFrameId = null;
    syncWithDocumentTimeline = false;
    autoSyncAnimations = false;
    animationScope = typeof document !== 'undefined' ? document : {};
    static async diagnose() {
        const report = {
            waapi: typeof document !== 'undefined' && 'timeline' in document,
            webCodecs: typeof VideoEncoder !== 'undefined',
            offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node/Server',
        };
        console.group('Helios Diagnostics');
        console.log('WAAPI Support:', report.waapi ? '✅' : '❌');
        console.log('WebCodecs Support:', report.webCodecs ? '✅' : '❌');
        console.log('OffscreenCanvas Support:', report.offscreenCanvas ? '✅' : '❌');
        console.log('User Agent:', report.userAgent);
        if (!report.webCodecs)
            console.warn('Hardware accelerated rendering requires WebCodecs.');
        console.log('To verify GPU acceleration, please visit: chrome://gpu');
        console.groupEnd();
        return report;
    }
    constructor(options) {
        this.state = {
            duration: options.duration,
            fps: options.fps,
            currentFrame: 0,
            isPlaying: false,
        };
        this.autoSyncAnimations = options.autoSyncAnimations || false;
        if (options.animationScope) {
            this.animationScope = options.animationScope;
        }
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
        if (this.autoSyncAnimations) {
            this.syncDomAnimations((newFrame / this.state.fps) * 1000);
        }
    }
    syncDomAnimations(timeInMs) {
        if (typeof document === 'undefined')
            return;
        // Use the configured scope or fallback to document
        // Note: getAnimations() on element requires { subtree: true } to act like document.getAnimations() for children
        let anims = [];
        // Check if animationScope is Document (safe check for environment where Document might not exist as a global constructor)
        const isDocument = typeof Document !== 'undefined' && this.animationScope instanceof Document;
        if (isDocument) {
            if (typeof this.animationScope.getAnimations === 'function') {
                anims = this.animationScope.getAnimations();
            }
        }
        else {
            // Assume HTMLElement or similar interface
            if (typeof this.animationScope.getAnimations === 'function') {
                anims = this.animationScope.getAnimations({ subtree: true });
            }
        }
        anims.forEach((anim) => {
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
    bindToDocumentTimeline() {
        if (typeof document === 'undefined' || !document.timeline) {
            console.warn('document.timeline is not available.');
            return;
        }
        this.syncWithDocumentTimeline = true;
        // Start a loop to poll the timeline
        const poll = () => {
            if (!this.syncWithDocumentTimeline)
                return;
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
    unbindFromDocumentTimeline() {
        this.syncWithDocumentTimeline = false;
    }
    tick = () => {
        if (!this.state.isPlaying)
            return;
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
    };
}
