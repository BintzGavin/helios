export interface RenderJobChunk {
  id: number;
  startFrame: number;
  frameCount: number;
  outputFile: string;
  command: string;
}

export interface JobSpec {
  metadata: {
    totalFrames: number;
    fps: number;
    width: number;
    height: number;
    duration: number;
  };
  chunks: RenderJobChunk[];
  mergeCommand: string;
}
