import type { HeliosSchema, CaptionCue, Marker, AudioTrackMetadata } from '@helios-project/core';

export interface CompositionMetadata {
  width: number;
  height: number;
  fps: number;
  duration: number;
}

export interface TemplateInfo {
  id: string;
  label: string;
}

export interface Composition {
  id: string;
  name: string;
  url: string;
  thumbnailUrl?: string;
  description?: string;
  metadata?: CompositionMetadata;
}

export interface Asset {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video' | 'audio' | 'font' | 'model' | 'json' | 'shader' | 'other';
  relativePath: string;
}

export interface RenderConfig {
  mode: 'canvas' | 'dom';
  videoBitrate?: string;
  videoCodec?: string;
}

export interface RenderJob {
  id: string;
  status: 'queued' | 'rendering' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-1
  compositionId: string;
  outputPath?: string;
  outputUrl?: string;
  error?: string;
  createdAt: number;
  inPoint?: number;
  outPoint?: number;
}

export interface AudioAsset {
  id: string;
  buffer: ArrayBuffer;
  mimeType: string | null;
  volume?: number;
  muted?: boolean;
  loop?: boolean;
  startTime?: number;
  fadeInDuration?: number;
  fadeOutDuration?: number;
}

export interface PlayerState {
  currentFrame: number;
  duration: number;
  fps: number;
  playbackRate: number;
  isPlaying: boolean;
  volume: number;
  muted: boolean;
  inputProps: Record<string, any>;
  schema?: HeliosSchema;
  captions: CaptionCue[];
  markers: Marker[];
  audioTracks: Record<string, { volume: number; muted: boolean }>;
  availableAudioTracks: AudioTrackMetadata[];
}
