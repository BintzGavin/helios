
import { CanvasStrategy } from '../src/strategies/CanvasStrategy.js';
import { RendererOptions } from '../src/types.js';
import { Page } from 'playwright';

// Mock Page
class MockPage {
  viewportSize() {
    return { width: 1920, height: 1080 };
  }

  async evaluate(fnOrScript: any, args?: any) {
    // If it's the font check
    if (fnOrScript.toString().includes('document.fonts.ready')) {
      return true;
    }

    // If it's the canvas finder
    if (fnOrScript.toString().includes('findCanvas') || fnOrScript.toString().includes('eval(args.script)')) {
      return true; // Found
    }

    // If it's the codec selection script
    if (typeof fnOrScript === 'string' && fnOrScript.includes('window.heliosWebCodecs')) {
      // args should be the config object
      // We can intercept the candidates here
      // But wait, the script is passed as a string and args is passed as the second argument?
      // In CanvasStrategy:
      // page.evaluate<...>(`...`, args)
      // Wait, passing args to evaluate with a string script:
      // page.evaluate(`(config) => { ... }(${JSON.stringify(args)})`)

      // Ah, looking at CanvasStrategy:
      // const result = await page.evaluate(...)
      // It constructs a string: `(async (config) => { ... })(${JSON.stringify(args)})`
      // So the args are embedded in the script string as JSON.

      // We need to parse the script to extract the args.
      const jsonMatch = fnOrScript.match(/\)\((\{.*\})\)\s*$/);
      if (jsonMatch) {
        const config = JSON.parse(jsonMatch[1]);
        if (config.candidates) {
            (this as any).capturedCandidates = config.candidates;
        }
      }

      // Return a dummy supported result to avoid errors
      return { supported: true, codec: 'mock-codec', isH264: true };
    }

    // If it's scanForAudioTracks (which uses evaluate)
    if (fnOrScript.toString().includes('scanForAudioTracks') || (args && args.toString().includes('scanForAudioTracks'))) {
        return [];
    }

    return null;
  }

  frames() {
      // For dom-scanner
      return [{
          evaluate: async () => []
      }];
  }
}

async function runTest() {
  console.log('Running Smart Codec Priority Verification...');

  const options: RendererOptions = {
    width: 1920,
    height: 1080,
    fps: 30,
    durationInSeconds: 1,
    mode: 'canvas',
    // Default videoCodec
  };

  const strategy = new CanvasStrategy(options);
  const mockPage = new MockPage() as unknown as Page;

  // We need to stub extractBlobTracks to avoid filesystem errors
  // But extractBlobTracks is imported. We can't easily mock it in ESM without a loader.
  // However, extractBlobTracks calls scanForAudioTracks which calls page.frames().
  // If scanForAudioTracks returns empty, extractBlobTracks does nothing.

  try {
    await strategy.prepare(mockPage);
  } catch (e) {
    console.error('Strategy prepare failed:', e);
    process.exit(1);
  }

  const candidates = (mockPage as any).capturedCandidates;

  if (!candidates) {
      console.error('❌ Failed to capture candidates from page.evaluate');
      process.exit(1);
  }

  console.log('Captured candidates:', candidates.map((c: any) => c.codecString));

  // Expected Order: H.264 -> VP9 -> AV1 -> VP8
  const expectedOrder = [
      { codec: 'avc1.4d002a', isH264: true },
      { codec: 'vp9', isH264: false },
      { codec: 'av01.0.05M.08', isH264: false },
      { codec: 'vp8', isH264: false }
  ];

  let passed = true;

  // Note: Currently (before fix), we expect H.264 -> VP8
  // After fix, we expect H.264 -> VP9 -> AV1 -> VP8
  // This test validates the NEW expectation.

  // Basic check for existence
  const hasH264 = candidates.some((c: any) => c.codecString === 'avc1.4d002a');
  const hasVP9 = candidates.some((c: any) => c.codecString === 'vp9');
  const hasAV1 = candidates.some((c: any) => c.codecString === 'av01.0.05M.08');
  const hasVP8 = candidates.some((c: any) => c.codecString === 'vp8');

  if (!hasH264) { console.error('❌ Missing H.264 candidate'); passed = false; }
  if (!hasVP9) { console.error('❌ Missing VP9 candidate'); passed = false; }
  if (!hasAV1) { console.error('❌ Missing AV1 candidate'); passed = false; }
  if (!hasVP8) { console.error('❌ Missing VP8 candidate'); passed = false; }

  // Check order
  if (passed) {
      if (candidates[0].codecString !== 'avc1.4d002a') { console.error('❌ First candidate is not H.264'); passed = false; }
      if (candidates[1].codecString !== 'vp9') { console.error('❌ Second candidate is not VP9'); passed = false; }
      if (candidates[2].codecString !== 'av01.0.05M.08') { console.error('❌ Third candidate is not AV1'); passed = false; }
      if (candidates[3].codecString !== 'vp8') { console.error('❌ Fourth candidate is not VP8'); passed = false; }
  }

  if (passed) {
      console.log('✅ All candidates present in correct order.');
  } else {
      console.error('❌ verification failed.');
      process.exit(1);
  }
}

runTest();
