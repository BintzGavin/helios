import { Helios, DiagnosticReport } from '@helios-project/core';

interface ReportItem {
  label: string;
  value: string | boolean | null;
  type?: 'neutral' | 'success' | 'error';
}

interface ReportSection {
  title: string;
  items: ReportItem[];
}

// 1. Initialize Helios
// We need a dummy Helios instance to satisfy the Player if it loads this.
// autoSyncAnimations: true allows it to run without manual ticking if needed,
// but for this example we are just running a one-off async check.
// Using duration: 0 makes it "infinite" or "static" effectively.
const helios = new Helios({
  duration: 0,
  fps: 30,
  width: 1920,
  height: 1080,
  autoSyncAnimations: true
});

// Expose for Helios Player (Direct Mode)
// @ts-ignore
window.helios = helios;

// 2. DOM Setup
const app = document.querySelector('#app');
if (app) {
    app.innerHTML = '<div class="loading">Running System Diagnostics...</div>';
}

// 3. Run Diagnostics
async function run() {
  try {
    const report = await Helios.diagnose();
    renderReport(report);
  } catch (err) {
    renderError(err);
  }
}

run();

// 4. Render Logic
function renderReport(report: DiagnosticReport) {
  if (!app) return;

  const sections: ReportSection[] = [
    {
      title: 'Environment',
      items: [
        { label: 'User Agent', value: report.userAgent, type: 'neutral' },
        { label: 'OffscreenCanvas', value: report.offscreenCanvas },
        { label: 'Web Audio API', value: report.webAudio },
        { label: 'Color Gamut', value: report.colorGamut || 'N/A', type: 'neutral' },
      ]
    },
    {
      title: 'WebGL',
      items: [
        { label: 'WebGL 1', value: report.webgl },
        { label: 'WebGL 2', value: report.webgl2 },
      ]
    },
    {
      title: 'WebCodecs Support',
      items: [
        { label: 'API Available', value: report.webCodecs },
      ]
    },
    {
      title: 'Video Encoding',
      items: [
        { label: 'H.264 (AVC)', value: report.videoCodecs.h264 },
        { label: 'VP8', value: report.videoCodecs.vp8 },
        { label: 'VP9', value: report.videoCodecs.vp9 },
        { label: 'AV1', value: report.videoCodecs.av1 },
      ]
    },
    {
      title: 'Video Decoding',
      items: [
        { label: 'H.264 (AVC)', value: report.videoDecoders.h264 },
        { label: 'VP8', value: report.videoDecoders.vp8 },
        { label: 'VP9', value: report.videoDecoders.vp9 },
        { label: 'AV1', value: report.videoDecoders.av1 },
      ]
    },
     {
      title: 'Audio Encoding',
      items: [
        { label: 'AAC', value: report.audioCodecs.aac },
        { label: 'Opus', value: report.audioCodecs.opus },
      ]
    },
    {
      title: 'Audio Decoding',
      items: [
        { label: 'AAC', value: report.audioDecoders.aac },
        { label: 'Opus', value: report.audioDecoders.opus },
      ]
    }
  ];

  const container = document.createElement('div');

  const title = document.createElement('h1');
  title.textContent = 'System Diagnostics';
  container.appendChild(title);

  sections.forEach(section => {
    const secDiv = document.createElement('div');
    secDiv.className = 'section';

    const h2 = document.createElement('h2');
    h2.textContent = section.title;
    secDiv.appendChild(h2);

    section.items.forEach(item => {
      let displayValue = '';
      let className = 'neutral';

      if (typeof item.value === 'boolean') {
        displayValue = item.value ? '✅ Supported' : '❌ Not Supported';
        className = item.value ? 'success' : 'error';
      } else {
        displayValue = String(item.value);
        className = item.type || 'neutral';
      }

      const itemDiv = document.createElement('div');
      itemDiv.className = 'item';

      const labelSpan = document.createElement('span');
      labelSpan.className = 'label';
      labelSpan.textContent = item.label;

      const valueSpan = document.createElement('span');
      valueSpan.className = `value ${className}`;
      valueSpan.textContent = displayValue;

      itemDiv.appendChild(labelSpan);
      itemDiv.appendChild(valueSpan);
      secDiv.appendChild(itemDiv);
    });
    container.appendChild(secDiv);
  });

  app.innerHTML = '';
  app.appendChild(container);
}

function renderError(err: any) {
    if (app) {
        app.innerHTML = '';
        const div = document.createElement('div');
        div.className = 'error';
        div.textContent = `Error: ${err.message}`;
        app.appendChild(div);
    }
    console.error(err);
}
