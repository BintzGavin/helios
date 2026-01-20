export declare class HeliosPlayer extends HTMLElement {
    private iframe;
    private playPauseBtn;
    private scrubber;
    private timeDisplay;
    private exportBtn;
    private helios;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    private handleIframeLoad;
    private togglePlayPause;
    private handleScrubberInput;
    private updateUI;
    private setupHeliosSubscription;
    private handleExport;
}
