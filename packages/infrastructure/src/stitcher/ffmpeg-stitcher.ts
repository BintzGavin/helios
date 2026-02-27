import { writeFile, unlink } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { WorkerAdapter } from '../types/adapter.js';
import { LocalWorkerAdapter } from '../adapters/local-adapter.js';

export interface VideoStitcher {
  stitch(inputs: string[], output: string): Promise<void>;
}

export class FfmpegStitcher implements VideoStitcher {
  private adapter: WorkerAdapter;

  constructor(adapter?: WorkerAdapter) {
    this.adapter = adapter || new LocalWorkerAdapter();
  }

  async stitch(inputs: string[], output: string): Promise<void> {
    if (inputs.length === 0) {
      throw new Error('No input files provided for stitching');
    }

    // Create a temporary file for the concat list
    // Use absolute paths to ensure ffmpeg finds them
    const listContent = inputs.map(f => `file '${resolve(f)}'`).join('\n');
    const listFileName = `concat-${randomUUID()}.txt`;
    const listPath = join(tmpdir(), listFileName);

    try {
      await writeFile(listPath, listContent, 'utf-8');

      // Run ffmpeg
      // ffmpeg -f concat -safe 0 -i listPath -c copy output -y
      const result = await this.adapter.execute({
        command: 'ffmpeg',
        args: [
          '-f', 'concat',
          '-safe', '0',
          '-i', listPath,
          '-c', 'copy',
          output,
          '-y' // Overwrite output
        ]
      });

      if (result.exitCode !== 0) {
        throw new Error(`FFmpeg stitching failed with exit code ${result.exitCode}: ${result.stderr}`);
      }

    } finally {
      // Cleanup
      try {
        await unlink(listPath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }
}
