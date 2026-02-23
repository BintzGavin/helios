import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadJobSpec } from '../job';
import path from 'path';
import fs from 'fs';

// Mock fs module
vi.mock('fs', () => {
  return {
    default: {
      existsSync: vi.fn(),
      readFileSync: vi.fn(),
    },
    // Also mock named exports just in case, though job.ts uses default
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  };
});

// Mock fetch global
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

describe('loadJobSpec', () => {
  const mockCwd = '/test/cwd';

  beforeEach(() => {
    vi.resetAllMocks();
    // Spy on process.cwd
    vi.spyOn(process, 'cwd').mockReturnValue(mockCwd);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Remote URLs', () => {
    it('should fetch and parse JSON from a valid URL', async () => {
      const mockJobSpec = { chunks: [] };
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockJobSpec,
      });

      const url = 'http://example.com/job.json';
      const result = await loadJobSpec(url);

      expect(fetchMock).toHaveBeenCalledWith(url);
      expect(result.jobSpec).toEqual(mockJobSpec);
      expect(result.jobDir).toBe(mockCwd);
    });

    it('should throw an error if fetch fails', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const url = 'http://example.com/job.json';
      await expect(loadJobSpec(url)).rejects.toThrow('Failed to fetch job: Not Found (404)');
    });
  });

  describe('Local Files', () => {
    it('should read and parse JSON from a valid local file', async () => {
      const mockJobSpec = { chunks: [] };
      const filename = 'job.json';
      const absolutePath = path.resolve(mockCwd, filename);

      // Setup fs mocks
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockJobSpec));

      const result = await loadJobSpec(filename);

      expect(fs.existsSync).toHaveBeenCalledWith(absolutePath);
      expect(fs.readFileSync).toHaveBeenCalledWith(absolutePath, 'utf-8');
      expect(result.jobSpec).toEqual(mockJobSpec);
      expect(result.jobDir).toBe(path.dirname(absolutePath));
    });

    it('should throw an error if local file does not exist', async () => {
      const filename = 'job.json';
      const absolutePath = path.resolve(mockCwd, filename);

      vi.mocked(fs.existsSync).mockReturnValue(false);

      await expect(loadJobSpec(filename)).rejects.toThrow(`Job file not found: ${absolutePath}`);
    });
  });
});
