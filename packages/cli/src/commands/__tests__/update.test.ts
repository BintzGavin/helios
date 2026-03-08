import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerUpdateCommand } from '../update.js';
import { Command } from 'commander';
import readline from 'readline';
import * as configUtil from '../../utils/config.js';
import * as installUtil from '../../utils/install.js';
import { RegistryClient } from '../../registry/client.js';

vi.mock('readline', () => {
  return {
    default: {
      createInterface: vi.fn(),
    },
  };
});

vi.mock('../../utils/config.js');
vi.mock('../../utils/install.js');
vi.mock('../../registry/client.js');

describe('update command', () => {
  let program: Command;
  let exitSpy: any;

  beforeEach(() => {
    program = new Command();
    registerUpdateCommand(program);
    vi.resetAllMocks();
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);

    vi.mocked(configUtil.loadConfig).mockReturnValue({
      version: '1.0.0',
      framework: 'react',
      directories: { components: 'src/components', lib: 'src/lib' },
      components: ['test-component'],
    });

    vi.mocked(installUtil.installComponent).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should exit if configuration file is missing', async () => {
    vi.mocked(configUtil.loadConfig).mockReturnValue(null);

    await program.parseAsync(['node', 'test', 'update', 'test-component']);

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(installUtil.installComponent).not.toHaveBeenCalled();
  });

  it('should exit if component is not installed', async () => {
    vi.mocked(configUtil.loadConfig).mockReturnValue({
      version: '1.0.0',
      framework: 'react',
      directories: { components: 'src/components', lib: 'src/lib' },
      components: ['other-component'],
    });

    await program.parseAsync(['node', 'test', 'update', 'test-component']);

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(installUtil.installComponent).not.toHaveBeenCalled();
  });

  it('should update component if user answers yes', async () => {
    const mockQuestion = vi.fn((query, cb) => cb('y'));
    const mockClose = vi.fn();
    vi.mocked(readline.createInterface).mockReturnValue({
      question: mockQuestion,
      close: mockClose,
    } as any);

    await program.parseAsync(['node', 'test', 'update', 'test-component']);

    expect(mockQuestion).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();
    expect(installUtil.installComponent).toHaveBeenCalledWith(
      expect.any(String),
      'test-component',
      {
        install: true,
        overwrite: true,
        client: expect.any(Object),
      }
    );
  });

  it('should update component if user answers yes with variations', async () => {
    const mockQuestion = vi.fn((query, cb) => cb('Yes'));
    const mockClose = vi.fn();
    vi.mocked(readline.createInterface).mockReturnValue({
      question: mockQuestion,
      close: mockClose,
    } as any);

    await program.parseAsync(['node', 'test', 'update', 'test-component']);

    expect(mockQuestion).toHaveBeenCalled();
    expect(installUtil.installComponent).toHaveBeenCalled();
  });

  it('should not update component if user answers no', async () => {
    const mockQuestion = vi.fn((query, cb) => cb('n'));
    const mockClose = vi.fn();
    vi.mocked(readline.createInterface).mockReturnValue({
      question: mockQuestion,
      close: mockClose,
    } as any);

    await program.parseAsync(['node', 'test', 'update', 'test-component']);

    expect(mockQuestion).toHaveBeenCalled();
    expect(installUtil.installComponent).not.toHaveBeenCalled();
  });

  it('should skip prompt and update if --yes flag is provided', async () => {
    await program.parseAsync(['node', 'test', 'update', 'test-component', '--yes']);

    expect(readline.createInterface).not.toHaveBeenCalled();
    expect(installUtil.installComponent).toHaveBeenCalledWith(
      expect.any(String),
      'test-component',
      {
        install: true,
        overwrite: true,
        client: expect.any(Object),
      }
    );
  });

  it('should skip install if --no-install flag is provided', async () => {
    await program.parseAsync(['node', 'test', 'update', 'test-component', '--yes', '--no-install']);

    expect(installUtil.installComponent).toHaveBeenCalledWith(
      expect.any(String),
      'test-component',
      {
        install: false,
        overwrite: true,
        client: expect.any(Object),
      }
    );
  });
});
