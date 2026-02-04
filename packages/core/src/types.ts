import { HeliosSchema } from './schema.js';
import { AudioTrackMetadata } from './drivers/index.js';
import { CaptionCue } from './captions.js';
import { Marker } from './markers.js';

export type AudioTrackState = {
  volume: number;
  muted: boolean;
};

export interface HeliosConfig<TInputProps = Record<string, any>> {
  width?: number;
  height?: number;
  initialFrame?: number;
  duration: number; // in seconds
  fps: number;
  loop?: boolean;
  playbackRange?: [number, number];
  autoSyncAnimations?: boolean;
  inputProps?: TInputProps;
  schema?: HeliosSchema;
  playbackRate?: number;
  volume?: number;
  muted?: boolean;
  audioTracks?: Record<string, AudioTrackState>;
  availableAudioTracks?: AudioTrackMetadata[];
  captions?: string | CaptionCue[];
  markers?: Marker[];
}

export interface HeliosClip {
  id: string;
  source: string;
  start: number;
  duration: number;
  track?: number;
  props?: Record<string, any>;
}

export interface HeliosTrack {
  id: string;
  name?: string;
  clips: HeliosClip[];
}

export interface HeliosTimeline {
  tracks: HeliosTrack[];
}

export interface HeliosComposition<TInputProps = Record<string, any>> extends HeliosConfig<TInputProps> {
  timeline?: HeliosTimeline;
}
