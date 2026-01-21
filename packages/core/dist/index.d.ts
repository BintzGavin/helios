type HeliosState = {
    duration: number;
    fps: number;
    currentFrame: number;
    isPlaying: boolean;
};
type Subscriber = (state: HeliosState) => void;
interface HeliosOptions {
    duration: number;
    fps: number;
    autoSyncAnimations?: boolean;
    animationScope?: HTMLElement;
}
export declare class Helios {
    private state;
    private subscribers;
    private animationFrameId;
    private syncWithDocumentTimeline;
    private autoSyncAnimations;
    private animationScope;
    constructor(options: HeliosOptions);
    private setState;
    getState(): Readonly<HeliosState>;
    subscribe(callback: Subscriber): () => void;
    unsubscribe(callback: Subscriber): void;
    private notifySubscribers;
    play(): void;
    pause(): void;
    seek(frame: number): void;
    private syncDomAnimations;
    /**
     * Binds the Helios instance to document.timeline.
     * This is useful when the timeline is being driven externally (e.g. by the Renderer).
     * Helios will poll document.timeline.currentTime and update its internal state.
     */
    bindToDocumentTimeline(): void;
    unbindFromDocumentTimeline(): void;
    private tick;
}
export * from './animation-helpers';
