export interface AudioTrackMetadata {
  id: string;
  src: string;
  startTime: number;
  duration: number;
  fadeInDuration?: number;
  fadeOutDuration?: number;
}

export interface DriverMetadata {
  audioTracks?: AudioTrackMetadata[];
}

export interface TimeDriver {
  init(scope: unknown): void;
  update(timeInMs: number, options?: {
    isPlaying: boolean;
    playbackRate: number;
    volume?: number;
    muted?: boolean;
    audioTracks?: Record<string, { volume: number; muted: boolean }>;
  }): void;
  waitUntilStable(): Promise<void>;
  dispose?(): void;
  subscribeToMetadata?(callback: (meta: DriverMetadata) => void): () => void;
  getAudioContext?(): Promise<unknown>;
  getAudioSourceNode?(trackId: string): Promise<unknown>;
}
