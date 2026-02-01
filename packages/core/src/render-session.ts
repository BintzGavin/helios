import type { Helios } from './Helios.js';

export interface RenderSessionOptions {
  startFrame: number;
  endFrame: number;
  abortSignal?: AbortSignal;
}

export class RenderSession implements AsyncIterable<number> {
  constructor(
    private helios: Helios,
    private options: RenderSessionOptions
  ) {
    if (options.startFrame < 0) {
      throw new Error(`Invalid startFrame: ${options.startFrame}. Must be non-negative.`);
    }
    if (options.endFrame < options.startFrame) {
      throw new Error(
        `Invalid range: startFrame (${options.startFrame}) > endFrame (${options.endFrame}).`
      );
    }
  }

  async *[Symbol.asyncIterator](): AsyncIterator<number> {
    const { startFrame, endFrame, abortSignal } = this.options;

    // Check aborted before starting
    if (abortSignal?.aborted) {
      return;
    }

    for (let frame = startFrame; frame <= endFrame; frame++) {
      if (abortSignal?.aborted) {
        return;
      }

      this.helios.seek(frame);
      await this.helios.waitUntilStable();

      // Check aborted after waiting (in case it was aborted during wait)
      if (abortSignal?.aborted) {
        return;
      }

      yield frame;
    }
  }
}
