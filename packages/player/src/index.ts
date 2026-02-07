import type { Helios, HeliosSchema, DiagnosticReport } from "@helios-project/core";
import { DirectController, BridgeController } from "./controllers";
import type { HeliosController } from "./controllers";
import { AudioLevels } from "./features/audio-metering";
import { ClientSideExporter } from "./features/exporter";
import { HeliosTextTrack, HeliosTextTrackList, CueClass, TrackHost } from "./features/text-tracks";
import { HeliosAudioTrack, HeliosAudioTrackList, AudioTrackHost } from "./features/audio-tracks";
import { HeliosVideoTrack, HeliosVideoTrackList, VideoTrackHost } from "./features/video-tracks";
import { parseCaptions } from "./features/caption-parser";
import { HeliosMediaSession } from "./features/media-session";

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

// Helper to match MediaError interface if not globally available in all envs
interface MediaError {
  readonly code: number;
  readonly message: string;
  readonly MEDIA_ERR_ABORTED: number;
  readonly MEDIA_ERR_NETWORK: number;
  readonly MEDIA_ERR_DECODE: number;
  readonly MEDIA_ERR_SRC_NOT_SUPPORTED: number;
}

class StaticTimeRange implements TimeRanges {
  constructor(private startVal: number, private endVal: number) {}

  get length() {
    return this.endVal > 0 ? 1 : 0;
  }

  start(index: number) {
    if (index !== 0 || this.length === 0) throw new Error("IndexSizeError");
    return this.startVal;
  }

  end(index: number) {
    if (index !== 0 || this.length === 0) throw new Error("IndexSizeError");
    return this.endVal;
  }
}

const ICONS = {
  play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>',
  replay: '<svg viewBox="0 0 24 24"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>',
  volumeHigh: '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>',
  volumeLow: '<svg viewBox="0 0 24 24"><path d="M7 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>',
  volumeMuted: '<svg viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>',
  settings: '<svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.58 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>',
  fullscreen: '<svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>',
  exitFullscreen: '<svg viewBox="0 0 24 24"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>',
  pip: '<svg viewBox="0 0 24 24"><path d="M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h20c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"/><path d="M0 0h24v24H0z" fill="none"/></svg>',
  cc: '<svg viewBox="0 0 24 24"><path d="M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 7h-3v1.5h-1.5v-3H8V11h3V9.5zM12.5 9.5h1.5v3h-1.5v-3zm5.5 1.5h-3v1.5h-1.5v-3H15V11h3V9.5z"/></svg>',
  audioTracks: '<svg viewBox="0 0 24 24"><path d="M12 3v9.28c-.47-.17-.97-.28-1.5-.28C8.01 12 6 14.01 6 16.5S8.01 21 10.5 21c2.31 0 4.2-1.75 4.45-4H15V6h4V3h-7z"/></svg>',
  export: '<svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>'
};

const template = document.createElement("template");
template.innerHTML = `
  <style>
    :host {
      display: block;
      width: 100%;
      aspect-ratio: 16 / 9;
      background-color: #f0f0f0;
      position: relative;
      font-family: var(--helios-font-family, sans-serif);

      /* CSS Variables for Theming */
      --helios-controls-bg: rgba(0, 0, 0, 0.6);
      --helios-text-color: white;
      --helios-accent-color: #007bff;
      --helios-range-track-color: #555;
      --helios-range-selected-color: rgba(255, 255, 255, 0.2);
      --helios-range-unselected-color: var(--helios-range-track-color);
      --helios-font-family: sans-serif;

      /* Caption Styling */
      --helios-caption-scale: 0.05;
      --helios-caption-bg: rgba(0, 0, 0, 0.7);
      --helios-caption-color: white;
      --helios-caption-font-family: sans-serif;
    }
    button svg {
      fill: currentColor;
      width: 24px;
      height: 24px;
      vertical-align: middle;
    }
    iframe {
      width: 100%;
      height: 100%;
      border: none;
    }
    .controls {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: var(--helios-controls-bg);
      display: flex;
      align-items: center;
      padding: 8px;
      color: var(--helios-text-color);
      transition: opacity 0.3s;
      z-index: 2;
    }
    :host(:not([controls])) .controls {
      display: none;
      pointer-events: none;
    }
    .play-pause-btn {
      background: none;
      border: none;
      color: var(--helios-text-color);
      font-size: 24px;
      cursor: pointer;
      width: 40px;
      height: 40px;
    }
    .volume-control {
      display: flex;
      align-items: center;
      margin-right: 8px;
    }
    .volume-btn {
      background: none;
      border: none;
      color: var(--helios-text-color);
      font-size: 20px;
      cursor: pointer;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .volume-slider {
      width: 60px;
      margin-left: 4px;
      height: 4px;
      -webkit-appearance: none;
      background: var(--helios-range-track-color);
      outline: none;
      border-radius: 2px;
    }
    .volume-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 12px;
      height: 12px;
      background: var(--helios-text-color);
      cursor: pointer;
      border-radius: 50%;
    }
    .export-btn {
      background-color: var(--helios-accent-color);
      border: none;
      color: var(--helios-text-color);
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      padding: 6px 12px;
      margin: 0 10px;
      border-radius: 4px;
    }
    .export-btn:hover {
      filter: brightness(0.9);
    }
    .export-btn:disabled {
      background-color: #666;
      cursor: not-allowed;
    }
    .scrubber-wrapper {
      flex-grow: 1;
      margin: 0 16px;
      position: relative;
      height: 8px;
      display: flex;
      align-items: center;
    }
    .scrubber {
      width: 100%;
      height: 100%;
      margin: 0;
      position: relative;
      z-index: 1;
      -webkit-appearance: none;
      background: var(--helios-range-track-color);
      outline: none;
      opacity: 0.9;
      transition: opacity .2s;
    }
    .scrubber::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 16px;
      height: 16px;
      background: var(--helios-accent-color);
      cursor: pointer;
      border-radius: 50%;
    }
    .scrubber-tooltip {
      position: absolute;
      bottom: 100%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      pointer-events: none;
      white-space: nowrap;
      z-index: 10;
      margin-bottom: 8px;
    }
    .scrubber-tooltip.hidden {
      display: none;
    }
    .markers-container {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 2;
    }
    .marker {
      position: absolute;
      width: 4px;
      height: 12px;
      background-color: var(--helios-accent-color);
      transform: translateX(-50%);
      cursor: pointer;
      pointer-events: auto;
      border-radius: 2px;
      top: -2px;
      transition: transform 0.1s;
    }
    .marker:hover {
      transform: translateX(-50%) scale(1.2);
      z-index: 10;
    }
    .time-display {
      min-width: 90px;
      text-align: center;
    }
    .status-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(4px);
      color: white;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 10;
      transition: opacity 0.3s;
    }
    .status-overlay.hidden {
      opacity: 0;
      pointer-events: none;
    }
    .error-msg {
      color: #ff6b6b;
      margin-bottom: 10px;
      font-size: 16px;
      font-weight: bold;
    }
    .retry-btn {
      background-color: #ff6b6b;
      border: none;
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      margin-top: 10px;
    }
    .retry-btn:hover {
      background-color: #ff5252;
    }
    .fullscreen-btn {
      background: none;
      border: none;
      color: var(--helios-text-color);
      font-size: 20px;
      cursor: pointer;
      width: 40px;
      height: 40px;
      margin-left: 8px;
    }
    .fullscreen-btn:hover {
      color: var(--helios-accent-color);
    }
    .pip-video {
      position: absolute;
      width: 0;
      height: 0;
      opacity: 0;
      pointer-events: none;
    }
    .pip-btn {
      background: none;
      border: none;
      color: var(--helios-text-color);
      font-size: 20px;
      cursor: pointer;
      width: 40px;
      height: 40px;
      margin-left: 8px;
    }
    .pip-btn:hover {
      color: var(--helios-accent-color);
    }
    .captions-container {
      position: absolute;
      bottom: 60px;
      left: 50%;
      transform: translateX(-50%);
      width: 80%;
      text-align: center;
      pointer-events: none;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      z-index: 5;
    }
    .caption-cue {
      background: var(--helios-caption-bg);
      color: var(--helios-caption-color);
      font-family: var(--helios-caption-font-family);
      font-size: var(--helios-internal-caption-font-size, 16px);
      padding: 4px 8px;
      border-radius: 4px;
      text-shadow: 0 1px 2px black;
      white-space: pre-wrap;
    }
    .cc-btn {
      background: none;
      border: none;
      color: var(--helios-text-color);
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-left: 4px;
      opacity: 0.7;
    }
    .cc-btn:hover {
      opacity: 1;
    }
    .cc-btn.active {
      opacity: 1;
      color: var(--helios-accent-color);
      border-bottom: 2px solid var(--helios-accent-color);
    }
    .poster-container {
      position: absolute;
      inset: 0;
      background-color: black;
      z-index: 5;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: opacity 0.3s;
    }
    .poster-container.hidden {
      opacity: 0;
      pointer-events: none;
    }
    .poster-image {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0.6;
    }
    .big-play-btn {
      position: relative;
      z-index: 10;
      background: rgba(0, 0, 0, 0.7);
      border: 2px solid white;
      border-radius: 50%;
      width: 80px;
      height: 80px;
      color: white;
      font-size: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: transform 0.2s;
    }
    .big-play-btn:hover {
        transform: scale(1.1);
    }
    .big-play-btn svg {
        width: 40px;
        height: 40px;
        fill: currentColor;
    }

    .click-layer {
      position: absolute;
      inset: 0;
      z-index: 1;
      background: transparent;
    }
    :host([interactive]) .click-layer {
      pointer-events: none;
    }

    /* Responsive Layouts */
    .controls.layout-compact .volume-slider {
      display: none;
    }
    .controls.layout-tiny .volume-slider {
      display: none;
    }
    slot {
      display: none;
    }

    /* Diagnostics UI */
    .debug-overlay {
      position: absolute;
      inset: 20px;
      background: rgba(0, 0, 0, 0.9);
      border: 1px solid var(--helios-range-track-color);
      border-radius: 8px;
      color: var(--helios-text-color);
      z-index: 100;
      display: flex;
      flex-direction: column;
      font-family: monospace;
      font-size: 12px;
      backdrop-filter: blur(4px);
    }
    .debug-overlay.hidden {
      display: none;
    }
    .debug-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      border-bottom: 1px solid var(--helios-range-track-color);
      background: rgba(255, 255, 255, 0.05);
    }
    .debug-title {
      font-weight: bold;
      font-size: 14px;
    }
    .close-debug-btn {
      background: none;
      border: none;
      color: var(--helios-text-color);
      font-size: 20px;
      cursor: pointer;
      line-height: 1;
    }
    .close-debug-btn:hover {
      color: var(--helios-accent-color);
    }
    .debug-content {
      flex: 1;
      overflow: auto;
      padding: 12px;
      margin: 0;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .debug-actions {
      padding: 8px 12px;
      border-top: 1px solid var(--helios-range-track-color);
      display: flex;
      justify-content: flex-end;
      background: rgba(255, 255, 255, 0.05);
    }
    .copy-debug-btn {
      background: var(--helios-accent-color);
      color: white;
      border: none;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }
    .copy-debug-btn:hover {
      filter: brightness(0.9);
    }
    .audio-menu, .settings-menu {
      position: absolute;
      bottom: 60px;
      background: rgba(0, 0, 0, 0.9);
      border: 1px solid var(--helios-range-track-color);
      border-radius: 8px;
      padding: 8px;
      z-index: 20;
      min-width: 220px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      backdrop-filter: blur(4px);
    }
    .audio-menu {
       left: 10px;
    }
    .settings-menu {
       right: 10px;
    }
    .audio-menu.hidden, .settings-menu.hidden {
      display: none;
    }
    .track-item, .settings-item {
      display: flex;
      align-items: center;
      gap: 8px;
      color: white;
      font-size: 12px;
    }
    .settings-item {
      justify-content: space-between;
    }
    .track-name {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 120px;
    }
    .track-volume {
      width: 60px;
      height: 4px;
      -webkit-appearance: none;
      background: var(--helios-range-track-color);
      border-radius: 2px;
      outline: none;
    }
    .track-volume::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 10px;
      height: 10px;
      background: var(--helios-text-color);
      cursor: pointer;
      border-radius: 50%;
    }
    .track-mute-btn {
      background: none;
      border: none;
      color: var(--helios-text-color);
      cursor: pointer;
      padding: 0;
      font-size: 14px;
      width: 20px;
      text-align: center;
    }
    .audio-btn, .settings-btn {
      background: none;
      border: none;
      color: var(--helios-text-color);
      font-size: 20px;
      cursor: pointer;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-left: 4px;
    }
    .audio-btn:hover, .settings-btn:hover {
      color: var(--helios-accent-color);
    }
    /* Settings UI */
    .settings-label {
      font-weight: bold;
    }
    .settings-select {
       background: rgba(255, 255, 255, 0.1);
       color: white;
       border: 1px solid var(--helios-range-track-color);
       border-radius: 4px;
       padding: 2px 4px;
    }
    .settings-action-btn {
       background: rgba(255, 255, 255, 0.1);
       border: 1px solid var(--helios-range-track-color);
       color: white;
       border-radius: 4px;
       padding: 4px 8px;
       cursor: pointer;
       font-size: 11px;
       flex: 1;
    }
    .settings-action-btn:hover {
       background: rgba(255, 255, 255, 0.2);
    }
    .settings-divider {
       height: 1px;
       background: var(--helios-range-track-color);
       margin: 4px 0;
    }
    /* Toggle Switch */
    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 32px;
      height: 18px;
    }
    .toggle-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    .toggle-slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: var(--helios-range-track-color);
      transition: .2s;
      border-radius: 18px;
    }
    .toggle-slider:before {
      position: absolute;
      content: "";
      height: 14px;
      width: 14px;
      left: 2px;
      bottom: 2px;
      background-color: white;
      transition: .2s;
      border-radius: 50%;
    }
    input:checked + .toggle-slider {
      background-color: var(--helios-accent-color);
    }
    input:checked + .toggle-slider:before {
      transform: translateX(14px);
    }
    /* Shortcuts Overlay */
    .shortcuts-overlay {
      position: absolute;
      inset: 20px;
      background: rgba(0, 0, 0, 0.95);
      border: 1px solid var(--helios-range-track-color);
      border-radius: 8px;
      z-index: 110;
      display: flex;
      flex-direction: column;
      color: white;
      padding: 16px;
      font-size: 13px;
      backdrop-filter: blur(4px);
    }
    .shortcuts-overlay.hidden {
      display: none;
    }
    .shortcuts-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 24px;
      overflow-y: auto;
      flex: 1;
    }
    .shortcut-row {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding: 4px 0;
    }
    .shortcut-key {
      font-family: monospace;
      background: rgba(255, 255, 255, 0.1);
      padding: 2px 6px;
      border-radius: 4px;
      color: var(--helios-accent-color);
    }
    /* Export Menu */
    .export-menu {
      position: absolute;
      bottom: 60px;
      right: 10px;
      background: rgba(0, 0, 0, 0.9);
      border: 1px solid var(--helios-range-track-color);
      border-radius: 8px;
      padding: 12px;
      z-index: 20;
      min-width: 240px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      backdrop-filter: blur(4px);
    }
    .export-menu.hidden {
      display: none;
    }
    .export-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
      color: white;
      font-size: 12px;
    }
    .export-label {
      font-weight: bold;
      color: var(--helios-text-color);
      font-size: 11px;
      text-transform: uppercase;
      opacity: 0.8;
    }
    .export-input, .export-select {
       background: rgba(255, 255, 255, 0.1);
       color: white;
       border: 1px solid var(--helios-range-track-color);
       border-radius: 4px;
       padding: 6px 8px;
       font-size: 13px;
       width: 100%;
       box-sizing: border-box;
       font-family: inherit;
    }
    .export-input:focus, .export-select:focus {
        outline: 1px solid var(--helios-accent-color);
        border-color: var(--helios-accent-color);
    }
    .export-checkbox-label {
       display: flex;
       align-items: center;
       gap: 8px;
       cursor: pointer;
       font-size: 13px;
       user-select: none;
    }
    .export-checkbox-label input {
        accent-color: var(--helios-accent-color);
        width: 16px;
        height: 16px;
        margin: 0;
    }
    .export-action-btn {
       background: var(--helios-accent-color);
       border: none;
       color: white;
       border-radius: 4px;
       padding: 10px;
       cursor: pointer;
       font-size: 14px;
       font-weight: bold;
       margin-top: 4px;
       width: 100%;
       transition: filter 0.2s;
    }
    .export-action-btn:hover {
       filter: brightness(1.1);
    }
  </style>
  <slot></slot>
  <div class="audio-menu hidden" part="audio-menu" id="audio-menu-container" role="dialog" aria-label="Audio Tracks"></div>
  <div class="settings-menu hidden" part="settings-menu" id="settings-menu-container" role="dialog" aria-label="Settings"></div>
  <div class="export-menu hidden" part="export-menu" id="export-menu-container" role="dialog" aria-label="Export Options"></div>

  <div class="shortcuts-overlay hidden" part="shortcuts-overlay">
    <div class="debug-header" part="shortcuts-header">
      <span class="debug-title">Keyboard Shortcuts</span>
      <button class="close-shortcuts-btn close-debug-btn" aria-label="Close">×</button>
    </div>
    <div class="shortcuts-grid" part="shortcuts-grid">
       <!-- Populated via JS -->
    </div>
  </div>

  <div class="debug-overlay hidden" part="debug-overlay">
    <div class="debug-header" part="debug-header">
      <span class="debug-title">Diagnostics</span>
      <button class="close-debug-btn" aria-label="Close diagnostics">×</button>
    </div>
    <pre class="debug-content" part="debug-content"></pre>
    <div class="debug-actions">
      <button class="copy-debug-btn">Copy to Clipboard</button>
    </div>
  </div>
  <div class="status-overlay hidden" part="overlay">
    <div class="status-text" part="status-text">Connecting...</div>
    <button class="retry-btn" part="retry-button" style="display: none">Retry</button>
  </div>
  <div class="poster-container hidden" part="poster">
    <img class="poster-image" part="poster-image" alt="Video poster" />
    <div class="big-play-btn" part="big-play-button" aria-label="Play video">${ICONS.play}</div>
  </div>
  <video class="pip-video" playsinline muted autoplay></video>
  <iframe part="iframe" sandbox="allow-scripts allow-same-origin" title="Helios Composition Preview"></iframe>
  <div class="click-layer" part="click-layer"></div>
  <div class="captions-container" part="captions"></div>
  <div class="controls" part="controls" role="toolbar" aria-label="Playback Controls">
    <button class="play-pause-btn" part="play-pause-button" aria-label="Play">${ICONS.play}</button>
    <div class="volume-control" part="volume-control">
      <button class="volume-btn" part="volume-button" aria-label="Mute">${ICONS.volumeHigh}</button>
      <input type="range" class="volume-slider" min="0" max="1" step="0.05" value="1" part="volume-slider" aria-label="Volume">
    </div>
    <button class="audio-btn" part="audio-button" aria-label="Audio Tracks" style="display: none;" aria-haspopup="true" aria-controls="audio-menu-container" aria-expanded="false">${ICONS.audioTracks}</button>
    <button class="cc-btn" part="cc-button" aria-label="Toggle Captions">${ICONS.cc}</button>
    <button class="export-btn" part="export-button" aria-label="Export options" aria-haspopup="true" aria-controls="export-menu-container" aria-expanded="false">${ICONS.export} <span style="vertical-align: middle; margin-left: 4px;">Export</span></button>
    <div class="scrubber-wrapper" part="scrubber-wrapper">
      <div class="scrubber-tooltip hidden" part="tooltip"></div>
      <div class="markers-container" part="markers"></div>
      <input type="range" class="scrubber" min="0" value="0" step="1" part="scrubber" aria-label="Seek time">
    </div>
    <div class="time-display" part="time-display">0.00 / 0.00</div>
    <button class="fullscreen-btn" part="fullscreen-button" aria-label="Toggle fullscreen">${ICONS.fullscreen}</button>
    <button class="pip-btn" part="pip-button" aria-label="Picture-in-Picture">${ICONS.pip}</button>
    <button class="settings-btn" part="settings-button" aria-label="Settings" aria-haspopup="true" aria-controls="settings-menu-container" aria-expanded="false">${ICONS.settings}</button>
  </div>
`;

