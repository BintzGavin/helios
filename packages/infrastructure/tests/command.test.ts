import { describe, it, expect } from 'vitest';
import { parseCommand } from '../src/utils/command';

describe('parseCommand', () => {
  it('should parse simple commands', () => {
    const { command, args } = parseCommand('npm run test');
    expect(command).toBe('npm');
    expect(args).toEqual(['run', 'test']);
  });

  it('should handle extra spaces', () => {
    const { command, args } = parseCommand('  npm   run    test  ');
    expect(command).toBe('npm');
    expect(args).toEqual(['run', 'test']);
  });

  it('should throw on empty string', () => {
    expect(() => parseCommand('')).toThrow('Command string cannot be empty');
    expect(() => parseCommand('   ')).toThrow('Command string cannot be empty');
  });

  it('should handle double quotes', () => {
    const { command, args } = parseCommand('node script.js "hello world" arg2');
    expect(command).toBe('node');
    expect(args).toEqual(['script.js', 'hello world', 'arg2']);
  });

  it('should handle single quotes', () => {
    const { command, args } = parseCommand("node script.js 'hello world' arg2");
    expect(command).toBe('node');
    expect(args).toEqual(['script.js', 'hello world', 'arg2']);
  });

  it('should handle mixed quotes', () => {
    const { command, args } = parseCommand(`ffmpeg -i input.mp4 -metadata title="My Render's Title" output.mp4`);
    expect(command).toBe('ffmpeg');
    expect(args).toEqual(['-i', 'input.mp4', '-metadata', "title=My Render's Title", 'output.mp4']);
  });

  it('should handle escaped quotes', () => {
    const { command, args } = parseCommand('echo "He said \\"Hello\\""');
    expect(command).toBe('echo');
    expect(args).toEqual(['He said "Hello"']);
  });

  it('should handle escaped characters', () => {
    const { command, args } = parseCommand('echo a\\ b c');
    expect(command).toBe('echo');
    expect(args).toEqual(['a b', 'c']);
  });

  it('should handle quotes within words', () => {
    const { command, args } = parseCommand('echo key="value with spaces"');
    expect(command).toBe('echo');
    expect(args).toEqual(['key=value with spaces']);
  });

  it('should handle explicit empty strings', () => {
    const { command, args } = parseCommand('cmd "" ""');
    expect(command).toBe('cmd');
    expect(args).toEqual(['', '']);
  });

  it('should handle single quoted explicit empty strings', () => {
    const { command, args } = parseCommand("cmd '' ''");
    expect(command).toBe('cmd');
    expect(args).toEqual(['', '']);
  });
});
