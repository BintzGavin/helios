export interface RenderJobChunk {
  id: number;
  startFrame: number;
  frameCount: number;
  outputFile: string;
  command: string;
}

export interface RenderJobMetadata {
  totalFrames: number;
  fps: number;
  width: number;
  height: number;
  duration: number;
}

export interface JobSpec {
  metadata: RenderJobMetadata;
  chunks: RenderJobChunk[];
  mergeCommand: string;
}