export class HeliosPlayer extends HTMLElement implements TrackHost, AudioTrackHost, VideoTrackHost {
  private iframe: HTMLIFrameElement;
  private pipVideo: HTMLVideoElement;
  private _textTracks: HeliosTextTrackList;
  private _audioTracks: HeliosAudioTrackList;
  private _videoTracks: HeliosVideoTrackList;
  private _domTracks = new Map<HTMLTrackElement, HeliosTextTrack>();
  private playPauseBtn: HTMLButtonElement;
  private volumeBtn: HTMLButtonElement;
  private volumeSlider: HTMLInputElement;
  private audioBtn: HTMLButtonElement;
  private audioMenu: HTMLDivElement;
  private settingsBtn: HTMLButtonElement;
  private settingsMenu: HTMLDivElement;
  private exportMenu: HTMLDivElement;
  private scrubber: HTMLInputElement;
  private scrubberWrapper: HTMLDivElement;
  private scrubberTooltip: HTMLDivElement;
  private markersContainer: HTMLDivElement;
  private timeDisplay: HTMLDivElement;
  private exportBtn: HTMLButtonElement;
  private overlay: HTMLElement;
  private statusText: HTMLElement;
  private retryBtn: HTMLButtonElement;
  private retryAction: () => void;
  private fullscreenBtn: HTMLButtonElement;
  private pipBtn: HTMLButtonElement;
  private captionsContainer: HTMLDivElement;
  private ccBtn: HTMLButtonElement;
  private showCaptions: boolean = false;
  private lastCaptionsHash: string = "";

  // Diagnostics UI
  private debugOverlay: HTMLElement;
  private debugContent: HTMLElement;
  private closeDebugBtn: HTMLButtonElement;
  private copyDebugBtn: HTMLButtonElement;

  // Shortcuts UI
  private shortcutsOverlay: HTMLElement;
  private shortcutsGrid: HTMLElement;
  private closeShortcutsBtn: HTMLButtonElement;

  private clickLayer: HTMLDivElement;
  private posterContainer: HTMLDivElement;
  private posterImage: HTMLImageElement;
  private bigPlayBtn: HTMLDivElement;
  private pendingSrc: string | null = null;
  private isLoaded: boolean = false;
  private _hasPlayed: boolean = false;

  private resizeObserver: ResizeObserver;
  private controller: HeliosController | null = null;
  private mediaSession: HeliosMediaSession | null = null;
  // Keep track if we have direct access (optional, mainly for debugging/logging)
  private directHelios: Helios | null = null;
  private unsubscribe: (() => void) | null = null;
  private connectionInterval: number | null = null;
  private abortController: AbortController | null = null;
  private isExporting: boolean = false;
  private isScrubbing: boolean = false;
  private _isSeeking: boolean = false;
  private wasPlayingBeforeScrub: boolean = false;
  private lastState: any = null;
  private pendingProps: Record<string, any> | null = null;
  private _error: MediaError | null = null;

  // Persistence for properties set before connection
  private _pendingVolume: number = 1;
  private _pendingPlaybackRate: number = 1;
  private _pendingMuted: boolean | null = null;

  // --- Standard Media API States ---

  public static readonly HAVE_NOTHING = 0;
  public static readonly HAVE_METADATA = 1;
  public static readonly HAVE_CURRENT_DATA = 2;
  public static readonly HAVE_FUTURE_DATA = 3;
  public static readonly HAVE_ENOUGH_DATA = 4;

  public static readonly NETWORK_EMPTY = 0;
  public static readonly NETWORK_IDLE = 1;
  public static readonly NETWORK_LOADING = 2;
  public static readonly NETWORK_NO_SOURCE = 3;

  private _readyState: number = HeliosPlayer.HAVE_NOTHING;
  private _networkState: number = HeliosPlayer.NETWORK_EMPTY;

  public get readyState(): number {
    return this._readyState;
  }

  public get networkState(): number {
    return this._networkState;
  }

  public get error(): MediaError | null {
    return this._error;
  }

  public get currentSrc(): string {
    return this.src;
  }

  // --- Standard Event Handlers ---

  private _onplay: ((event: Event) => void) | null = null;
  public get onplay() { return this._onplay; }
  public set onplay(handler: ((event: Event) => void) | null) {
    if (this._onplay) this.removeEventListener('play', this._onplay);
    this._onplay = handler;
    if (handler) this.addEventListener('play', handler);
  }

  private _onpause: ((event: Event) => void) | null = null;
  public get onpause() { return this._onpause; }
  public set onpause(handler: ((event: Event) => void) | null) {
    if (this._onpause) this.removeEventListener('pause', this._onpause);
    this._onpause = handler;
    if (handler) this.addEventListener('pause', handler);
  }

  private _onended: ((event: Event) => void) | null = null;
  public get onended() { return this._onended; }
  public set onended(handler: ((event: Event) => void) | null) {
    if (this._onended) this.removeEventListener('ended', this._onended);
    this._onended = handler;
    if (handler) this.addEventListener('ended', handler);
  }

  private _ontimeupdate: ((event: Event) => void) | null = null;
  public get ontimeupdate() { return this._ontimeupdate; }
  public set ontimeupdate(handler: ((event: Event) => void) | null) {
    if (this._ontimeupdate) this.removeEventListener('timeupdate', this._ontimeupdate);
    this._ontimeupdate = handler;
    if (handler) this.addEventListener('timeupdate', handler);
  }

  private _onvolumechange: ((event: Event) => void) | null = null;
  public get onvolumechange() { return this._onvolumechange; }
  public set onvolumechange(handler: ((event: Event) => void) | null) {
    if (this._onvolumechange) this.removeEventListener('volumechange', this._onvolumechange);
    this._onvolumechange = handler;
    if (handler) this.addEventListener('volumechange', handler);
  }

