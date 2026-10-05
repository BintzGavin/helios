// Spike only. Appended to the player view by build.mjs, never by the production build.
// Adds Export MP4: injects the page exporter into the srcdoc frame, encodes there, then tries
// each way out of the sandbox. window.__heliosSpikeExport(options) is the same path for scripts.
(() => {
  'use strict';
  const X = window.__heliosSpike;
  const BUNDLE = "__HELIOS_SPIKE_EXPORT_BUNDLE__";
  const $ = (id) => document.getElementById(id);
  const btn = $('export');
  let busy = false;

  setInterval(() => { btn.disabled = busy || !X.S.win; }, 250);

  function b64(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }
  const fileName = () => (X.S.path || 'video').split('/').pop().replace(/\.html?$/i, '') + '.mp4';

  async function viaAnchor(bytes) {
    // What ClientSideExporter does. A sandbox without allow-downloads drops it silently.
    const url = URL.createObjectURL(new Blob([bytes], { type: 'video/mp4' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName();
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return { attempted: true };
  }

  async function viaDownloadFile(bytes, force) {
    const advertised = !!X.host.caps.downloadFile;
    if (!advertised && !force) return { advertised, skipped: true };
    const t0 = performance.now();
    try {
      const r = await X.request('ui/download-file', {
        contents: [{ type: 'resource', resource: { uri: 'file:///' + fileName(), mimeType: 'video/mp4', blob: b64(bytes) } }],
      });
      return { advertised, ok: !(r && r.isError), result: r, ms: Math.round(performance.now() - t0) };
    } catch (e) {
      return { advertised, ok: false, error: e.message, code: e.code, ms: Math.round(performance.now() - t0) };
    }
  }

  async function viaSaveExport(bytes, chunkBytes) {
    const total = Math.max(1, Math.ceil(bytes.length / chunkBytes));
    const uploadId = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const t0 = performance.now();
    const calls = [];
    let last = null;
    try {
      for (let i = 0; i < total; i++) {
        const part = bytes.subarray(i * chunkBytes, Math.min(bytes.length, (i + 1) * chunkBytes));
        const data = b64(part);
        const c0 = performance.now();
        last = await X.callTool('save_export', { name: fileName(), uploadId, index: i, total, data });
        calls.push({ chars: data.length, ms: Math.round(performance.now() - c0) });
      }
      const sc = (last && last.structuredContent) || {};
      return { ok: true, chunks: total, chunkBytes, ms: Math.round(performance.now() - t0), calls, saved: sc.path, absolutePath: sc.absolutePath, bytes: sc.bytes };
    } catch (e) {
      return { ok: false, chunks: total, chunkBytes, ms: Math.round(performance.now() - t0), calls, error: e.message };
    }
  }

  async function exportNow(opts) {
    const o = opts || {};
    const S = X.S;
    if (busy || !S.win) throw new Error('Nothing to export yet');
    busy = true;
    X.pause();
    const w = S.win;
    X.flash('Exporting...');
    try {
      if (typeof w.__helios_spike_export !== 'function') {
        const s = w.document.createElement('script');
        s.textContent = BUNDLE;
        w.document.head.appendChild(s);
        if (typeof w.__helios_spike_export !== 'function') throw new Error('The export script did not run in the page (CSP?)');
      }
      const r = await w.__helios_spike_export({
        fps: S.fps, duration: S.duration, width: S.width, height: S.height,
        mode: o.mode || 'auto', bitrate: o.bitrate, inline: o.inline !== false, bake: o.bake !== false, untaint: o.untaint !== false,
        sampleFrames: o.sampleFrames || [],
        onProgress: (p) => X.flash('Exporting ' + Math.round(p * 100) + '%'),
      });
      const bytes = new Uint8Array(r.bytes);
      const out = {
        mode: r.mode, frames: r.frames, bytes: bytes.length, totalMs: Math.round(r.totalMs),
        seekMs: Math.round(r.seekMs), captureMs: Math.round(r.captureMs), inlineMs: Math.round(r.inlineMs),
        inlineReport: r.inlineReport, warnings: r.warnings.slice(0, 5), warningCount: r.warnings.length,
        samples: r.samples, delivery: {},
      };
      const deliver = o.deliver || ['save_export', 'download-file', 'anchor'];
      if (deliver.includes('anchor')) out.delivery.anchor = await viaAnchor(bytes);
      if (deliver.includes('download-file')) out.delivery.downloadFile = await viaDownloadFile(bytes, !!o.forceDownloadFile);
      if (deliver.includes('save_export')) out.delivery.saveExport = await viaSaveExport(bytes, o.chunkBytes || 1024 * 1024);
      if (o.keepBytes) out.base64 = b64(bytes);
      const sv = out.delivery.saveExport;
      X.flash(sv && sv.ok ? 'Exported ' + sv.saved + ' (' + (bytes.length / 1e6).toFixed(1) + ' MB)' : 'Exported ' + (bytes.length / 1e6).toFixed(1) + ' MB', 'ok');
      window.__heliosSpikeLast = out;
      return out;
    } catch (e) {
      X.flash('Export failed: ' + e.message, 'err');
      window.__heliosSpikeLast = { error: e.message };
      throw e;
    } finally {
      busy = false;
      X.requestSeek(S.t);
    }
  }

  btn.addEventListener('click', () => { exportNow({}).catch(() => {}); });
  window.__heliosSpikeExport = exportNow;
  window.__heliosSpikeSave = viaSaveExport;
  window.__heliosSpikeDownloadFile = viaDownloadFile;
  window.__heliosSpikeAnchor = viaAnchor;
})();
