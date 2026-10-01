import { CanvasFrameRenderer, encodeCanvasRange } from './canvas.js';
import { loadCanvasComposition } from './canvas-pool.js';
import type { CanvasRenderOptions } from './canvas.js';

// Process isolation gives each native font registry and graphics runtime its own
// state, avoiding contention and font removal across concurrently rendering ranges.
const abort = new AbortController();
let renderer: CanvasFrameRenderer;
let options: CanvasRenderOptions;
let initializing: Promise<void> | undefined;
let active: Promise<void> | undefined;
let stopping = false;
let preparationMs = 0;
const send = (type: string, stats?: unknown) => { if (process.connected) process.send!({ type, stats }, () => {}); };
const stop = async () => {
  stopping = true; abort.abort();
  await initializing?.catch(() => {}); await active?.catch(() => {});
  renderer?.close(); if (process.connected) process.disconnect?.();
};
process.on('disconnect', () => { if (!stopping) void stop(); });
process.on('message', (message: any) => {
  if (message.type === 'stop') { void stop(); return; }
  if (message.type === 'initialize' && !initializing) {
    options = message.options;
    initializing = (async () => {
      try {
        const started = performance.now();
        renderer = new CanvasFrameRenderer(await loadCanvasComposition(new URL(message.module)));
        preparationMs = performance.now() - started;
        if (stopping) renderer.close(); else send('ready');
      } catch { send('failed'); if (process.connected) process.disconnect?.(); }
    })();
    return;
  }
  if (message.type !== 'range' || stopping || active || !renderer) { send('failed'); return; }
  active = (async () => {
    try {
      const stats = await encodeCanvasRange(renderer, message.output, { ...options, start: message.start, end: message.end, signal: abort.signal }, true);
      stats.preparationMs = preparationMs;
      preparationMs = 0;
      send('done', stats);
    } catch { send('failed'); }
  })().finally(() => { active = undefined; });
});