  private _onratechange: ((event: Event) => void) | null = null;
  public get onratechange() { return this._onratechange; }
  public set onratechange(handler: ((event: Event) => void) | null) {
    if (this._onratechange) this.removeEventListener('ratechange', this._onratechange);
    this._onratechange = handler;
    if (handler) this.addEventListener('ratechange', handler);
  }

  private _ondurationchange: ((event: Event) => void) | null = null;
  public get ondurationchange() { return this._ondurationchange; }
  public set ondurationchange(handler: ((event: Event) => void) | null) {
    if (this._ondurationchange) this.removeEventListener('durationchange', this._ondurationchange);
    this._ondurationchange = handler;
    if (handler) this.addEventListener('durationchange', handler);
  }

  private _onseeking: ((event: Event) => void) | null = null;
  public get onseeking() { return this._onseeking; }
  public set onseeking(handler: ((event: Event) => void) | null) {
    if (this._onseeking) this.removeEventListener('seeking', this._onseeking);
    this._onseeking = handler;
    if (handler) this.addEventListener('seeking', handler);
  }

  private _onseeked: ((event: Event) => void) | null = null;
  public get onseeked() { return this._onseeked; }
  public set onseeked(handler: ((event: Event) => void) | null) {
    if (this._onseeked) this.removeEventListener('seeked', this._onseeked);
    this._onseeked = handler;
    if (handler) this.addEventListener('seeked', handler);
  }

  private _onresize: ((event: Event) => void) | null = null;
  public get onresize() { return this._onresize; }
  public set onresize(handler: ((event: Event) => void) | null) {
    if (this._onresize) this.removeEventListener('resize', this._onresize);
    this._onresize = handler;
    if (handler) this.addEventListener('resize', handler);
  }

  private _onloadstart: ((event: Event) => void) | null = null;
  public get onloadstart() { return this._onloadstart; }
  public set onloadstart(handler: ((event: Event) => void) | null) {
    if (this._onloadstart) this.removeEventListener('loadstart', this._onloadstart);
    this._onloadstart = handler;
    if (handler) this.addEventListener('loadstart', handler);
  }

  private _onloadedmetadata: ((event: Event) => void) | null = null;
  public get onloadedmetadata() { return this._onloadedmetadata; }
  public set onloadedmetadata(handler: ((event: Event) => void) | null) {
    if (this._onloadedmetadata) this.removeEventListener('loadedmetadata', this._onloadedmetadata);
    this._onloadedmetadata = handler;
    if (handler) this.addEventListener('loadedmetadata', handler);
  }

  private _onloadeddata: ((event: Event) => void) | null = null;
  public get onloadeddata() { return this._onloadeddata; }
  public set onloadeddata(handler: ((event: Event) => void) | null) {
    if (this._onloadeddata) this.removeEventListener('loadeddata', this._onloadeddata);
    this._onloadeddata = handler;
    if (handler) this.addEventListener('loadeddata', handler);
  }

  private _oncanplay: ((event: Event) => void) | null = null;
  public get oncanplay() { return this._oncanplay; }
  public set oncanplay(handler: ((event: Event) => void) | null) {
    if (this._oncanplay) this.removeEventListener('canplay', this._oncanplay);
    this._oncanplay = handler;
    if (handler) this.addEventListener('canplay', handler);
  }

  private _oncanplaythrough: ((event: Event) => void) | null = null;
  public get oncanplaythrough() { return this._oncanplaythrough; }
  public set oncanplaythrough(handler: ((event: Event) => void) | null) {
    if (this._oncanplaythrough) this.removeEventListener('canplaythrough', this._oncanplaythrough);
    this._oncanplaythrough = handler;
    if (handler) this.addEventListener('canplaythrough', handler);
  }

  private _onerror: OnErrorEventHandler = null;
  public get onerror(): OnErrorEventHandler { return this._onerror; }
  public set onerror(handler: OnErrorEventHandler) {
    if (this._onerror) this.removeEventListener('error', this._onerror as EventListener);
    this._onerror = handler;
    if (handler) this.addEventListener('error', handler as EventListener);
  }

  private _onenterpictureinpicture: ((event: Event) => void) | null = null;
  public get onenterpictureinpicture() { return this._onenterpictureinpicture; }
  public set onenterpictureinpicture(handler: ((event: Event) => void) | null) {
    if (this._onenterpictureinpicture) this.removeEventListener('enterpictureinpicture', this._onenterpictureinpicture);
    this._onenterpictureinpicture = handler;
    if (handler) this.addEventListener('enterpictureinpicture', handler);
  }

  private _onleavepictureinpicture: ((event: Event) => void) | null = null;
  public get onleavepictureinpicture() { return this._onleavepictureinpicture; }
  public set onleavepictureinpicture(handler: ((event: Event) => void) | null) {
    if (this._onleavepictureinpicture) this.removeEventListener('leavepictureinpicture', this._onleavepictureinpicture);
    this._onleavepictureinpicture = handler;
    if (handler) this.addEventListener('leavepictureinpicture', handler);
  }

  // --- Standard Media API ---

  public canPlayType(type: string): CanPlayTypeResult {
    // We strictly play Helios compositions, not standard video MIME types.
    // Return empty string to be spec-compliant for video/mp4 etc.
    return "";
  }

  public get defaultMuted(): boolean {
    return this.hasAttribute("muted");
  }

  public set defaultMuted(val: boolean) {
    if (val) {
      this.setAttribute("muted", "");
    } else {
      this.removeAttribute("muted");
    }
  }

  private _defaultPlaybackRate = 1.0;
  public get defaultPlaybackRate(): number {
    return this._defaultPlaybackRate;
  }

  public set defaultPlaybackRate(val: number) {
    if (this._defaultPlaybackRate !== val) {
      this._defaultPlaybackRate = val;
      this.dispatchEvent(new Event("ratechange"));
    }
  }

  private _preservesPitch = true;
  public get preservesPitch(): boolean {
    return this._preservesPitch;
  }

  public set preservesPitch(val: boolean) {
    this._preservesPitch = val;
  }

  public get srcObject(): MediaProvider | null {
    return null;
  }

  public set srcObject(val: MediaProvider | null) {
    console.warn("HeliosPlayer does not support srcObject");
  }

  public get crossOrigin(): string | null {
    return this.getAttribute("crossorigin");
  }

  public set crossOrigin(val: string | null) {
    if (val !== null) {
      this.setAttribute("crossorigin", val);
    } else {
      this.removeAttribute("crossorigin");
    }
  }

  public get seeking(): boolean {
    // Return internal scrubbing state as seeking
    return this.isScrubbing || this._isSeeking;
  }

  public get buffered(): TimeRanges {
    return new StaticTimeRange(0, this.duration);
  }

  public get seekable(): TimeRanges {
    return new StaticTimeRange(0, this.duration);
  }

  public get played(): TimeRanges {
    // Standard Media API: played range matches duration
    return new StaticTimeRange(0, this.duration);
  }

  /**
   * Gets the width attribute of the player.
   * Part of the Standard Media API parity.
   * @returns {number} The width.
   */
  public get width(): number {
    const val = this.getAttribute("width");
    return val ? (parseInt(val, 10) || 0) : 0;
  }

  /**
   * Sets the width attribute of the player.
   * Part of the Standard Media API parity.
   * @param {number} val The new width.
   */
  public set width(val: number) {
    this.setAttribute("width", String(val));
  }

  /**
   * Gets the height attribute of the player.
   * Part of the Standard Media API parity.
   * @returns {number} The height.
   */
  public get height(): number {
    const val = this.getAttribute("height");
    return val ? (parseInt(val, 10) || 0) : 0;
  }

  /**
   * Sets the height attribute of the player.
   * Part of the Standard Media API parity.
   * @param {number} val The new height.
   */
  public set height(val: number) {
    this.setAttribute("height", String(val));
  }

  public get videoWidth(): number {
    if (this.controller) {
      const state = this.controller.getState();
      if (state.width) return state.width;
    }
    return parseFloat(this.getAttribute("width") || "0");
  }

  public get videoHeight(): number {
    if (this.controller) {
      const state = this.controller.getState();
      if (state.height) return state.height;
    }
    return parseFloat(this.getAttribute("height") || "0");
  }

  /**
   * Gets whether the playsinline attribute is present.
   * Part of the Standard Media API parity.
   * @returns {boolean} True if playsinline is present.
   */
  public get playsInline(): boolean {
    return this.hasAttribute("playsinline");
  }

  /**
   * Sets the playsinline attribute.
   * Part of the Standard Media API parity.
   * @param {boolean} val Whether playsinline should be present.
   */
  public set playsInline(val: boolean) {
    if (val) {
      this.setAttribute("playsinline", "");
    } else {
      this.removeAttribute("playsinline");
    }
  }

  /**
   * Seeks to the specified time.
   * Part of the Standard Media API parity.
   * Note: In HeliosPlayer, this currently delegates to standard seek (currentTime setter).
   * @param time The time to seek to.
   */
  public fastSeek(time: number): void {
    this.currentTime = time;
  }

  public get currentTime(): number {
    if (!this.controller) return 0;
    const s = this.controller.getState();
    return s.fps ? s.currentFrame / s.fps : 0;
  }

  public set currentTime(val: number) {
    if (this.controller) {
      const s = this.controller.getState();
      if (s.fps) {
        // Dispatch events to satisfy Standard Media API expectations
        this._isSeeking = true;
        this.dispatchEvent(new Event("seeking"));
        this.controller.seek(Math.floor(val * s.fps)).then(() => {
          this._isSeeking = false;
          this.dispatchEvent(new Event("seeked"));
        });
      }
    }
  }

  public get currentFrame(): number {
    return this.controller ? this.controller.getState().currentFrame : 0;
  }

  public set currentFrame(val: number) {
    if (this.controller) {
      // Dispatch events to satisfy Standard Media API expectations
      this._isSeeking = true;
      this.dispatchEvent(new Event("seeking"));
      this.controller.seek(Math.floor(val)).then(() => {
        this._isSeeking = false;
        this.dispatchEvent(new Event("seeked"));
      });
    }
  }

  public get duration(): number {
    return this.controller ? this.controller.getState().duration : 0;
  }

  public get paused(): boolean {
    return this.controller ? !this.controller.getState().isPlaying : true;
  }

  public get ended(): boolean {
    if (!this.controller) return false;
    const s = this.controller.getState();
    return s.currentFrame >= s.duration * s.fps - 1;
  }

  public get volume(): number {
    if (this.controller) {
      return this.controller.getState().volume ?? this._pendingVolume;
    }
    return this._pendingVolume;
  }

  public set volume(val: number) {
    const clamped = Math.max(0, Math.min(1, val));
    this._pendingVolume = clamped;
    if (this.controller) {
      this.controller.setAudioVolume(clamped);
    }
  }

  public get muted(): boolean {
    if (this.controller) {
      return !!this.controller.getState().muted;
    }
    // If pendingMuted is explicitly set, return it.
    // Otherwise fallback to attribute presence (default behavior).
    return this._pendingMuted !== null ? this._pendingMuted : this.hasAttribute("muted");
  }

  public set muted(val: boolean) {
    this._pendingMuted = val;
    if (this.controller) {
      this.controller.setAudioMuted(val);
    }
  }

  public get interactive(): boolean {
    return this.hasAttribute("interactive");
  }

  public set interactive(val: boolean) {
    if (val) {
      this.setAttribute("interactive", "");
    } else {
      this.removeAttribute("interactive");
    }
  }

  public get playbackRate(): number {
    if (this.controller) {
      return this.controller.getState().playbackRate ?? this._pendingPlaybackRate;
    }
    return this._pendingPlaybackRate;
  }

  public set playbackRate(val: number) {
    this._pendingPlaybackRate = val;
    if (this.controller) {
      this.controller.setPlaybackRate(val);
    }
  }

  public get fps(): number {
    return this.controller ? this.controller.getState().fps : 0;
  }

  public get src(): string {
    return this.getAttribute("src") || "";
  }

  public set src(val: string) {
    this.setAttribute("src", val);
  }

  public get autoplay(): boolean {
    return this.hasAttribute("autoplay");
  }

  public set autoplay(val: boolean) {
    if (val) {
      this.setAttribute("autoplay", "");
    } else {
      this.removeAttribute("autoplay");
    }
  }

  public get loop(): boolean {
    return this.hasAttribute("loop");
  }

  public set loop(val: boolean) {
    if (val) {
      this.setAttribute("loop", "");
    } else {
      this.removeAttribute("loop");
    }
  }

  public get controls(): boolean {
    return this.hasAttribute("controls");
  }

  public set controls(val: boolean) {
    if (val) {
      this.setAttribute("controls", "");
    } else {
      this.removeAttribute("controls");
    }
  }

  public get poster(): string {
    return this.getAttribute("poster") || "";
  }

  public set poster(val: string) {
    this.setAttribute("poster", val);
  }

  public get preload(): string {
    return this.getAttribute("preload") || "auto";
  }

  public set preload(val: string) {
    this.setAttribute("preload", val);
  }

  public get sandbox(): string {
    const val = this.getAttribute("sandbox");
    return val === null ? "allow-scripts allow-same-origin" : val;
  }

  public set sandbox(val: string) {
    this.setAttribute("sandbox", val);
  }

  public get disablePictureInPicture(): boolean {
    return this.hasAttribute("disablepictureinpicture");
  }

