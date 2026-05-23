import { describe, it, expect } from 'vitest';
import type { RenderJobChunk, RenderJobMetadata, JobSpec } from '../job';

describe('Job Types Structural Tests', () => {
  it('should construct a valid RenderJobChunk', () => {
    const chunk: RenderJobChunk = {
      id: 1,
      startFrame: 0,
      frameCount: 60,
      outputFile: 'output.mp4',
      command: 'helios render --chunk'
    };

    expect(chunk).toBeDefined();
    expect(chunk.id).toBeTypeOf('number');
    expect(chunk.startFrame).toBeTypeOf('number');
    expect(chunk.frameCount).toBeTypeOf('number');
    expect(chunk.outputFile).toBeTypeOf('string');
    expect(chunk.command).toBeTypeOf('string');
  });

  it('should construct a valid RenderJobMetadata', () => {
    const metadata: RenderJobMetadata = {
      totalFrames: 120,
      fps: 30,
      width: 1920,
      height: 1080,
      duration: 4
    };

    expect(metadata).toBeDefined();
    expect(metadata.totalFrames).toBeTypeOf('number');
    expect(metadata.fps).toBeTypeOf('number');
    expect(metadata.width).toBeTypeOf('number');
    expect(metadata.height).toBeTypeOf('number');
    expect(metadata.duration).toBeTypeOf('number');
  });

  it('should construct a valid JobSpec', () => {
    const spec: JobSpec = {
      metadata: {
        totalFrames: 120,
        fps: 30,
        width: 1920,
        height: 1080,
        duration: 4
      },
      chunks: [
        {
          id: 1,
          startFrame: 0,
          frameCount: 60,
          outputFile: 'output1.mp4',
          command: 'helios render --chunk 1'
        }
      ],
      mergeCommand: 'helios merge'
    };

    expect(spec).toBeDefined();
    expect(spec.metadata).toBeTypeOf('object');
    expect(spec.chunks).toBeInstanceOf(Array);
    expect(spec.mergeCommand).toBeTypeOf('string');
  });
});
