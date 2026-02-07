import { vi, describe, it, expect, beforeEach } from 'vitest';
import path from 'path';
import { getRenderJobSpec } from './render-manager';
import { RenderOrchestrator } from '@helios-project/renderer';
import * as Discovery from './discovery';

vi.mock('@helios-project/renderer', () => ({
  RenderOrchestrator: {
    plan: vi.fn()
  },
  // Mock other exports if needed, but we only use types and static plan method
}));

vi.mock('./discovery', () => ({
  getProjectRoot: vi.fn().mockReturnValue('/mock/project/root')
}));

describe('render-manager', () => {
  const mockProjectRoot = '/mock/project/root';

  beforeEach(() => {
    vi.clearAllMocks();
    // Re-apply the mock return value if needed, though the factory default handles init
    (Discovery.getProjectRoot as any).mockReturnValue(mockProjectRoot);
  });

  describe('getRenderJobSpec', () => {
    it('should generate a correct JobSpec', async () => {
      const options = {
        compositionUrl: '/examples/basic/composition.html',
        width: 1920,
        height: 1080,
        fps: 30,
        duration: 2,
        mode: 'canvas' as const,
        concurrency: 2
      };

      // Mock RenderOrchestrator.plan response
      const mockPlan = {
        totalFrames: 60,
        chunks: [
          {
            id: 0,
            startFrame: 0,
            frameCount: 30,
            outputFile: path.join(mockProjectRoot, 'renders/temp_0.mov'),
            options: {
                width: 1920,
                height: 1080,
                fps: 30,
                mode: 'canvas'
            }
          },
          {
            id: 1,
            startFrame: 30,
            frameCount: 30,
            outputFile: path.join(mockProjectRoot, 'renders/temp_1.mov'),
            options: {
                width: 1920,
                height: 1080,
                fps: 30,
                mode: 'canvas'
            }
          }
        ],
        concatManifest: ['/path/to/0.mov', '/path/to/1.mov'],
        concatOutputFile: '/path/to/concat.mov',
        finalOutputFile: '/path/to/final.mp4',
        mixOptions: {
           videoCodec: 'libx264',
           audioCodec: 'aac'
        },
        cleanupFiles: []
      };

      (RenderOrchestrator.plan as any).mockReturnValue(mockPlan);

      const spec = await getRenderJobSpec(options);

      expect(RenderOrchestrator.plan).toHaveBeenCalled();
      const planCallArgs = (RenderOrchestrator.plan as any).mock.calls[0];
      // Check composition URL (should be absolute file URL)
      expect(planCallArgs[0]).toContain('file://');
      expect(planCallArgs[0]).toContain('examples/basic/composition.html');

      // Check metadata
      expect(spec.metadata).toEqual({
        totalFrames: 60,
        fps: 30,
        width: 1920,
        height: 1080,
        duration: 2
      });

      // Check chunks
      expect(spec.chunks).toHaveLength(2);
      expect(spec.chunks[0].command).toContain('helios render');
      expect(spec.chunks[0].command).toContain('--start-frame 0');
      expect(spec.chunks[0].command).toContain('--frame-count 30');
      // Verify ported flags logic
      expect(spec.chunks[0].command).toContain('--width 1920');
      expect(spec.chunks[0].command).toContain('--height 1080');

      // Check merge command
      expect(spec.mergeCommand).toContain('helios merge');
      expect(spec.mergeCommand).toContain('--video-codec libx264');
      expect(spec.mergeCommand).toContain('--audio-codec aac');
    });

    it('should handle @fs urls', async () => {
        const options = {
            compositionUrl: '/@fs/abs/path/to/composition.html',
            fps: 30,
            duration: 1
        };

        const mockPlan = {
            totalFrames: 30,
            chunks: [],
            concatManifest: [],
            mixOptions: {},
            cleanupFiles: []
        };
        (RenderOrchestrator.plan as any).mockReturnValue(mockPlan);

        await getRenderJobSpec(options);

        const planCallArgs = (RenderOrchestrator.plan as any).mock.calls[0];
        // Should convert /@fs/abs/path... to file:///abs/path...
        // Note: pathToFileURL handles generic paths.
        // Assuming /abs/path is absolute on linux, or C:/ on windows.
        // The mock logic in getRenderJobSpec strips /@fs/
        expect(planCallArgs[0]).toContain('file://');
        expect(planCallArgs[0]).not.toContain('/@fs/');
    });
  });
});