  public set disablePictureInPicture(val: boolean) {
    if (val) {
      this.setAttribute("disablepictureinpicture", "");
    } else {
      this.removeAttribute("disablepictureinpicture");
    }
  }

  public async requestPictureInPicture(): Promise<PictureInPictureWindow> {
    if (!document.pictureInPictureEnabled) {
      throw new Error("Picture-in-Picture not supported");
    }

    // Try to find the canvas
    let canvas: HTMLCanvasElement | null = null;
    try {
        const doc = this.iframe.contentDocument || (this.iframe.contentWindow as any)?.document;
        if (doc) {
            const selector = this.getAttribute("canvas-selector") || "canvas";
            canvas = doc.querySelector(selector);
        }
    } catch (e) {
        // Access denied
    }

    if (!canvas) {
        throw new Error("No canvas found for Picture-in-Picture (requires same-origin access).");
    }

    const stream = canvas.captureStream(this.fps || 30);
    this.pipVideo.srcObject = stream;
    await this.pipVideo.play();
    return this.pipVideo.requestPictureInPicture();
  }

  private togglePip() {
    if (document.pictureInPictureElement) {
       document.exitPictureInPicture();
    } else {
       this.requestPictureInPicture().catch(e => {
           console.warn("HeliosPlayer: PiP failed", e);
       });
    }
  }

  private onEnterPip = () => {
    this.pipBtn.style.color = "var(--helios-accent-color)";
    this.dispatchEvent(new Event("enterpictureinpicture"));
  };

  private onLeavePip = () => {
    this.pipBtn.style.removeProperty("color");
    this.pipVideo.pause();
    this.dispatchEvent(new Event("leavepictureinpicture"));
  };

  public async play(): Promise<void> {
    if (!this.isLoaded) {
      this.setAttribute("autoplay", "");
      this.load();
    } else if (this.controller) {
      this.controller.play();
    }
  }

  public load(): void {
    if (this.pendingSrc) {
      const src = this.pendingSrc;
      this.pendingSrc = null;
      this.loadIframe(src);
    } else {
      const src = this.getAttribute("src");
      if (src) {
        this.loadIframe(src);
      }
    }
  }

  public pause(): void {
    if (this.controller) {
      this.controller.pause();
    }
  }

