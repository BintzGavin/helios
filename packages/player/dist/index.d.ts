export declare class HeliosPlayer extends HTMLElement {
    private iframe;
    private playPauseBtn;
    private scrubber;
    private timeDisplay;
    private exportBtn;
    private helios;
    private isRemoteHelios;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    private handleIframeLoad;
    private togglePlayPause;
    private handleScrubberInput;
    private setupHeliosSubscription;
    private renderClientSide;
    private renderDOMToVideo;
    private captureDOMToCanvas;
    private renderElementToCanvas;
}
