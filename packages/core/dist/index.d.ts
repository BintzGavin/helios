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
}
export declare class Helios {
    private state;
    private subscribers;
    private animationFrameId;
    constructor(options: HeliosOptions);
    private setState;
    getState(): Readonly<HeliosState>;
    subscribe(callback: Subscriber): () => void;
    unsubscribe(callback: Subscriber): void;
    private notifySubscribers;
    play(): void;
    pause(): void;
    seek(frame: number): void;
    private tick;
}
export * from './animation-helpers';