  static get observedAttributes() {
    return ["src", "width", "height", "autoplay", "loop", "controls", "export-format", "input-props", "poster", "muted", "interactive", "preload", "controlslist", "sandbox", "export-caption-mode", "disablepictureinpicture", "export-width", "export-height", "export-bitrate", "export-filename", "media-title", "media-artist", "media-album", "media-artwork", "export-mode"];
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot!.appendChild(template.content.cloneNode(true));

    this.iframe = this.shadowRoot!.querySelector("iframe")!;
    this.playPauseBtn = this.shadowRoot!.querySelector(".play-pause-btn")!;
    this.volumeBtn = this.shadowRoot!.querySelector(".volume-btn")!;
    this.volumeSlider = this.shadowRoot!.querySelector(".volume-slider")!;
    this.audioBtn = this.shadowRoot!.querySelector(".audio-btn")!;
    this.audioMenu = this.shadowRoot!.querySelector(".audio-menu")!;
    this.settingsBtn = this.shadowRoot!.querySelector(".settings-btn")!;
    this.settingsMenu = this.shadowRoot!.querySelector(".settings-menu")!;
    this.exportMenu = this.shadowRoot!.querySelector(".export-menu")!;
    this.scrubber = this.shadowRoot!.querySelector(".scrubber")!;
    this.scrubberWrapper = this.shadowRoot!.querySelector(".scrubber-wrapper")!;
    this.scrubberTooltip = this.shadowRoot!.querySelector(".scrubber-tooltip")!;
    this.markersContainer = this.shadowRoot!.querySelector(".markers-container")!;
    this.timeDisplay = this.shadowRoot!.querySelector(".time-display")!;
    this.exportBtn = this.shadowRoot!.querySelector(".export-btn")!;
    this.overlay = this.shadowRoot!.querySelector(".status-overlay")!;
    this.statusText = this.shadowRoot!.querySelector(".status-text")!;
    this.retryBtn = this.shadowRoot!.querySelector(".retry-btn")!;
    this.fullscreenBtn = this.shadowRoot!.querySelector(".fullscreen-btn")!;
    this.pipBtn = this.shadowRoot!.querySelector(".pip-btn")!;
    this.captionsContainer = this.shadowRoot!.querySelector(".captions-container")!;
    this.ccBtn = this.shadowRoot!.querySelector(".cc-btn")!;

    this.debugOverlay = this.shadowRoot!.querySelector(".debug-overlay")!;
    this.debugContent = this.shadowRoot!.querySelector(".debug-content")!;
    this.closeDebugBtn = this.shadowRoot!.querySelector(".close-debug-btn")!;
    this.copyDebugBtn = this.shadowRoot!.querySelector(".copy-debug-btn")!;

    this.shortcutsOverlay = this.shadowRoot!.querySelector(".shortcuts-overlay")!;
    this.shortcutsGrid = this.shadowRoot!.querySelector(".shortcuts-grid")!;
    this.closeShortcutsBtn = this.shadowRoot!.querySelector(".close-shortcuts-btn")!;

    this.pipVideo = this.shadowRoot!.querySelector(".pip-video")!;

    this.clickLayer = this.shadowRoot!.querySelector(".click-layer")!;
    this.posterContainer = this.shadowRoot!.querySelector(".poster-container")!;
    this.posterImage = this.shadowRoot!.querySelector(".poster-image")!;
    this.bigPlayBtn = this.shadowRoot!.querySelector(".big-play-btn")!;

    this.retryAction = () => this.retryConnection();
    this.retryBtn.onclick = () => this.retryAction();

    this.clickLayer.addEventListener("click", () => {
      this.focus();
      this.togglePlayPause();
    });
    this.clickLayer.addEventListener("dblclick", () => this.toggleFullscreen());

    this._textTracks = new HeliosTextTrackList();
    this._textTracks.addEventListener("addtrack", () => this.updateCCButtonVisibility());
    this._textTracks.addEventListener("removetrack", () => this.updateCCButtonVisibility());

    this._audioTracks = new HeliosAudioTrackList();
    this._audioTracks.addEventListener("addtrack", () => this.updateAudioBtnVisibility());
    this._audioTracks.addEventListener("removetrack", () => this.updateAudioBtnVisibility());
    this._audioTracks.addEventListener("change", () => {
        if (!this.audioMenu.classList.contains("hidden")) {
            this.renderAudioMenu();
        }
    });

    this._videoTracks = new HeliosVideoTrackList();
    this._videoTracks.addTrack(new HeliosVideoTrack("main", "main", "Main Video", "en", true, this));

    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        const height = entry.contentRect.height;
        const controls = this.shadowRoot!.querySelector(".controls");
        if (controls) {
          controls.classList.toggle("layout-compact", width < 500);
          controls.classList.toggle("layout-tiny", width < 350);
        }

        // Responsive Caption Sizing
        const computedStyle = getComputedStyle(this);
        const scale = parseFloat(computedStyle.getPropertyValue('--helios-caption-scale').trim()) || 0.05;
        const fontSize = Math.max(16, height * scale);
        this.style.setProperty('--helios-internal-caption-font-size', `${fontSize}px`);
      }
    });
  }

  public get textTracks(): HeliosTextTrackList {
    return this._textTracks;
  }

  public get audioTracks(): HeliosAudioTrackList {
    return this._audioTracks;
  }

  public get videoTracks(): HeliosVideoTrackList {
    return this._videoTracks;
  }

  public addTextTrack(kind: string, label: string = "", language: string = ""): HeliosTextTrack {
    const track = new HeliosTextTrack(kind, label, language, this);
    this._textTracks.addTrack(track);
    return track;
  }

  public handleAudioTrackEnabledChange(track: HeliosAudioTrack) {
    if (!this.controller) return;
    // Helios "muted" is the inverse of AudioTrack "enabled"
    this.controller.setAudioTrackMuted(track.id, !track.enabled);
    this._audioTracks.dispatchChangeEvent();
  }

  public handleVideoTrackSelectedChange(track: HeliosVideoTrack) {
    if (track.selected) {
      for (const t of this._videoTracks) {
        if (t !== track && t.selected) {
           t._setSelectedInternal(false);
        }
      }
    }

    this._videoTracks.dispatchChangeEvent();
  }

  public handleTrackModeChange(track: HeliosTextTrack) {
    this._textTracks.dispatchChangeEvent();
    if (!this.controller) return;

    if (track.mode === 'showing') {
        // Enforce mutual exclusivity for 'captions'
        if (track.kind === 'captions') {
            for (const t of this._textTracks) {
                if (t !== track && t.kind === 'captions' && t.mode === 'showing') {
                    t.mode = 'hidden';
                }
            }
        }

        // Extract cues into the format Helios expects
        const captions = Array.from(track.cues).map((cue: any, index: number) => ({
            id: cue.id || String(index + 1),
            startTime: cue.startTime * 1000, // Convert seconds to milliseconds
            endTime: cue.endTime * 1000,     // Convert seconds to milliseconds
            text: cue.text
        }));
        this.controller.setCaptions(captions);
    } else {
        // If hiding/disabling, check if any other track is showing
        const showingTrack = Array.from(this._textTracks).find(t => t.mode === 'showing' && t.kind === 'captions');
        if (showingTrack) {
             const captions = Array.from(showingTrack.cues).map((cue: any, index: number) => ({
                id: cue.id || String(index + 1),
                startTime: cue.startTime * 1000, // Convert seconds to milliseconds
                endTime: cue.endTime * 1000,     // Convert seconds to milliseconds
                text: cue.text
            }));
             this.controller.setCaptions(captions);
        } else {
             this.controller.setCaptions([]);
        }
    }
  }

  attributeChangedCallback(name: string, oldVal: string, newVal: string) {
    if (oldVal === newVal) return;

    if (name === "poster") {
      this.posterImage.src = newVal;
      this.updatePosterVisibility();
    }

    if (name === "src") {
      const preload = this.getAttribute("preload") || "auto";
      if (preload === "none" && !this.isLoaded) {
        this.pendingSrc = newVal;
        this.updatePosterVisibility();
        // Hide loading/connecting status since we are deferring load
        this.hideStatus();
      } else {
        this.loadIframe(newVal);
      }
    }

    if (name === "width" || name === "height") {
      this.updateAspectRatio();
    }

    if (name === "loop") {
      if (this.controller) {
        this.controller.setLoop(this.hasAttribute("loop"));
      }
    }

    if (name === "input-props") {
      try {
        const props = JSON.parse(newVal);
        this.pendingProps = props;
        if (this.controller) {
          this.controller.setInputProps(props);
        }
      } catch (e) {
        console.warn("HeliosPlayer: Invalid JSON in input-props", e);
      }
    }

    if (name === "muted") {
      if (this.controller) {
        this.controller.setAudioMuted(this.hasAttribute("muted"));
      }
    }

    if (name.startsWith("media-")) {
      this.mediaSession?.updateMetadata();
    }

    if (name === "controlslist" || name === "disablepictureinpicture" || name === "export-mode") {
      this.updateControlsVisibility();
    }

    if (name === "sandbox") {
      const newValOrNull = this.getAttribute("sandbox");
      // If attribute is missing (null), use default.
      // If present (even if empty string ""), use it as is.
      const flags = newValOrNull === null ? "allow-scripts allow-same-origin" : newValOrNull;

      if (this.iframe.getAttribute("sandbox") !== flags) {
        this.iframe.setAttribute("sandbox", flags);

        // If we have a source, we must reload for new sandbox flags to apply
        if (this.getAttribute("src")) {
           this.loadIframe(this.getAttribute("src")!);
        }
      }
    }
  }

  private updateControlsVisibility() {
    if (!this.exportBtn || !this.fullscreenBtn) return;

    const attr = this.getAttribute("controlslist") || "";
    const tokens = attr.toLowerCase().split(/\s+/);

    if (tokens.includes("nodownload")) {
      this.exportBtn.style.display = "none";
    } else {
      this.exportBtn.style.removeProperty("display");
    }

    if (tokens.includes("nofullscreen")) {
      this.fullscreenBtn.style.display = "none";
    } else {
      this.fullscreenBtn.style.removeProperty("display");
    }

    let showPiP = !this.hasAttribute("disablepictureinpicture");

    if (!document.pictureInPictureEnabled) {
      showPiP = false;
    }

    if (this.getAttribute("export-mode") === "dom") {
      showPiP = false;
    }

    if (showPiP) {
      this.pipBtn.style.removeProperty("display");
    } else {
      this.pipBtn.style.display = "none";
    }
  }

  private updateCCButtonVisibility() {
    // Smart Controls: Hide CC button if no tracks are present
    if (this._textTracks.length > 0) {
        this.ccBtn.style.removeProperty("display");
    } else {
        this.ccBtn.style.display = "none";
    }
  }

  private updateAudioBtnVisibility() {
    if (this._audioTracks.length > 0) {
      this.audioBtn.style.removeProperty("display");
    } else {
      this.audioBtn.style.display = "none";
    }
  }

  private toggleAudioMenu = (e: MouseEvent) => {
    e.stopPropagation();
    if (this.audioMenu.classList.contains("hidden")) {
      this.closeSettingsMenu(); // Close other menu
      this.closeExportMenu();
      this.renderAudioMenu();
      this.audioMenu.classList.remove("hidden");
      this.audioBtn.setAttribute("aria-expanded", "true");

      const firstFocusable = this.audioMenu.querySelector("input, button") as HTMLElement;
      if (firstFocusable) {
        firstFocusable.focus();
      }
    } else {
      this.closeAudioMenu();
    }
  }

  private closeAudioMenu = () => {
    this.audioMenu.classList.add("hidden");
    this.audioBtn.setAttribute("aria-expanded", "false");
  }

  private toggleSettingsMenu = (e: MouseEvent) => {
    e.stopPropagation();
    if (this.settingsMenu.classList.contains("hidden")) {
      this.closeAudioMenu(); // Close other menu
      this.closeExportMenu();
      this.renderSettingsMenu();
      this.settingsMenu.classList.remove("hidden");
      this.settingsBtn.setAttribute("aria-expanded", "true");
    } else {
      this.closeSettingsMenu();
    }
  }

  private closeSettingsMenu = () => {
    this.settingsMenu.classList.add("hidden");
    this.settingsBtn.setAttribute("aria-expanded", "false");
  }

  private closeMenusIfOutside = (e: MouseEvent) => {
      this.closeAudioMenuIfOutside(e);

      if (!this.settingsMenu.classList.contains("hidden")) {
         const target = e.composedPath()[0] as Node;
         if (!this.settingsMenu.contains(target) && !this.settingsBtn.contains(target)) {
             this.closeSettingsMenu();
         }
      }

      if (!this.exportMenu.classList.contains("hidden")) {
         const target = e.composedPath()[0] as Node;
         if (!this.exportMenu.contains(target) && !this.exportBtn.contains(target)) {
             this.closeExportMenu();
         }
      }
  }

  private closeAudioMenuIfOutside = (e: MouseEvent) => {
      // If menu is hidden, do nothing
      if (this.audioMenu.classList.contains("hidden")) return;

      const target = e.composedPath()[0] as Node;
      // Check if click is inside the menu or on the button
      if (this.audioMenu.contains(target) || this.audioBtn.contains(target)) {
          return;
      }
      this.closeAudioMenu();
  }

  private toggleExportMenu = (e: MouseEvent) => {
    e.stopPropagation();
    if (this.exportMenu.classList.contains("hidden")) {
      this.closeAudioMenu();
      this.closeSettingsMenu();
      this.renderExportMenu();
      this.exportMenu.classList.remove("hidden");
      this.exportBtn.setAttribute("aria-expanded", "true");

      const firstFocusable = this.exportMenu.querySelector("input, select, button") as HTMLElement;
      if (firstFocusable) firstFocusable.focus();
    } else {
      this.closeExportMenu();
    }
  }

  private closeExportMenu = () => {
    this.exportMenu.classList.add("hidden");
    this.exportBtn.setAttribute("aria-expanded", "false");
  }

  private renderExportMenu() {
    this.exportMenu.innerHTML = "";

    // 1. Filename
    const filenameItem = document.createElement("div");
    filenameItem.className = "export-item";
    filenameItem.innerHTML = `<span class="export-label">Filename</span>`;
    const filenameInput = document.createElement("input");
    filenameInput.className = "export-input";
    filenameInput.type = "text";
    filenameInput.value = this.getAttribute("export-filename") || "video";
    filenameItem.appendChild(filenameInput);
    this.exportMenu.appendChild(filenameItem);

    // 2. Format
    const formatItem = document.createElement("div");
    formatItem.className = "export-item";
    formatItem.innerHTML = `<span class="export-label">Format</span>`;
    const formatSelect = document.createElement("select");
    formatSelect.className = "export-select";
    ["mp4", "webm", "png", "jpeg"].forEach(fmt => {
        const opt = document.createElement("option");
        opt.value = fmt;
        opt.textContent = fmt.toUpperCase();
        formatSelect.appendChild(opt);
    });
    formatSelect.value = this.getAttribute("export-format") || "mp4";
    formatItem.appendChild(formatSelect);
    this.exportMenu.appendChild(formatItem);

    // 3. Resolution (Scale)
    const scaleItem = document.createElement("div");
    scaleItem.className = "export-item";
    scaleItem.innerHTML = `<span class="export-label">Resolution</span>`;
    const scaleSelect = document.createElement("select");
    scaleSelect.className = "export-select";

    const w = this.videoWidth || 1920;
    const h = this.videoHeight || 1080;

    [1, 0.5].forEach(scale => {
        const opt = document.createElement("option");
        opt.value = String(scale);
        const label = scale === 1 ? "Original" : "Half";
        opt.textContent = `${label} (${Math.round(w * scale)}x${Math.round(h * scale)})`;
        scaleSelect.appendChild(opt);
    });
    scaleSelect.value = "1";
    scaleItem.appendChild(scaleSelect);
    this.exportMenu.appendChild(scaleItem);

    // 4. Captions
    const captionsItem = document.createElement("div");
    captionsItem.className = "export-item";
    const captionsLabel = document.createElement("label");
    captionsLabel.className = "export-checkbox-label";
    const captionsCheckbox = document.createElement("input");
    captionsCheckbox.type = "checkbox";
    captionsCheckbox.checked = this.showCaptions;
    captionsLabel.appendChild(captionsCheckbox);
    captionsLabel.appendChild(document.createTextNode("Burn-in Captions"));
    captionsItem.appendChild(captionsLabel);
    this.exportMenu.appendChild(captionsItem);

    // 5. Action Button
    const actionBtn = document.createElement("button");
    actionBtn.className = "export-action-btn";

    const updateButtonText = () => {
        const isImage = ["png", "jpeg"].includes(formatSelect.value);
        actionBtn.textContent = isImage ? "Save Snapshot" : "Export Video";
    };

    formatSelect.addEventListener("change", updateButtonText);
    updateButtonText();

    actionBtn.onclick = () => {
        this.startExportFromMenu({
            filename: filenameInput.value || "video",
            format: formatSelect.value,
            scale: parseFloat(scaleSelect.value),
            includeCaptions: captionsCheckbox.checked
        });
    };

    this.exportMenu.appendChild(actionBtn);
  }

  private async startExportFromMenu(options: { filename: string, format: string, scale: number, includeCaptions: boolean }) {
      this.closeExportMenu();

      // Calculate dimensions
      const w = this.videoWidth || 1920;
      const h = this.videoHeight || 1080;
      const width = Math.round(w * options.scale);
      const height = Math.round(h * options.scale);

      // Setup AbortController
      this.abortController = new AbortController();
      this.exportBtn.textContent = "Cancel"; // Should show cancel immediately

      try {
          await this.export({
              filename: options.filename,
              format: options.format as any,
              width,
              height,
              includeCaptions: options.includeCaptions,
              signal: this.abortController.signal,
              onProgress: (p) => {
                  const percent = Math.round(p * 100);
                  if (options.format === 'png' || options.format === 'jpeg') {
                      this.exportBtn.textContent = "Saving...";
                  } else {
                      this.exportBtn.textContent = `Cancel (${percent}%)`;
                  }
              }
          });
      } catch (e: any) {
          if (e.message !== "Export aborted") {
            this.showStatus("Export Failed: " + e.message, true, {
              label: "Dismiss",
              handler: () => this.hideStatus()
            });
          }
          console.error("Export failed or aborted", e);
      } finally {
          this.exportBtn.textContent = "Export";
          this.exportBtn.disabled = false;
          this.abortController = null;
      }
  }

  private renderSettingsMenu() {
    this.settingsMenu.innerHTML = "";
    if (!this.controller) return;

    const state = this.controller.getState();

    // 1. Playback Speed
    const speedItem = document.createElement("div");
    speedItem.className = "settings-item";
    speedItem.innerHTML = `<span class="settings-label">Speed</span>`;

    const speedSelect = document.createElement("select");
    speedSelect.className = "settings-select";
    const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
    speedSelect.innerHTML = speeds.map(rate =>
      `<option value="${rate}">${rate}x</option>`
    ).join("");
    speedSelect.value = String(state.playbackRate || 1);
    speedSelect.addEventListener("change", (e) => {
        if (this.controller) {
            this.controller.setPlaybackRate(parseFloat(speedSelect.value));
        }
    });
    speedItem.appendChild(speedSelect);
    this.settingsMenu.appendChild(speedItem);

    this.settingsMenu.appendChild(this.createDivider());

    // 2. Loop
    const loopItem = document.createElement("div");
    loopItem.className = "settings-item";
    loopItem.innerHTML = `<span class="settings-label">Loop</span>`;

    const loopSwitch = document.createElement("label");
    loopSwitch.className = "toggle-switch";
    const loopInput = document.createElement("input");
    loopInput.type = "checkbox";
    loopInput.checked = this.hasAttribute("loop"); // We sync attribute with state, but check attrib for initial state
    // Actually better to check state if available, but native loop state in controller mirrors attribute usually
    // Let's assume controller state matches attribute or manual set
    // But controller.setLoop() updates internal state.
    // We don't have isLooping in state exposed directly?
    // Wait, HeliosState doesn't expose 'loop' boolean?
    // Let's check state. Actually HeliosState does not strictly expose loop boolean,
    // it's handled by logic. But we can use attribute as source of truth for UI toggle
    // if we keep them synced.
    // However, setLoop updates the attribute usually? No, the attribute updater calls setLoop.

    loopInput.addEventListener("change", () => {
        this.loop = loopInput.checked; // This triggers attributeChangedCallback -> controller.setLoop
    });

    const loopSlider = document.createElement("span");
    loopSlider.className = "toggle-slider";
    loopSwitch.appendChild(loopInput);
    loopSwitch.appendChild(loopSlider);
    loopItem.appendChild(loopSwitch);
    this.settingsMenu.appendChild(loopItem);

    // 3. Loop Range Controls
    const rangeItem = document.createElement("div");
    rangeItem.className = "settings-item";
    rangeItem.style.flexDirection = "column";
    rangeItem.style.alignItems = "stretch";
    rangeItem.style.gap = "4px";

    rangeItem.innerHTML = `<span class="settings-label">Playback Range</span>`;

    const btnRow = document.createElement("div");
    btnRow.style.display = "flex";
    btnRow.style.gap = "4px";

    const setInBtn = document.createElement("button");
    setInBtn.className = "settings-action-btn";
    setInBtn.textContent = "Set In";
    setInBtn.onclick = () => {
         const s = this.controller!.getState();
         const start = Math.floor(s.currentFrame);
         const end = s.playbackRange ? s.playbackRange[1] : (s.duration * s.fps);
         this.controller!.setPlaybackRange(start, Math.max(start + 1, end));
    };

    const setOutBtn = document.createElement("button");
    setOutBtn.className = "settings-action-btn";
    setOutBtn.textContent = "Set Out";
    setOutBtn.onclick = () => {
         const s = this.controller!.getState();
         const end = Math.floor(s.currentFrame);
         const start = s.playbackRange ? s.playbackRange[0] : 0;
         this.controller!.setPlaybackRange(Math.min(start, end - 1), end);
    };

    const clearBtn = document.createElement("button");
    clearBtn.className = "settings-action-btn";
    clearBtn.textContent = "Clear";
    clearBtn.onclick = () => {
         this.controller!.clearPlaybackRange();
    };

    btnRow.appendChild(setInBtn);
    btnRow.appendChild(setOutBtn);
    btnRow.appendChild(clearBtn);
    rangeItem.appendChild(btnRow);
    this.settingsMenu.appendChild(rangeItem);

    this.settingsMenu.appendChild(this.createDivider());

    // 4. Shortcuts
    const shortcutsBtn = document.createElement("button");
    shortcutsBtn.className = "settings-action-btn";
    shortcutsBtn.style.textAlign = "center";
    shortcutsBtn.textContent = "Keyboard Shortcuts";
    shortcutsBtn.onclick = () => {
        this.closeSettingsMenu();
        this.toggleShortcutsOverlay();
    };
    this.settingsMenu.appendChild(shortcutsBtn);

    // 5. Diagnostics
    const diagBtn = document.createElement("button");
    diagBtn.className = "settings-action-btn";
    diagBtn.style.textAlign = "center";
    diagBtn.textContent = "Diagnostics";
    diagBtn.onclick = () => {
        this.closeSettingsMenu();
        this.toggleDiagnostics();
    };
    this.settingsMenu.appendChild(diagBtn);
  }

  private createDivider() {
      const div = document.createElement("div");
      div.className = "settings-divider";
      return div;
  }

  private renderAudioMenu() {
    this.audioMenu.innerHTML = "";

    const tracks = Array.from(this._audioTracks);

    tracks.forEach(track => {
      const item = document.createElement("div");
      item.className = "track-item";

      const name = document.createElement("span");
      name.className = "track-name";
      name.textContent = track.label || track.id;
      name.title = name.textContent;

      let currentVolume = 1;

      if (this.controller) {
          const state = this.controller.getState();
          if (state.audioTracks && state.audioTracks[track.id]) {
              currentVolume = state.audioTracks[track.id].volume ?? 1;
          }
      }

      const volumeSlider = document.createElement("input");
      volumeSlider.type = "range";
      volumeSlider.className = "track-volume";
      volumeSlider.min = "0";
      volumeSlider.max = "1";
      volumeSlider.step = "0.05";
      volumeSlider.value = String(currentVolume);
      volumeSlider.ariaLabel = `Volume for ${name.textContent}`;

      volumeSlider.addEventListener("input", (e) => {
          e.stopPropagation();
          const vol = parseFloat(volumeSlider.value);
          if (this.controller) {
              this.controller.setAudioTrackVolume(track.id, vol);
          }
      });

      volumeSlider.addEventListener("click", e => e.stopPropagation());

      const muteBtn = document.createElement("button");
      muteBtn.className = "track-mute-btn";
      muteBtn.innerHTML = track.enabled ? ICONS.volumeHigh : ICONS.volumeMuted;
      muteBtn.title = track.enabled ? "Mute" : "Unmute";
      muteBtn.ariaLabel = muteBtn.title;

      muteBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          track.enabled = !track.enabled;
          // UI update is handled by the 'change' event listener on _audioTracks calling renderAudioMenu
          // but for immediate feedback we can update button here too, though renderAudioMenu will overwrite it.
      });

      item.appendChild(name);
      item.appendChild(volumeSlider);
      item.appendChild(muteBtn);

      this.audioMenu.appendChild(item);
    });
  }

  public get inputProps(): Record<string, any> | null {
    return this.pendingProps;
  }

  public set inputProps(val: Record<string, any> | null) {
    this.pendingProps = val;
    if (this.controller && val) {
      this.controller.setInputProps(val);
    }
  }

  connectedCallback() {
    this.setAttribute("tabindex", "0");
    this.iframe.addEventListener("load", this.handleIframeLoad);
    window.addEventListener("message", this.handleWindowMessage);
    this.addEventListener("keydown", this.handleKeydown);
    document.addEventListener("fullscreenchange", this.updateFullscreenUI);

    this.playPauseBtn.addEventListener("click", this.togglePlayPause);
    this.volumeBtn.addEventListener("click", this.toggleMute);
    this.volumeSlider.addEventListener("input", this.handleVolumeInput);
    this.audioBtn.addEventListener("click", this.toggleAudioMenu);
    this.settingsBtn.addEventListener("click", this.toggleSettingsMenu);
    document.addEventListener("click", this.closeMenusIfOutside);
    this.scrubber.addEventListener("input", this.handleScrubberInput);
    this.scrubber.addEventListener("mousedown", this.handleScrubStart);
    this.scrubber.addEventListener("change", this.handleScrubEnd);
    this.scrubber.addEventListener("touchstart", this.handleScrubStart, { passive: true });
    this.scrubber.addEventListener("touchend", this.handleScrubEnd);
    this.scrubber.addEventListener("touchcancel", this.handleScrubEnd);
    this.scrubberWrapper.addEventListener("mousemove", this.handleScrubberHover);
    this.scrubberWrapper.addEventListener("mouseleave", this.handleScrubberLeave);
    this.exportBtn.addEventListener("click", this.handleExportClick);
    this.fullscreenBtn.addEventListener("click", this.toggleFullscreen);
    this.pipBtn.addEventListener("click", () => this.togglePip());
    this.ccBtn.addEventListener("click", this.toggleCaptions);
    this.bigPlayBtn.addEventListener("click", this.handleBigPlayClick);
    this.pipVideo.addEventListener("enterpictureinpicture", this.onEnterPip);
    this.pipVideo.addEventListener("leavepictureinpicture", this.onLeavePip);
    this.posterContainer.addEventListener("click", this.handleBigPlayClick);

    this.closeDebugBtn.addEventListener("click", this.toggleDiagnostics);
    this.copyDebugBtn.addEventListener("click", this.handleCopyDebug);
    this.closeShortcutsBtn.addEventListener("click", this.toggleShortcutsOverlay);

    const slot = this.shadowRoot!.querySelector("slot");
    if (slot) {
        slot.addEventListener("slotchange", this.handleSlotChange);
        // Initial check
        this.handleSlotChange();
    }

    // Initial state: disabled until connected
    this.setControlsDisabled(true);

    // Ensure sandbox flags are correct on connect (handling if attribute was present before upgrade)
    const sandboxAttr = this.getAttribute("sandbox");
    const sandboxFlags = sandboxAttr === null ? "allow-scripts allow-same-origin" : sandboxAttr;
    if (this.iframe.getAttribute("sandbox") !== sandboxFlags) {
        this.iframe.setAttribute("sandbox", sandboxFlags);
    }

    // Only show connecting if we haven't already shown "Loading..." via attributeChangedCallback
    // AND we are not deferring load (pendingSrc is null)
    // AND we don't have a poster (which should take precedence visually)
    if (this.overlay.classList.contains("hidden") && !this.pendingSrc && !this.hasAttribute("poster")) {
        this.showStatus("Connecting...", false);
    }

    if (this.pendingSrc) {
       this.updatePosterVisibility();
    }

    // Ensure aspect ratio is correct on connect
    this.updateAspectRatio();

    this.updateControlsVisibility();
    this.resizeObserver.observe(this);
  }

  disconnectedCallback() {
    this.resizeObserver.disconnect();
    this.iframe.removeEventListener("load", this.handleIframeLoad);
    window.removeEventListener("message", this.handleWindowMessage);
    this.removeEventListener("keydown", this.handleKeydown);
    document.removeEventListener("fullscreenchange", this.updateFullscreenUI);
    this.playPauseBtn.removeEventListener("click", this.togglePlayPause);
    this.volumeBtn.removeEventListener("click", this.toggleMute);
    this.volumeSlider.removeEventListener("input", this.handleVolumeInput);
    this.audioBtn.removeEventListener("click", this.toggleAudioMenu);
    this.settingsBtn.removeEventListener("click", this.toggleSettingsMenu);
    document.removeEventListener("click", this.closeMenusIfOutside);
    this.scrubber.removeEventListener("input", this.handleScrubberInput);
    this.scrubber.removeEventListener("mousedown", this.handleScrubStart);
    this.scrubber.removeEventListener("change", this.handleScrubEnd);
    this.scrubber.removeEventListener("touchstart", this.handleScrubStart);
    this.scrubber.removeEventListener("touchend", this.handleScrubEnd);
    this.scrubber.removeEventListener("touchcancel", this.handleScrubEnd);
    this.scrubberWrapper.removeEventListener("mousemove", this.handleScrubberHover);
    this.scrubberWrapper.removeEventListener("mouseleave", this.handleScrubberLeave);
    this.exportBtn.removeEventListener("click", this.handleExportClick);
    this.fullscreenBtn.removeEventListener("click", this.toggleFullscreen);
    this.ccBtn.removeEventListener("click", this.toggleCaptions);
    this.bigPlayBtn.removeEventListener("click", this.handleBigPlayClick);
    this.pipVideo.removeEventListener("enterpictureinpicture", this.onEnterPip);
    this.pipVideo.removeEventListener("leavepictureinpicture", this.onLeavePip);
    this.posterContainer.removeEventListener("click", this.handleBigPlayClick);

    this.closeDebugBtn.removeEventListener("click", this.toggleDiagnostics);
    this.copyDebugBtn.removeEventListener("click", this.handleCopyDebug);
    this.closeShortcutsBtn.removeEventListener("click", this.toggleShortcutsOverlay);

    const slot = this.shadowRoot!.querySelector("slot");
    if (slot) {
        slot.removeEventListener("slotchange", this.handleSlotChange);
    }

    this.stopConnectionAttempts();

    if (this.unsubscribe) {
        this.unsubscribe();
    }
    if (this.mediaSession) {
        this.mediaSession.destroy();
        this.mediaSession = null;
    }

    if (this.controller) {
        this.controller.pause();
        this.controller.dispose();
    }
  }

  private loadIframe(src: string) {
    this._error = null;
    this._networkState = HeliosPlayer.NETWORK_LOADING;
    this._readyState = HeliosPlayer.HAVE_NOTHING;
    this._hasPlayed = false;
    this.dispatchEvent(new Event('loadstart'));

    this.iframe.src = src;
    this.isLoaded = true;
    if (this.controller) {
      this.controller.pause();
      this.controller.dispose();
      this.controller = null;
    }
    this.setControlsDisabled(true);
    // Only show status if no poster, to avoid flashing/overlaying
    if (!this.hasAttribute("poster")) {
      this.showStatus("Loading...", false);
    }
    this.updatePosterVisibility();
  }

  private handleBigPlayClick = () => {
     this.load();
     // If we are already loaded, just play
     if (this.controller) {
       this.controller.play();
     } else {
       // Set autoplay so the controller will play once connected
       this.setAttribute("autoplay", "");
     }
  }

  private updatePosterVisibility() {
    if (this.pendingSrc) {
      this.posterContainer.classList.remove("hidden");
      return;
    }

    if (this.hasAttribute("poster")) {
      if (this._hasPlayed) {
        this.posterContainer.classList.add("hidden");
      } else {
        this.posterContainer.classList.remove("hidden");
      }
    } else {
      this.posterContainer.classList.add("hidden");
    }
  }

  private setControlsDisabled(disabled: boolean) {
      this.playPauseBtn.disabled = disabled;
      this.volumeBtn.disabled = disabled;
      this.volumeSlider.disabled = disabled;
      this.scrubber.disabled = disabled;
      this.settingsBtn.disabled = disabled;
      this.fullscreenBtn.disabled = disabled;
      this.pipBtn.disabled = disabled;
      this.ccBtn.disabled = disabled;
      // Export is managed separately based on connection state
      if (disabled) {
          this.exportBtn.disabled = true;
      }
  }

  private lockPlaybackControls(locked: boolean) {
      this.playPauseBtn.disabled = locked;
      this.volumeBtn.disabled = locked;
      this.volumeSlider.disabled = locked;
      this.scrubber.disabled = locked;
      this.settingsBtn.disabled = locked;
      this.fullscreenBtn.disabled = locked;
      this.pipBtn.disabled = locked;
      this.ccBtn.disabled = locked;
  }

  private handleIframeLoad = () => {
    if (!this.iframe.contentWindow) return;
    this.startConnectionAttempts();
  };

  private startConnectionAttempts() {
    this.stopConnectionAttempts();

    // 1. Bridge Mode (Fire and forget, wait for message)
    // We send this immediately so if the iframe is listening it can respond.
    this.iframe.contentWindow?.postMessage({ type: 'HELIOS_CONNECT' }, '*');

    // 2. Direct Mode (Polling)
    const checkDirect = () => {
      let directInstance: Helios | undefined;
      try {
        directInstance = (this.iframe.contentWindow as any).helios as Helios | undefined;
      } catch (e) {
        // Access denied (Cross-origin)
      }

      if (directInstance) {
        console.log("HeliosPlayer: Connected via Direct Mode.");
        this.stopConnectionAttempts();
        this.hideStatus();
        this.directHelios = directInstance;
        this.setController(new DirectController(directInstance, this.iframe));
        this.exportBtn.disabled = false;
        return true;
      }
      return false;
    };

    // Check immediately to avoid unnecessary delay
    if (checkDirect()) return;

    // We poll because window.helios might be set asynchronously.
    const startTime = Date.now();
    this.connectionInterval = window.setInterval(() => {
        // If we connected via Bridge in the meantime, stop polling
        if (this.controller) {
            this.stopConnectionAttempts();
            return;
        }

        if (checkDirect()) return;

        // Connection Timeout Check (5000ms)
        if (Date.now() - startTime > 5000) {
             this.stopConnectionAttempts();
             if (!this.controller) {
                 const message = "Connection Timed Out";
                 const err = {
                     code: 4, // MEDIA_ERR_SRC_NOT_SUPPORTED
                     message: message,
                     MEDIA_ERR_ABORTED: 1,
                     MEDIA_ERR_NETWORK: 2,
                     MEDIA_ERR_DECODE: 3,
                     MEDIA_ERR_SRC_NOT_SUPPORTED: 4
                 };
                 this._error = err;
                 this._networkState = HeliosPlayer.NETWORK_NO_SOURCE;
                 this.dispatchEvent(new CustomEvent('error', { detail: err }));

                 this.showStatus("Connection Failed. Ensure window.helios is set or connectToParent() is called.", true);
             }
        }
    }, 100);
  }

  private stopConnectionAttempts() {
      if (this.connectionInterval) {
          window.clearInterval(this.connectionInterval);
          this.connectionInterval = null;
      }
  }

  private handleWindowMessage = (event: MessageEvent) => {
      if (event.source !== this.iframe.contentWindow) return;

      // Check if this message is a handshake response
      if (event.data?.type === 'HELIOS_READY') {
          // If we receive a ready signal, we stop polling for direct access
          this.stopConnectionAttempts();
          this.hideStatus();

          // If we already have a controller (e.g. Direct Mode), we might stick with it
          if (!this.controller) {
              console.log("HeliosPlayer: Connected via Bridge Mode.");
              const iframeWin = this.iframe.contentWindow;
              if (iframeWin) {
                  this.setController(new BridgeController(iframeWin, event.data.state));
                  // Ensure we get the latest state immediately if provided
                  if (event.data.state) {
                      this.updateUI(event.data.state);
                  }
                  // Enable export for bridge mode
                  this.exportBtn.disabled = false;
              }
          }
      }
  };

  private handleSlotChange = () => {
    const slot = this.shadowRoot!.querySelector("slot");
    if (!slot) return;

    const elements = slot.assignedElements();
    const currentTrackElements = new Set<HTMLTrackElement>();

    elements.forEach((el) => {
        if (el.tagName === "TRACK") {
            const t = el as HTMLTrackElement;
            currentTrackElements.add(t);

            // Prevent duplicate track creation
            if (this._domTracks.has(t)) return;

            const kind = t.getAttribute("kind") || "captions";
            const label = t.getAttribute("label") || "";
            const lang = t.getAttribute("srclang") || "";
            const src = t.getAttribute("src");
            const isDefault = t.hasAttribute("default");

            const textTrack = this.addTextTrack(kind, label, lang);
            this._domTracks.set(t, textTrack);

            if (isDefault) {
                this.showCaptions = true;
                this.ccBtn.classList.add("active");
            }

            if (src) {
                fetch(src)
                .then((res) => {
                    if (!res.ok) throw new Error(`Status ${res.status}`);
                    return res.text();
                })
                .then((content) => {
                    const cues = parseCaptions(content);
                    cues.forEach(c => {
                        textTrack.addCue(new CueClass(c.startTime, c.endTime, c.text));
                    });

                    if (isDefault) {
                        textTrack.mode = 'showing';
                    } else {
                        textTrack.mode = 'disabled';
                    }
                })
                .catch((err) => console.error("HeliosPlayer: Failed to load captions", err));
            }
        }
    });

    // Remove tracks that are no longer in the DOM
    for (const [el, track] of this._domTracks.entries()) {
        if (!currentTrackElements.has(el)) {
            if (track.mode === 'showing') {
                track.mode = 'hidden';
            }
            this._textTracks.removeTrack(track);
            this._domTracks.delete(el);
        }
    }

    this.updateCCButtonVisibility();
  };

  private setController(controller: HeliosController) {
      // Clean up old controller
      if (this.mediaSession) {
          this.mediaSession.destroy();
          this.mediaSession = null;
      }
      if (this.controller) {
          this.controller.dispose();
      }
      if (this.unsubscribe) {
          this.unsubscribe();
          this.unsubscribe = null;
      }

      this.controller = controller;
      this.mediaSession = new HeliosMediaSession(this, controller);

      // Check for pending captions
      this.handleSlotChange();

      // Update States
      this._networkState = HeliosPlayer.NETWORK_IDLE;
      this._readyState = HeliosPlayer.HAVE_ENOUGH_DATA;

      // Dispatch Lifecycle Events
      this.dispatchEvent(new Event('loadedmetadata'));
      this.dispatchEvent(new Event('loadeddata'));
      this.dispatchEvent(new Event('canplay'));
      this.dispatchEvent(new Event('canplaythrough'));

      this.setControlsDisabled(false);

      if (this.pendingProps) {
        this.controller.setInputProps(this.pendingProps);
      }

      // Apply persisted media properties
      this.controller.setAudioVolume(this._pendingVolume);
      this.controller.setPlaybackRate(this._pendingPlaybackRate);

      // Determine muted state: Explicit property set > Attribute
      const shouldMute = this._pendingMuted !== null ? this._pendingMuted : this.hasAttribute("muted");
      this.controller.setAudioMuted(shouldMute);

      if (this.hasAttribute("loop")) {
        this.controller.setLoop(true);
      }

      const state = this.controller.getState();
      if (state) {
          this.scrubber.max = String(state.duration * state.fps);
          this.updateUI(state);
      }

      const unsubState = this.controller.subscribe((s) => this.updateUI(s));

      const unsubMetering = this.controller.onAudioMetering((levels: AudioLevels) => {
        this.dispatchEvent(new CustomEvent('audiometering', { detail: levels }));
      });

      const unsubError = this.controller.onError((err) => {
        const message = err.message || String(err);
        this._error = {
          code: 4, // MEDIA_ERR_SRC_NOT_SUPPORTED as generic default
          message: message,
          MEDIA_ERR_ABORTED: 1,
          MEDIA_ERR_NETWORK: 2,
          MEDIA_ERR_DECODE: 3,
          MEDIA_ERR_SRC_NOT_SUPPORTED: 4
        };
        this.showStatus("Error: " + message, true, {
            label: "Reload",
            handler: () => this.retryConnection()
        });
        this.dispatchEvent(new CustomEvent('error', { detail: err }));
      });

      this.unsubscribe = () => {
        unsubState();
        unsubError();
        unsubMetering();
      };

      if (this.hasAttribute("autoplay")) {
        this.controller.play();
      }
  }

  private updateAspectRatio() {
    const w = parseFloat(this.getAttribute("width") || "");
    const h = parseFloat(this.getAttribute("height") || "");

    if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
      this.style.aspectRatio = `${w} / ${h}`;
    } else {
      this.style.removeProperty("aspect-ratio");
    }
  }

  private togglePlayPause = () => {
    if (!this.controller) return;
    const state = this.controller.getState();

    const isFinished = state.currentFrame >= state.duration * state.fps - 1;

    if (isFinished) {
      // Restart the animation
      this.controller.seek(0);
      this.controller.play();
    } else if (state.isPlaying) {
      this.controller.pause();
    } else {
      this.controller.play();
    }
  };

  private toggleMute = () => {
    if (!this.controller) return;
    const state = this.controller.getState();
    this.controller.setAudioMuted(!state.muted);
  };

  private handleVolumeInput = () => {
    if (!this.controller) return;
    const vol = parseFloat(this.volumeSlider.value);
    this.controller.setAudioVolume(vol);
    if (vol > 0) {
       this.controller.setAudioMuted(false);
    }
  };

  private handleScrubberInput = () => {
    const frame = parseInt(this.scrubber.value, 10);
    if (this.controller) {
      this.controller.seek(frame);
    }
  };

  private handleScrubStart = () => {
    if (!this.controller) return;
    this.isScrubbing = true;
    this.dispatchEvent(new Event("seeking"));
    const state = this.controller.getState();
    this.wasPlayingBeforeScrub = state.isPlaying;

    if (this.wasPlayingBeforeScrub) {
      this.controller.pause();
    }
  };

  private handleScrubEnd = () => {
    if (!this.controller) return;
    this.isScrubbing = false;
    this.dispatchEvent(new Event("seeked"));

    if (this.wasPlayingBeforeScrub) {
      this.controller.play();
    }
  };

  private handleScrubberHover = (e: MouseEvent) => {
    if (!this.controller) return;
    const state = this.controller.getState();
    const rect = this.scrubberWrapper.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const width = rect.width;
    const pct = Math.max(0, Math.min(1, offsetX / width));
    const time = pct * state.duration;

    this.scrubberTooltip.textContent = time.toFixed(2) + "s";
    this.scrubberTooltip.style.left = `${offsetX}px`;
    this.scrubberTooltip.classList.remove("hidden");
  };

  private handleScrubberLeave = () => {
    this.scrubberTooltip.classList.add("hidden");
  };

  private handleSpeedChange = () => {
     // Managed by Settings Menu now
  };

  private toggleCaptions = () => {
    this.showCaptions = !this.showCaptions;
    this.ccBtn.classList.toggle("active", this.showCaptions);
    if (this.controller) {
      this.updateUI(this.controller.getState());
    }
  };

  private toggleDiagnostics = async () => {
    if (this.debugOverlay.classList.contains('hidden')) {
        this.debugOverlay.classList.remove('hidden');
        this.debugContent.textContent = "Running diagnostics...";
        try {
            const report = await this.diagnose();
            this.debugContent.textContent = JSON.stringify(report, null, 2);
        } catch (e: any) {
            this.debugContent.textContent = "Error: " + (e.message || String(e));
        }
    } else {
        this.debugOverlay.classList.add('hidden');
    }
  }

  private toggleShortcutsOverlay = () => {
     if (this.shortcutsOverlay.classList.contains('hidden')) {
        this.renderShortcuts();
        this.shortcutsOverlay.classList.remove('hidden');
     } else {
        this.shortcutsOverlay.classList.add('hidden');
     }
  }

  private renderShortcuts() {
     const shortcuts = [
         { key: "Space / K", desc: "Play / Pause" },
         { key: "← / →", desc: "Seek 1 frame" },
         { key: "Shift + ← / →", desc: "Seek 10 frames" },
         { key: "Home", desc: "Go to start" },
         { key: "End", desc: "Go to end" },
         { key: "F", desc: "Toggle Fullscreen" },
         { key: "M", desc: "Mute" },
         { key: "C", desc: "Toggle Captions" },
         { key: "Shift + D", desc: "Toggle Diagnostics" },
         { key: "I", desc: "Set In Point" },
         { key: "O", desc: "Set Out Point" },
         { key: "X", desc: "Clear Range" },
         { key: "0-9", desc: "Seek to 0-90%" }
     ];

     this.shortcutsGrid.innerHTML = shortcuts.map(s => `
         <div class="shortcut-row">
            <span class="shortcut-desc">${s.desc}</span>
            <span class="shortcut-key">${s.key}</span>
         </div>
     `).join("");
  }

  private handleCopyDebug = () => {
    const text = this.debugContent.textContent || "";
    navigator.clipboard.writeText(text).then(() => {
        const originalText = this.copyDebugBtn.textContent;
        this.copyDebugBtn.textContent = "Copied!";
        setTimeout(() => {
            this.copyDebugBtn.textContent = originalText;
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy diagnostics:', err);
    });
  }

  private handleKeydown = (e: KeyboardEvent) => {
    if (this.isExporting) return;

    if (e.key === "Escape") {
      if (!this.audioMenu.classList.contains("hidden")) {
        e.stopPropagation();
        this.closeAudioMenu();
        this.audioBtn.focus();
      }
      if (!this.settingsMenu.classList.contains("hidden")) {
          e.stopPropagation();
          this.closeSettingsMenu();
          this.settingsBtn.focus();
      }
      if (!this.exportMenu.classList.contains("hidden")) {
          e.stopPropagation();
          this.closeExportMenu();
          this.exportBtn.focus();
      }
      if (!this.shortcutsOverlay.classList.contains("hidden")) {
          e.stopPropagation();
          this.toggleShortcutsOverlay();
      }
      return;
    }

    // Allow bubbling from children (like buttons), but ignore inputs
    const target = e.composedPath()[0] as HTMLElement;
    if (target && target.tagName) {
      const tagName = target.tagName.toLowerCase();
      if (tagName === "input" || tagName === "select" || tagName === "textarea") {
        return;
      }
      // If focusing a button, Space triggers click natively. Avoid double toggle.
      if (e.key === " " && tagName === "button") {
        return;
      }
    }

    if (!this.controller) return;

    switch (e.key) {
      case " ":
      case "k":
      case "K":
        e.preventDefault(); // Prevent scrolling
        this.togglePlayPause();
        break;
      case "c":
      case "C":
        this.toggleCaptions();
        break;
      case "f":
      case "F":
        this.toggleFullscreen();
        break;
      case "d":
      case "D":
        if (e.shiftKey) {
            this.toggleDiagnostics();
        }
        break;
      case "?":
        this.toggleShortcutsOverlay();
        break;
      case "ArrowRight":
        this.seekRelativeSeconds(e.shiftKey ? 10 : 5);
        break;
      case "l":
      case "L":
        this.seekRelativeSeconds(10);
        break;
      case "ArrowLeft":
        this.seekRelativeSeconds(e.shiftKey ? -10 : -5);
        break;
      case "j":
      case "J":
        this.seekRelativeSeconds(-10);
        break;
      case "Home":
        e.preventDefault();
        this.controller.seek(0);
        break;
      case "End":
        e.preventDefault();
        {
          const s = this.controller.getState();
          const totalFrames = s.duration * s.fps;
          this.controller.seek(Math.floor(totalFrames));
        }
        break;
      case "m":
      case "M":
        this.toggleMute();
        break;
      case ".":
        this.seekRelative(1);
        break;
      case ",":
        this.seekRelative(-1);
        break;
      case "i":
      case "I": {
        const s = this.controller.getState();
        const start = Math.floor(s.currentFrame);
        const totalFrames = s.duration * s.fps;
        let end = s.playbackRange ? s.playbackRange[1] : totalFrames;

        if (start >= end) {
          end = totalFrames;
        }
        this.controller.setPlaybackRange(start, end);
        break;
      }
      case "o":
      case "O": {
        const s = this.controller.getState();
        const end = Math.floor(s.currentFrame);
        let start = s.playbackRange ? s.playbackRange[0] : 0;

        if (end <= start) {
          start = 0;
        }
        this.controller.setPlaybackRange(start, end);
        break;
      }
      case "x":
      case "X":
        this.controller.clearPlaybackRange();
        break;
      default:
        // Handle 0-9 seeking
        if (e.key >= "0" && e.key <= "9") {
          e.preventDefault();
          const digit = parseInt(e.key, 10);
          const s = this.controller.getState();
          const totalFrames = s.duration * s.fps;
          // Seek to percentage: digit * 10%
          this.controller.seek(Math.floor(totalFrames * (digit / 10)));
        }
        break;
    }
  };

  private seekRelative(frames: number) {
    if (!this.controller) return;
    const state = this.controller.getState();
    const newFrame = Math.max(0, Math.min(Math.floor(state.duration * state.fps), state.currentFrame + frames));
    this.controller.seek(newFrame);
  }

  private seekRelativeSeconds(seconds: number) {
    if (!this.controller) return;
    const state = this.controller.getState();
    if (state.fps) {
      this.seekRelative(Math.round(seconds * state.fps));
    }
  }

  private toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      this.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  private updateFullscreenUI = () => {
    if (document.fullscreenElement === this) {
       this.fullscreenBtn.innerHTML = ICONS.exitFullscreen;
       this.fullscreenBtn.title = "Exit Fullscreen";
    } else {
       this.fullscreenBtn.innerHTML = ICONS.fullscreen;
       this.fullscreenBtn.title = "Fullscreen";
    }
  };

  private updateUI(state: any) {
      // Sync Audio Tracks
      if (state.availableAudioTracks) {
          const metadataTracks: any[] = state.availableAudioTracks;
          const currentIds = new Set(metadataTracks.map(t => t.id));

          // 1. Add new tracks
          metadataTracks.forEach(meta => {
              let track = this._audioTracks.getTrackById(meta.id);
              if (!track) {
                  // Default enabled=true unless explicitly muted in state
                  const isMuted = state.audioTracks && state.audioTracks[meta.id] ? state.audioTracks[meta.id].muted : false;
                  track = new HeliosAudioTrack(
                      meta.id,
                      meta.kind || "", // Kind
                      meta.label || meta.id, // Label
                      meta.language || "", // Language
                      !isMuted, // Enabled
                      this
                  );
                  this._audioTracks.addTrack(track);
              } else {
                  // Update enabled state if changed externally
                  const isMuted = state.audioTracks && state.audioTracks[meta.id] ? state.audioTracks[meta.id].muted : false;
                  if (track.enabled !== !isMuted) {
                      track._setEnabledInternal(!isMuted);
                      this._audioTracks.dispatchChangeEvent();
                  }
              }
          });

          // 2. Remove old tracks
          const tracksToRemove: HeliosAudioTrack[] = [];
          for (const track of this._audioTracks) {
              if (!currentIds.has(track.id)) {
                  tracksToRemove.push(track);
              }
          }
          tracksToRemove.forEach(t => this._audioTracks.removeTrack(t));
      }

      // Update text tracks active cues
      if (state.fps) {
          const currentTime = state.currentFrame / state.fps;
          for (const track of this._textTracks) {
              track.updateActiveCues(currentTime);
          }
      }

      // Update hasPlayed state
      if (state.isPlaying || state.currentFrame > 0) {
        this._hasPlayed = true;
      }

      // Consolidate poster visibility
      this.updatePosterVisibility();

      // Event Dispatching
      if (this.lastState) {
        if (state.isPlaying !== this.lastState.isPlaying) {
          this.dispatchEvent(new Event(state.isPlaying ? "play" : "pause"));
        }

        const wasFinished = this.lastState.currentFrame >= this.lastState.duration * this.lastState.fps - 1;
        const isFinishedNow = state.currentFrame >= state.duration * state.fps - 1;
        if (!wasFinished && isFinishedNow && !state.isPlaying) {
             this.dispatchEvent(new Event("ended"));
        }

        if (state.currentFrame !== this.lastState.currentFrame) {
             this.dispatchEvent(new Event("timeupdate"));
        }

        if (state.volume !== this.lastState.volume || state.muted !== this.lastState.muted) {
            this.dispatchEvent(new Event("volumechange"));
        }

        if (state.playbackRate !== this.lastState.playbackRate) {
            this.dispatchEvent(new Event("ratechange"));
        }

        if (state.duration !== this.lastState.duration) {
            this.dispatchEvent(new Event("durationchange"));
        }

        const widthChanged = state.width !== this.lastState.width;
        const heightChanged = state.height !== this.lastState.height;
        if (widthChanged || heightChanged) {
            this.dispatchEvent(new Event("resize"));
        }
      }

      const isFinished = state.currentFrame >= state.duration * state.fps - 1;

      if (isFinished) {
        this.playPauseBtn.innerHTML = ICONS.replay; // Restart button
        this.playPauseBtn.setAttribute("aria-label", "Restart");
      } else {
        this.playPauseBtn.innerHTML = state.isPlaying ? ICONS.pause : ICONS.play;
        this.playPauseBtn.setAttribute("aria-label", state.isPlaying ? "Pause" : "Play");
      }

      const isMuted = state.muted || state.volume === 0;
      let volIcon = ICONS.volumeHigh;
      if (isMuted) {
          volIcon = ICONS.volumeMuted;
      } else if (state.volume < 0.5) {
          volIcon = ICONS.volumeLow;
      }
      this.volumeBtn.innerHTML = volIcon;
      this.volumeBtn.setAttribute("aria-label", isMuted ? "Unmute" : "Mute");
      this.volumeSlider.value = String(state.volume !== undefined ? state.volume : 1);

      if (!this.isScrubbing) {
        this.scrubber.value = String(state.currentFrame);
      }
      const currentTime = (state.currentFrame / state.fps).toFixed(2);
      const totalTime = state.duration.toFixed(2);

      this.timeDisplay.textContent = `${currentTime} / ${totalTime}`;

      this.scrubber.setAttribute("aria-valuenow", String(state.currentFrame));
      this.scrubber.setAttribute("aria-valuemin", "0");
      this.scrubber.setAttribute("aria-valuemax", String(state.duration * state.fps));
      this.scrubber.setAttribute("aria-valuetext", `${currentTime} of ${totalTime} seconds`);

      // Update speed in settings menu (if open)
      // Since it's a select element, we can find it and update
      if (!this.settingsMenu.classList.contains("hidden")) {
          const select = this.settingsMenu.querySelector("select");
          if (select && state.playbackRate !== undefined && document.activeElement !== select) {
               select.value = String(state.playbackRate);
          }
      }

      // Update Markers
      const markersChanged = !this.lastState || state.markers !== this.lastState.markers;
      if (markersChanged) {
        this.markersContainer.innerHTML = "";
        if (state.markers && state.duration > 0) {
          state.markers.forEach((marker: any) => {
            const pct = (marker.time / state.duration) * 100;
            if (pct >= 0 && pct <= 100) {
              const el = document.createElement("div");
              el.className = "marker";
              el.style.left = `${pct}%`;
              if (marker.color) el.style.backgroundColor = marker.color;
              el.title = marker.label || "";

              el.addEventListener("click", (e) => {
                e.stopPropagation();
                if (this.controller) {
                  this.controller.seek(Math.floor(marker.time * state.fps));
                }
              });

              this.markersContainer.appendChild(el);
            }
          });
        }
      }

      if (state.playbackRange) {
        const totalFrames = state.duration * state.fps;
        if (totalFrames > 0) {
          const [start, end] = state.playbackRange;
          const startPct = (start / totalFrames) * 100;
          const endPct = (end / totalFrames) * 100;

          this.scrubber.style.background = `linear-gradient(to right,
            var(--helios-range-unselected-color) 0%,
            var(--helios-range-unselected-color) ${startPct}%,
            var(--helios-range-selected-color) ${startPct}%,
            var(--helios-range-selected-color) ${endPct}%,
            var(--helios-range-unselected-color) ${endPct}%,
            var(--helios-range-unselected-color) 100%
          )`;
        } else {
          this.scrubber.style.background = '';
        }
      } else {
        this.scrubber.style.background = '';
      }

      const active = state.activeCaptions || [];
      const newHash = this.showCaptions ? active.map((c: any) => c.text).join("|||") : "HIDDEN";

      if (newHash !== this.lastCaptionsHash) {
        this.captionsContainer.innerHTML = '';
        if (this.showCaptions && active.length > 0) {
          active.forEach((cue: any) => {
            const div = document.createElement('div');
            div.className = 'caption-cue';
            div.textContent = cue.text;
            this.captionsContainer.appendChild(div);
          });
        }
        this.lastCaptionsHash = newHash;
      }

      this.lastState = state;
  }

  // --- Loading / Error UI Helpers ---

  private showStatus(msg: string, isError: boolean, action?: { label: string, handler: () => void }) {
    this.overlay.classList.remove("hidden");
    this.statusText.textContent = msg;
    this.retryBtn.style.display = isError ? "block" : "none";

    if (action) {
      this.retryBtn.textContent = action.label;
      this.retryAction = action.handler;
    } else {
      this.retryBtn.textContent = "Retry";
      this.retryAction = () => this.retryConnection();
    }

    // Optional: Add visual distinction for errors beyond just the button
    this.statusText.classList.toggle('error-msg', isError);
  }

  private hideStatus() {
    this.overlay.classList.add("hidden");
  }

  public getController(): HeliosController | null {
    return this.controller;
  }

  public async getSchema(): Promise<HeliosSchema | undefined> {
    if (this.controller) {
      return this.controller.getSchema();
    }
    return undefined;
  }

  public async export(options: HeliosExportOptions = {}): Promise<void> {
     if (this.isExporting) throw new Error("Already exporting");
     if (!this.controller) throw new Error("Not connected");

     this.isExporting = true;
     this.lockPlaybackControls(true);

     try {
         const parseNum = (attr: string): number | undefined => {
             const val = parseFloat(this.getAttribute(attr) || '');
             return !isNaN(val) && val > 0 ? val : undefined;
         };

         // Merge options with attributes (options take precedence)
         const finalOptions = {
             mode: options.mode || (this.getAttribute('export-mode') as any) || 'auto',
             format: options.format || (this.getAttribute('export-format') as any) || 'mp4',
             filename: options.filename || this.getAttribute('export-filename') || 'video',
             width: options.width ?? parseNum('export-width'),
             height: options.height ?? parseNum('export-height'),
             bitrate: options.bitrate ?? parseNum('export-bitrate'),
             canvasSelector: options.canvasSelector || this.getAttribute('canvas-selector') || 'canvas',
             includeCaptions: options.includeCaptions ?? this.showCaptions,
             onProgress: options.onProgress || (() => {}),
             signal: options.signal,
             captionStyle: options.captionStyle
         };

         // Handle export-caption-mode='file' logic if not explicitly overridden by options
         // If options.includeCaptions is undefined, we use this.showCaptions.
         // If attribute logic applies, we might want to disable includeCaptions for burning.
         // The original logic was: if captionMode === 'file' && showCaptions, save file and don't burn.
         // We should respect that if options didn't explicit set includeCaptions.

         const captionMode = (this.getAttribute("export-caption-mode") || "burn-in") as "burn-in" | "file";

         // If options.includeCaptions IS set, we respect it strictly for burning.
         // If it is NOT set, we check the caption mode.

         const exporter = new ClientSideExporter(this.controller);

         if (options.includeCaptions === undefined && this.showCaptions && captionMode === 'file') {
             // Side effect: save captions file
             const showingTrack = Array.from(this._textTracks).find(t => t.mode === 'showing' && t.kind === 'captions');
             if (showingTrack) {
                const cues = Array.from(showingTrack.cues).map((cue: any) => ({
                  startTime: cue.startTime,
                  endTime: cue.endTime,
                  text: cue.text
                }));
                exporter.saveCaptionsAsSRT(cues, `${finalOptions.filename}.srt`);
             }
             finalOptions.includeCaptions = false;
         }

         // Extract computed styles for captions
         if (finalOptions.includeCaptions) {
             const computedStyle = getComputedStyle(this);
             finalOptions.captionStyle = {
                 color: computedStyle.getPropertyValue('--helios-caption-color').trim() || 'white',
                 backgroundColor: computedStyle.getPropertyValue('--helios-caption-bg').trim() || 'rgba(0, 0, 0, 0.7)',
                 fontFamily: computedStyle.getPropertyValue('--helios-caption-font-family').trim() || 'sans-serif',
                 scale: parseFloat(computedStyle.getPropertyValue('--helios-caption-scale').trim()) || 0.05
             };
         }

         await exporter.export(finalOptions);
     } finally {
         this.isExporting = false;
         this.lockPlaybackControls(false);
     }
  }

  public async diagnose(): Promise<DiagnosticReport> {
    if (!this.controller) {
        throw new Error("Cannot run diagnostics: Player is not connected.");
    }
    return this.controller.diagnose();
  }

  public startAudioMetering() {
    if (this.controller) {
      this.controller.startAudioMetering();
    }
  }

  public stopAudioMetering() {
    if (this.controller) {
      this.controller.stopAudioMetering();
    }
  }

  private retryConnection() {
    this.showStatus("Retrying...", false);
    // Reload iframe to force fresh start
    this.load();
  }

  private handleExportClick = (e: MouseEvent) => {
    // If we are already exporting, this is a cancel request
    if (this.abortController) {
      this.abortController.abort();
      // Cleanup is handled in startExportFromMenu finally block
      return;
    }

    // Export requires Controller (Direct or Bridge)
    if (!this.controller) {
        console.error("Export not available: Not connected.");
        return;
    }

    this.toggleExportMenu(e);
  };
}

if (!customElements.get("helios-player")) {
  customElements.define("helios-player", HeliosPlayer);
}
