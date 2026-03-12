import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import { registerMergeCommand } from '../merge.js';
import { concatenateVideos } from '@helios-project/renderer';
import { transcodeMerge } from '../../utils/ffmpeg.js';
import path from 'path';

vi.mock('@helios-project/renderer', () => ({
  concatenateVideos: vi.fn(),
}));

vi.mock('../../utils/ffmpeg.js', () => ({
  transcodeMerge: vi.fn(),
}));

describe('helios merge command', () => {
  let program: Command;
  let logSpy: any;
  let errorSpy: any;
  let exitSpy: any;

  beforeEach(() => {
    program = new Command();
    registerMergeCommand(program);

    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should parse arguments and call concatenateVideos when no transcoding flags are present', async () => {
    await program.parseAsync(['node', 'test', 'merge', 'output.mp4', 'input1.mp4', 'input2.mp4']);

    expect(concatenateVideos).toHaveBeenCalledWith(
      [path.resolve(process.cwd(), 'input1.mp4'), path.resolve(process.cwd(), 'input2.mp4')],
      path.resolve(process.cwd(), 'output.mp4')
    );
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Merge complete'));
    expect(transcodeMerge).not.toHaveBeenCalled();
  });

  it('should throw an error and exit with code 1 if no inputs are provided', async () => {
    await program.parseAsync(['node', 'test', 'merge', 'output.mp4']);

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('No input files provided'));
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(concatenateVideos).not.toHaveBeenCalled();
  });

  it('should call transcodeMerge when transcoding flags are provided', async () => {
    await program.parseAsync([
      'node', 'test', 'merge', 'output.mp4', 'input1.mp4', '--video-codec', 'libx264', '--quality', '23'
    ]);

    expect(transcodeMerge).toHaveBeenCalledWith(
      [path.resolve(process.cwd(), 'input1.mp4')],
      path.resolve(process.cwd(), 'output.mp4'),
      {
        videoCodec: 'libx264',
        audioCodec: undefined,
        quality: '23',
        preset: undefined
      }
    );
    expect(concatenateVideos).not.toHaveBeenCalled();
  });

  it('should handle errors thrown by concatenateVideos and exit with 1', async () => {
    vi.mocked(concatenateVideos).mockRejectedValueOnce(new Error('Mock renderer error'));

    await program.parseAsync(['node', 'test', 'merge', 'output.mp4', 'input1.mp4']);

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Merge failed: Mock renderer error'));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
