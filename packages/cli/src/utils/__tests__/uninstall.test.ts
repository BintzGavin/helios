import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uninstallComponent } from '../uninstall';
import * as configUtils from '../config';
import * as fs from 'fs';
import { RegistryClient } from '../../registry/client';

vi.mock('../config');
vi.mock('fs');
vi.mock('../../registry/client');

describe('uninstall utils', () => {
  const mockConfig = {
    registry: 'https://registry.example.com',
    framework: 'react',
    components: ['button', 'card'],
    directories: {
      components: 'src/components',
    },
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(configUtils.loadConfig).mockReturnValue(JSON.parse(JSON.stringify(mockConfig)));

    // Silence console
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  describe('uninstallComponent', () => {
    it('throws if no config found', async () => {
      vi.mocked(configUtils.loadConfig).mockReturnValue(null);
      await expect(uninstallComponent('/test', 'button')).rejects.toThrow('No helios.config.json found');
    });

    it('throws if component is not in config', async () => {
      await expect(uninstallComponent('/test', 'modal')).rejects.toThrow('Component "modal" is not installed');
    });

    it('removes component from config without deleting files', async () => {
      const mockClient = new RegistryClient('mock');
      mockClient.findComponent = vi.fn().mockResolvedValue({
        name: 'button',
        files: [{ name: 'subfolder/Button.tsx', content: '' }]
      });

      await uninstallComponent('/test', 'button', { client: mockClient });

      expect(configUtils.saveConfig).toHaveBeenCalledWith(
        expect.objectContaining({ components: ['card'] }),
        '/test'
      );
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it('removes component files when removeFiles is true', async () => {
      const mockClient = new RegistryClient('mock');
      mockClient.findComponent = vi.fn().mockResolvedValue({
        name: 'button',
        files: [{ name: 'Button.tsx', content: '' }]
      });

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([]);

      await uninstallComponent('/test', 'button', { removeFiles: true, client: mockClient });

      expect(configUtils.saveConfig).toHaveBeenCalledWith(
        expect.objectContaining({ components: ['card'] }),
        '/test'
      );
      expect(fs.unlinkSync).toHaveBeenCalled();
      // expect(fs.rmdirSync).toHaveBeenCalled();
    });

    it('handles missing component in registry gracefully', async () => {
      const mockClient = new RegistryClient('mock');
      mockClient.findComponent = vi.fn().mockResolvedValue(null);

      await uninstallComponent('/test', 'button', { removeFiles: true, client: mockClient });

      expect(configUtils.saveConfig).toHaveBeenCalledWith(
        expect.objectContaining({ components: ['card'] }),
        '/test'
      );
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it('handles registry errors gracefully', async () => {
      const mockClient = new RegistryClient('mock');
      mockClient.findComponent = vi.fn().mockRejectedValue(new Error('Registry down'));

      await uninstallComponent('/test', 'button', { removeFiles: true, client: mockClient });

      expect(configUtils.saveConfig).toHaveBeenCalledWith(
        expect.objectContaining({ components: ['card'] }),
        '/test'
      );
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Could not verify associated files'));
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it('handles file deletion errors gracefully', async () => {
      const mockClient = new RegistryClient('mock');
      mockClient.findComponent = vi.fn().mockResolvedValue({
        name: 'button',
        files: [{ name: 'Button.tsx', content: '' }]
      });

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.unlinkSync).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      await uninstallComponent('/test', 'button', { removeFiles: true, client: mockClient });

      expect(configUtils.saveConfig).toHaveBeenCalledWith(
        expect.objectContaining({ components: ['card'] }),
        '/test'
      );
      expect(fs.unlinkSync).toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to delete'));
    });
  });
});
