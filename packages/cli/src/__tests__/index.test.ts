import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';

// Mock commander
const mockParse = vi.fn();
const mockVersion = vi.fn().mockReturnThis();
const mockDescription = vi.fn().mockReturnThis();
const mockName = vi.fn().mockReturnThis();

vi.mock('commander', () => {
  const CommandMock = vi.fn().mockImplementation(function() {
    return {
      name: mockName,
      description: mockDescription,
      version: mockVersion,
      parse: mockParse,
    };
  });
  return {
    Command: CommandMock,
  };
});

// Mock all command registrations
vi.mock('../commands/studio.js', () => ({ registerStudioCommand: vi.fn() }));
vi.mock('../commands/init.js', () => ({ registerInitCommand: vi.fn() }));
vi.mock('../commands/add.js', () => ({ registerAddCommand: vi.fn() }));
vi.mock('../commands/components.js', () => ({ registerComponentsCommand: vi.fn() }));
vi.mock('../commands/render.js', () => ({ registerRenderCommand: vi.fn() }));
vi.mock('../commands/merge.js', () => ({ registerMergeCommand: vi.fn() }));
vi.mock('../commands/list.js', () => ({ registerListCommand: vi.fn() }));
vi.mock('../commands/remove.js', () => ({ registerRemoveCommand: vi.fn() }));
vi.mock('../commands/update.js', () => ({ registerUpdateCommand: vi.fn() }));
vi.mock('../commands/build.js', () => ({ registerBuildCommand: vi.fn() }));
vi.mock('../commands/preview.js', () => ({ registerPreviewCommand: vi.fn() }));
vi.mock('../commands/job.js', () => ({ registerJobCommand: vi.fn() }));
vi.mock('../commands/skills.js', () => ({ registerSkillsCommand: vi.fn() }));
vi.mock('../commands/diff.js', () => ({ registerDiffCommand: vi.fn() }));
vi.mock('../commands/deploy.js', () => ({ registerDeployCommand: vi.fn() }));

describe('CLI Entry Point (index.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should initialize commander and register all commands', async () => {
    // Dynamically import index.ts to trigger the execution
    await import('../index.js');

    expect(Command).toHaveBeenCalled();
    expect(mockName).toHaveBeenCalledWith('helios');
    expect(mockDescription).toHaveBeenCalledWith('Helios CLI');
    expect(mockVersion).toHaveBeenCalled();

    // Verify that all commands were registered with the program instance
    const { registerStudioCommand } = await import('../commands/studio.js');
    const { registerInitCommand } = await import('../commands/init.js');
    const { registerAddCommand } = await import('../commands/add.js');
    const { registerComponentsCommand } = await import('../commands/components.js');
    const { registerRenderCommand } = await import('../commands/render.js');
    const { registerMergeCommand } = await import('../commands/merge.js');
    const { registerListCommand } = await import('../commands/list.js');
    const { registerRemoveCommand } = await import('../commands/remove.js');
    const { registerUpdateCommand } = await import('../commands/update.js');
    const { registerBuildCommand } = await import('../commands/build.js');
    const { registerPreviewCommand } = await import('../commands/preview.js');
    const { registerJobCommand } = await import('../commands/job.js');
    const { registerSkillsCommand } = await import('../commands/skills.js');
    const { registerDiffCommand } = await import('../commands/diff.js');
    const { registerDeployCommand } = await import('../commands/deploy.js');

    const programInstance = vi.mocked(Command).mock.results[0].value;

    expect(registerStudioCommand).toHaveBeenCalledWith(programInstance);
    expect(registerInitCommand).toHaveBeenCalledWith(programInstance);
    expect(registerAddCommand).toHaveBeenCalledWith(programInstance);
    expect(registerComponentsCommand).toHaveBeenCalledWith(programInstance);
    expect(registerRenderCommand).toHaveBeenCalledWith(programInstance);
    expect(registerMergeCommand).toHaveBeenCalledWith(programInstance);
    expect(registerListCommand).toHaveBeenCalledWith(programInstance);
    expect(registerRemoveCommand).toHaveBeenCalledWith(programInstance);
    expect(registerUpdateCommand).toHaveBeenCalledWith(programInstance);
    expect(registerBuildCommand).toHaveBeenCalledWith(programInstance);
    expect(registerPreviewCommand).toHaveBeenCalledWith(programInstance);
    expect(registerJobCommand).toHaveBeenCalledWith(programInstance);
    expect(registerSkillsCommand).toHaveBeenCalledWith(programInstance);
    expect(registerDiffCommand).toHaveBeenCalledWith(programInstance);
    expect(registerDeployCommand).toHaveBeenCalledWith(programInstance);

    // Verify parse was called
    expect(mockParse).toHaveBeenCalledWith(process.argv);
  });
});
