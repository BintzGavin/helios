import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import { getRenderJobSpec } from './render-manager';

// Mock dependencies
vi.mock('@helios-project/renderer', () => {
  return {
    RenderOrchestrator: {
      plan: vi.fn((compositionUrl, outputPath, options) => {
         // Mock output for chunks
         const outputDir = path.dirname(outputPath);
         const chunks: any[] = [];
         const concurrency = options.concurrency || 1;

         for(let i=0; i<concurrency; i++) {
             chunks.push({
                 id: i,
                 startFrame: i * 10,
                 frameCount: 10,
                 outputFile: path.join(outputDir, `temp_part_${i}.mov`),
                 options: { ...options }
             });
         }

         return {
             totalFrames: 100,
             chunks,
             concatManifest: chunks.map(c => c.outputFile),
             concatOutputFile: path.join(outputDir, 'temp_concat.mov'),
             finalOutputFile: outputPath,
             mixOptions: {},
             cleanupFiles: []
         };
      }),
      render: vi.fn()
    },
    Renderer: class {},
    DistributedRenderOptions: {}
  };
});

describe('getRenderJobSpec', () => {
  const TEST_DIR = path.resolve(process.cwd(), 'temp-test-root');

  beforeEach(() => {
    vi.stubEnv('HELIOS_PROJECT_ROOT', TEST_DIR);
    if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true, force: true });
    fs.mkdirSync(TEST_DIR, { recursive: true });
    fs.mkdirSync(path.join(TEST_DIR, 'renders'));
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true, force: true });
    vi.unstubAllEnvs();
  });

  it('should generate relative paths', () => {
    const options = {
        compositionUrl: '/my-comp/composition.html',
        width: 1920,
        height: 1080,
        fps: 30,
        duration: 5,
        concurrency: 2
    };

    const spec = getRenderJobSpec(options);

    console.log('Chunk Command:', spec.chunks[0].command);
    console.log('Merge Command:', spec.mergeCommand);

    const chunkCommand = spec.chunks[0].command;

    // Should NOT contain absolute path
    expect(chunkCommand).not.toContain(TEST_DIR);

    // Should contain relative paths
    // Note: Normalize slashes if needed for cross-platform
    const expectedInput = 'my-comp/composition.html';
    const expectedOutput = 'renders/temp_part_0.mov';

    expect(chunkCommand).toContain(expectedInput);
    expect(chunkCommand).toContain(expectedOutput);
  });
});
