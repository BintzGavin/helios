export declare class HeliosPlayer extends HTMLElement {
    private iframe;
    private playPauseBtn;
    private scrubber;
    private timeDisplay;
    private exportBtn;
    private controller;
    private directHelios;
    private unsubscribe;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    private setControlsDisabled;
    private handleIframeLoad;
    private handleWindowMessage;
    private setController;
    private togglePlayPause;
    private handleScrubberInput;
    private updateUI;
    private renderClientSide;
    private renderDOMToVideo;
    private captureDOMToCanvas;
    private renderElementToCanvas;
}
