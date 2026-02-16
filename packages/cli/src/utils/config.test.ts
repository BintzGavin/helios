import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadConfig, getConfigOrThrow, saveConfig, DEFAULT_CONFIG } from './config.js';
import fs from 'fs';
import path from 'path';

vi.mock('fs');
vi.mock('path');

describe('utils/config', () => {
  const mockCwd = '/test/cwd';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(path.resolve).mockImplementation((...args) => args.join('/'));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('loadConfig', () => {
    it('should return null if config file does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const config = loadConfig(mockCwd);
      expect(config).toBeNull();
    });

    it('should return parsed config if file exists', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(DEFAULT_CONFIG));

      const config = loadConfig(mockCwd);
      expect(config).toEqual(DEFAULT_CONFIG);
    });

    it('should throw error if JSON is invalid', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('invalid json');

      expect(() => loadConfig(mockCwd)).toThrow('Failed to parse helios.config.json');
    });
  });

  describe('getConfigOrThrow', () => {
    it('should return config if exists', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(DEFAULT_CONFIG));

      const config = getConfigOrThrow(mockCwd);
      expect(config).toEqual(DEFAULT_CONFIG);
    });

    it('should throw if config missing', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      expect(() => getConfigOrThrow(mockCwd)).toThrow('Configuration file not found');
    });
  });

  describe('saveConfig', () => {
    it('should write config to file', () => {
      saveConfig(DEFAULT_CONFIG, mockCwd);
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        path.resolve(mockCwd, 'helios.config.json'),
        JSON.stringify(DEFAULT_CONFIG, null, 2)
      );
    });

    it('should throw if write fails', () => {
      vi.mocked(fs.writeFileSync).mockImplementation(() => {
        throw new Error('Write failed');
      });

      expect(() => saveConfig(DEFAULT_CONFIG, mockCwd)).toThrow('Failed to save helios.config.json');
    });
  });
});
