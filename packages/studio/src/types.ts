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
