import type { HeliosSchema, DiagnosticReport } from "@helios-project/core";
import type { HeliosController } from "./controllers";
import { ClientSideExporter } from "./features/exporter";
import { HeliosTextTrack, HeliosTextTrackList, TrackHost } from "./features/text-tracks";
import { HeliosAudioTrack, HeliosAudioTrackList, AudioTrackHost } from "./features/audio-tracks";
import { HeliosVideoTrack, HeliosVideoTrackList, VideoTrackHost } from "./features/video-tracks";
export { ClientSideExporter };
export type { HeliosController };
export interface HeliosExportOptions {
    format?: 'mp4' | 'webm' | 'png' | 'jpeg';
    filename?: string;
    mode?: 'auto' | 'canvas' | 'dom';
    width?: number;
    height?: number;
    bitrate?: number;
    includeCaptions?: boolean;
    captionStyle?: {
        color?: string;
        backgroundColor?: string;
        fontFamily?: string;
        scale?: number;
    };
    onProgress?: (progress: number) => void;
    signal?: AbortSignal;
    canvasSelector?: string;
}
interface MediaError {
    readonly code: number;
    readonly message: string;
    readonly MEDIA_ERR_ABORTED: number;
    readonly MEDIA_ERR_NETWORK: number;
    readonly MEDIA_ERR_DECODE: number;
    readonly MEDIA_ERR_SRC_NOT_SUPPORTED: number;
}
export declare class HeliosPlayer extends HTMLElement implements TrackHost, AudioTrackHost, VideoTrackHost {
    private iframe;
    private pipVideo;
    private _textTracks;
    private _audioTracks;
    private _videoTracks;
    private _domTracks;
    private playPauseBtn;
    private volumeBtn;
    private volumeSlider;
    private audioBtn;
    private audioMenu;
    private settingsBtn;
    private settingsMenu;
    private exportMenu;
    private scrubber;
    private scrubberWrapper;
    private scrubberTooltip;
    private markersContainer;
    private timeDisplay;
    private exportBtn;
    private overlay;
    private statusText;
    private retryBtn;
    private retryAction;
    private fullscreenBtn;
    private pipBtn;
    private captionsContainer;
    private ccBtn;
    private showCaptions;
    private lastCaptionsHash;
    private debugOverlay;
    private debugContent;
    private closeDebugBtn;
    private copyDebugBtn;
    private shortcutsOverlay;
    private shortcutsGrid;
    private closeShortcutsBtn;
    private clickLayer;
    private posterContainer;
    private posterImage;
    private bigPlayBtn;
    private pendingSrc;
    private isLoaded;
    private _hasPlayed;
    private resizeObserver;
    private controller;
    private mediaSession;
    private directHelios;
    private unsubscribe;
    private connectionInterval;
    private abortController;
    private isExporting;
    private isScrubbing;
    private _isSeeking;
    private wasPlayingBeforeScrub;
    private lastState;
    private pendingProps;
    private _error;
    private _pendingVolume;
    private _pendingPlaybackRate;
    private _pendingMuted;
    static readonly HAVE_NOTHING = 0;
    static readonly HAVE_METADATA = 1;
    static readonly HAVE_CURRENT_DATA = 2;
    static readonly HAVE_FUTURE_DATA = 3;
    static readonly HAVE_ENOUGH_DATA = 4;
    static readonly NETWORK_EMPTY = 0;
    static readonly NETWORK_IDLE = 1;
    static readonly NETWORK_LOADING = 2;
    static readonly NETWORK_NO_SOURCE = 3;
    private _readyState;
    private _networkState;
    get readyState(): number;
    get networkState(): number;
    get error(): MediaError | null;
    get currentSrc(): string;
    private _onplay;
    get onplay(): ((event: Event) => void) | null;
    set onplay(handler: ((event: Event) => void) | null);
    private _onpause;
    get onpause(): ((event: Event) => void) | null;
    set onpause(handler: ((event: Event) => void) | null);
    private _onended;
    get onended(): ((event: Event) => void) | null;
    set onended(handler: ((event: Event) => void) | null);
    private _ontimeupdate;
    get ontimeupdate(): ((event: Event) => void) | null;
    set ontimeupdate(handler: ((event: Event) => void) | null);
    private _onvolumechange;
    get onvolumechange(): ((event: Event) => void) | null;
    set onvolumechange(handler: ((event: Event) => void) | null);
    private _onratechange;
    get onratechange(): ((event: Event) => void) | null;
    set onratechange(handler: ((event: Event) => void) | null);
    private _ondurationchange;
    get ondurationchange(): ((event: Event) => void) | null;
    set ondurationchange(handler: ((event: Event) => void) | null);
    private _onseeking;
    get onseeking(): ((event: Event) => void) | null;
    set onseeking(handler: ((event: Event) => void) | null);
    private _onseeked;
    get onseeked(): ((event: Event) => void) | null;
    set onseeked(handler: ((event: Event) => void) | null);
    private _onresize;
    get onresize(): ((event: Event) => void) | null;
    set onresize(handler: ((event: Event) => void) | null);
    private _onloadstart;
    get onloadstart(): ((event: Event) => void) | null;
    set onloadstart(handler: ((event: Event) => void) | null);
    private _onloadedmetadata;
    get onloadedmetadata(): ((event: Event) => void) | null;
    set onloadedmetadata(handler: ((event: Event) => void) | null);
    private _onloadeddata;
    get onloadeddata(): ((event: Event) => void) | null;
    set onloadeddata(handler: ((event: Event) => void) | null);
    private _oncanplay;
    get oncanplay(): ((event: Event) => void) | null;
    set oncanplay(handler: ((event: Event) => void) | null);
    private _oncanplaythrough;
    get oncanplaythrough(): ((event: Event) => void) | null;
    set oncanplaythrough(handler: ((event: Event) => void) | null);
    private _onerror;
    get onerror(): OnErrorEventHandler;
    set onerror(handler: OnErrorEventHandler);
    private _onenterpictureinpicture;
    get onenterpictureinpicture(): ((event: Event) => void) | null;
    set onenterpictureinpicture(handler: ((event: Event) => void) | null);
    private _onleavepictureinpicture;
    get onleavepictureinpicture(): ((event: Event) => void) | null;
    set onleavepictureinpicture(handler: ((event: Event) => void) | null);
    canPlayType(type: string): CanPlayTypeResult;
    get defaultMuted(): boolean;
    set defaultMuted(val: boolean);
    private _defaultPlaybackRate;
    get defaultPlaybackRate(): number;
    set defaultPlaybackRate(val: number);
    private _preservesPitch;
    get preservesPitch(): boolean;
    set preservesPitch(val: boolean);
    get srcObject(): MediaProvider | null;
    set srcObject(val: MediaProvider | null);
    get crossOrigin(): string | null;
    set crossOrigin(val: string | null);
    get seeking(): boolean;
    get buffered(): TimeRanges;
    get seekable(): TimeRanges;
    get played(): TimeRanges;
    /**
     * Gets the width attribute of the player.
     * Part of the Standard Media API parity.
     * @returns {number} The width.
     */
    get width(): number;
    /**
     * Sets the width attribute of the player.
     * Part of the Standard Media API parity.
     * @param {number} val The new width.
     */
    set width(val: number);
    /**
     * Gets the height attribute of the player.
     * Part of the Standard Media API parity.
     * @returns {number} The height.
     */
    get height(): number;
    /**
     * Sets the height attribute of the player.
     * Part of the Standard Media API parity.
     * @param {number} val The new height.
     */
    set height(val: number);
    get videoWidth(): number;
    get videoHeight(): number;
    /**
     * Gets whether the playsinline attribute is present.
     * Part of the Standard Media API parity.
     * @returns {boolean} True if playsinline is present.
     */
    get playsInline(): boolean;
    /**
     * Sets the playsinline attribute.
     * Part of the Standard Media API parity.
     * @param {boolean} val Whether playsinline should be present.
     */
    set playsInline(val: boolean);
    /**
     * Seeks to the specified time.
     * Part of the Standard Media API parity.
     * Note: In HeliosPlayer, this currently delegates to standard seek (currentTime setter).
     * @param time The time to seek to.
     */
    fastSeek(time: number): void;
    get currentTime(): number;
    set currentTime(val: number);
    get currentFrame(): number;
    set currentFrame(val: number);
    get duration(): number;
    get paused(): boolean;
    get ended(): boolean;
    get volume(): number;
    set volume(val: number);
    get muted(): boolean;
    set muted(val: boolean);
    get interactive(): boolean;
    set interactive(val: boolean);
    get playbackRate(): number;
    set playbackRate(val: number);
    get fps(): number;
    get src(): string;
    set src(val: string);
    get autoplay(): boolean;
    set autoplay(val: boolean);
    get loop(): boolean;
    set loop(val: boolean);
    get controls(): boolean;
    set controls(val: boolean);
    get poster(): string;
    set poster(val: string);
    get preload(): string;
    set preload(val: string);
    get sandbox(): string;
    set sandbox(val: string);
    get disablePictureInPicture(): boolean;
    set disablePictureInPicture(val: boolean);
    requestPictureInPicture(): Promise<PictureInPictureWindow>;
    private togglePip;
    private onEnterPip;
    private onLeavePip;
    play(): Promise<void>;
    load(): void;
    pause(): void;
    static get observedAttributes(): string[];
    constructor();
    get textTracks(): HeliosTextTrackList;
    get audioTracks(): HeliosAudioTrackList;
    get videoTracks(): HeliosVideoTrackList;
    addTextTrack(kind: string, label?: string, language?: string): HeliosTextTrack;
    handleAudioTrackEnabledChange(track: HeliosAudioTrack): void;
    handleVideoTrackSelectedChange(track: HeliosVideoTrack): void;
    handleTrackModeChange(track: HeliosTextTrack): void;
    attributeChangedCallback(name: string, oldVal: string, newVal: string): void;
    private updateControlsVisibility;
    private updateCCButtonVisibility;
    private updateAudioBtnVisibility;
    private toggleAudioMenu;
    private closeAudioMenu;
    private toggleSettingsMenu;
    private closeSettingsMenu;
    private closeMenusIfOutside;
    private closeAudioMenuIfOutside;
    private toggleExportMenu;
    private closeExportMenu;
    private renderExportMenu;
    private startExportFromMenu;
    private renderSettingsMenu;
    private createDivider;
    private renderAudioMenu;
    get inputProps(): Record<string, any> | null;
    set inputProps(val: Record<string, any> | null);
    connectedCallback(): void;
    disconnectedCallback(): void;
    private loadIframe;
    private handleBigPlayClick;
    private updatePosterVisibility;
    private setControlsDisabled;
    private lockPlaybackControls;
    private handleIframeLoad;
    private startConnectionAttempts;
    private stopConnectionAttempts;
    private handleWindowMessage;
    private handleSlotChange;
    private setController;
    private updateAspectRatio;
    private togglePlayPause;
    private toggleMute;
    private handleVolumeInput;
    private handleScrubberInput;
    private handleScrubStart;
    private handleScrubEnd;
    private handleScrubberHover;
    private handleScrubberLeave;
    private handleSpeedChange;
    private toggleCaptions;
    private toggleDiagnostics;
    private toggleShortcutsOverlay;
    private renderShortcuts;
    private handleCopyDebug;
    private handleKeydown;
    private seekRelative;
    private seekRelativeSeconds;
    private toggleFullscreen;
    private updateFullscreenUI;
    private updateUI;
    private showStatus;
    private hideStatus;
    getController(): HeliosController | null;
    getSchema(): Promise<HeliosSchema | undefined>;
    export(options?: HeliosExportOptions): Promise<void>;
    diagnose(): Promise<DiagnosticReport>;
    startAudioMetering(): void;
    stopAudioMetering(): void;
    private retryConnection;
    private handleExportClick;
}
