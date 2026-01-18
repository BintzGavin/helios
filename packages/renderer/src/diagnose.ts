import { spawn } from 'child_process';
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import { chromium } from 'playwright';

export interface Diagnosis {
  ffmpeg: {
    exists: boolean;
    path: string;
    version: string | null;
  };
  gpu: {
    acceleration: boolean;
    vendor: string | null;
    renderer: string | null;
  };
  playwright: {
    browserInstalled: boolean;
    version: string | null;
  };
}

export async function diagnose(): Promise<Diagnosis> {
  const diagnosis: Diagnosis = {
    ffmpeg: { exists: false, path: '', version: null },
    gpu: { acceleration: false, vendor: null, renderer: null },
    playwright: { browserInstalled: false, version: null },
  };

  // 1. Check FFmpeg
  diagnosis.ffmpeg.path = ffmpeg.path;
  try {
    const ffmpegProc = spawn(ffmpeg.path, ['-version']);
    let output = '';
    ffmpegProc.stdout.on('data', (d) => (output += d.toString()));

    await new Promise<void>((resolve) => {
        ffmpegProc.on('close', () => resolve());
    });

    if (output.includes('ffmpeg version')) {
      diagnosis.ffmpeg.exists = true;
      const match = output.match(/ffmpeg version (\S+)/);
      if (match) diagnosis.ffmpeg.version = match[1];
    }
  } catch (e) {
    console.error('FFmpeg check failed', e);
  }

  // 2. Check Playwright & GPU
  try {
    // Launch with GPU flags to see if we can access GPU info
    const browser = await chromium.launch({
      headless: true,
      args: [
         '--use-gl=egl',
         '--ignore-gpu-blocklist',
      ],
    });
    diagnosis.playwright.browserInstalled = true;

    // Playwright BrowserType doesn't strictly expose version() in all types,
    // but the executable path gives us a hint or we can skip it.
    // For now we just confirm it launched.
    diagnosis.playwright.version = 'installed';

    const page = await browser.newPage();

    // We can try to read GPU info from a canvas context
    const gpuInfo = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl');
      if (!gl) return null;

      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (!debugInfo) return null;

      return {
        vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
        renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL),
      };
    });

    if (gpuInfo) {
      diagnosis.gpu.acceleration = true; // Heuristic: if we got info, we have a GL context
      diagnosis.gpu.vendor = gpuInfo.vendor;
      diagnosis.gpu.renderer = gpuInfo.renderer;
    }

    await browser.close();
  } catch (e) {
    console.error('Playwright/GPU check failed', e);
  }

  return diagnosis;
}
