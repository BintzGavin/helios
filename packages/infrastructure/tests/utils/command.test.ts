import { describe, it, expect } from 'vitest';
import { parseCommand } from '../../src/utils/command.js';

describe('parseCommand', () => {
  it('should parse simple commands', () => {
    const { command, args } = parseCommand('ffmpeg -i input.mp4 -c copy out.mp4');
    expect(command).toBe('ffmpeg');
    expect(args).toEqual(['-i', 'input.mp4', '-c', 'copy', 'out.mp4']);
  });

  it('should parse commands with double quotes', () => {
    const { command, args } = parseCommand('ffmpeg -i "my file.mp4" -c copy "out file.mp4"');
    expect(command).toBe('ffmpeg');
    expect(args).toEqual(['-i', 'my file.mp4', '-c', 'copy', 'out file.mp4']);
  });

  it('should parse commands with single quotes', () => {
    const { command, args } = parseCommand("ffmpeg -i 'my file.mp4' -c copy 'out file.mp4'");
    expect(command).toBe('ffmpeg');
    expect(args).toEqual(['-i', 'my file.mp4', '-c', 'copy', 'out file.mp4']);
  });

  it('should handle extra whitespace', () => {
    const { command, args } = parseCommand('  ffmpeg   -i    input.mp4   ');
    expect(command).toBe('ffmpeg');
    expect(args).toEqual(['-i', 'input.mp4']);
  });

  it('should throw on empty string', () => {
    expect(() => parseCommand('')).toThrow('Command string cannot be empty');
    expect(() => parseCommand('   ')).toThrow('Command string cannot be empty');
  });

  it('should handle nested quotes (basic support)', () => {
    // Note: the current basic parseCommand might not handle this perfectly,
    // but we can test its behavior or improve the regex.
    const { command, args } = parseCommand('ffmpeg -metadata title="My \'Awesome\' Video"');
    expect(command).toBe('ffmpeg');
    expect(args).toEqual(['-metadata', "title=My 'Awesome' Video"]);
  });
});
