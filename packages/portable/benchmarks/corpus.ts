import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { parsePlan, Plan, Node } from '../src/plan.js';
import { digest } from '../src/storage.js';
import { runProcess } from '../src/process.js';

export interface Fixture { id: string; name: string; plan: Plan; assets: Map<string, string>; coverage: string }
export async function buildCorpus(directory: string, quick = false): Promise<Fixture[]> {
  await mkdir(directory, { recursive: true });
  const allAssets: Plan['assets'] = {}, files = new Map<string, string>();
  async function asset(id: string, bytes: Uint8Array, type: 'image' | 'font' | 'audio' | 'video') {
    const sha256 = digest(bytes), path = join(directory, sha256); await writeFile(path, bytes);
    allAssets[id] = { sha256, bytes: bytes.length, type }; files.set(id, path);
  }
  const fontDir = fileURLToPath(new URL('../tests/fixtures/fonts/', import.meta.url));
  for (const [id, file] of [['latin', 'NotoSans-Regular.ttf'], ['arabic', 'NotoSansArabic-Regular.ttf'], ['devanagari', 'NotoSansDevanagari-Regular.ttf'], ['cjk', 'NotoSansCJKsc-Regular.otf']]) await asset(id, await readFile(join(fontDir, file)), 'font');
  for (let i = 0; i < 20; i++) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240"><rect width="320" height="240" fill="hsl(${i * 18},65%,38%)"/><circle cx="160" cy="120" r="${40 + i * 3}" fill="#ffffff" fill-opacity="0.5"/></svg>`;
    await asset(`image${i}`, new Resvg(svg).render().asPng(), 'image');
  }
  const large = new Resvg('<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="4000"><rect width="4000" height="4000" fill="#1c5858"/><circle cx="2000" cy="2000" r="1500" fill="#dfff83"/></svg>').render().asPng();
  await asset('large', large, 'image');
  const source = join(directory, 'source.mp4'), duration = quick ? 8 : 61;
  await runProcess('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=size=640x360:rate=30', '-t', String(duration), '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '22', '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', source], { timeoutMs: 120000 });
  await asset('video', await readFile(source), 'video');
  // Deterministic 48 kHz PCM with sample-indexed impulses; no generated media service.
  for (const [id, frequency] of [['voice', 220], ['music', 330], ['impulses', 0]] as const) {
    const frames = duration * 48000, bytes = Buffer.alloc(44 + frames * 2);
    bytes.write('RIFF'); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVEfmt ', 8); bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22); bytes.writeUInt32LE(48000, 24); bytes.writeUInt32LE(96000, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34); bytes.write('data', 36); bytes.writeUInt32LE(frames * 2, 40);
    for (let sample = 0; sample < frames; sample++) bytes.writeInt16LE(Math.round(frequency ? Math.sin(sample * frequency * 2 * Math.PI / 48000) * 2000 : sample % 48000 < 10 ? 10000 : 0), 44 + sample * 2);
    await asset(id, bytes, 'audio');
  }
  const result: Fixture[] = [];
  function add(id: string, name: string, seconds: number, nodes: Node[], audio: any[] = [], portrait = false, fractional = false) {
    const fps = fractional ? { num: 30000, den: 1001 } : { num: 30, den: 1 };
    const count = quick ? Math.min(90, Math.round(seconds * 30)) : fractional ? 1798 : seconds * 30;
    const scale = quick ? 1 / 3 : 1, width = portrait ? 1080 : 1920, height = portrait ? 1920 : 1080;
    // Preserve scene geometry while shrinking the quick smoke's output and timeline.
    const clamp = (input: Node[]): Node[] => input.filter(n => (n.start ?? 0) < count).map(n => {
      const c = structuredClone(n); if (c.end) c.end = Math.min(c.end, count);
      for (const obj of [c, c.transform]) if (obj) for (const key of Object.keys(obj)) {
        const value = (obj as any)[key];
        if (value?.keyframes) { value.keyframes = value.keyframes.filter((k: any) => k.frame < count); if (!value.keyframes.length) value.keyframes = [{ frame: 0, value: 0 }]; }
      }
      if (c.children) c.children = clamp(c.children); return c;
    });
    const active = clamp(nodes), used = new Set<string>();
    function visit(list: Node[]) { for (const n of list) { if (n.asset) used.add(n.asset); n.fonts?.forEach(f => used.add(f)); if (n.children) visit(n.children); } }
    visit(active);
    const tracks = audio.filter(a => (a.start ?? 0) < count).map(a => ({ ...a, end: Math.min(a.end, count) })); tracks.forEach(a => used.add(a.asset));
    const plan = parsePlan({ version: 'portable-v1', width: width * scale, height: height * scale, fps, frameCount: count, background: '#101c26', assets: Object.fromEntries([...used].map(key => [key, allAssets[key]])), nodes: quick ? [{ id: 'viewport', type: 'group', width, height, transform: { scaleX: scale, scaleY: scale }, children: active }] : active, audio: tracks });
    result.push({ id, name, plan, assets: new Map([...used].map(key => [key, files.get(key)!])), coverage: quick ? 'engineering smoke; reduced duration and resolution' : 'synthetic RFC fixture; no customer-coverage claim' });
  }
  const text = (id: string, value: string, x: number, y: number, size = 52): Node => ({ id, type: 'text', text: value, fonts: ['latin', 'arabic', 'devanagari', 'cjk'], x, y, width: 1500, fontSize: size, fill: '#ffffff' });
  add('B01', 'Multilingual typography', 15, Array.from({ length: 12 }, (_, i) => ({ ...text(`text${i}`, ['Helios · production rendering', 'مرحبا بالعالم — 123', 'नमस्ते दुनिया', '你好世界 · 视频'][i % 4], 100 + i % 2 * 70, 40 + i * 80, 48), transform: { rotation: { keyframes: [{ frame: 0, value: -1 }, { frame: 449, value: 1 }] } } })));
  const images: Node[] = Array.from({ length: 20 }, (_, i) => ({ id: `tile${i}`, type: 'image', asset: `image${i}`, x: 60 + i % 5 * 210, y: 300 + Math.floor(i / 5) * 170, width: 180, height: 140, clip: { type: 'rect', width: 180, height: 140, radius: 20 } }));
  const explainer: Node[] = [{ id: 'bar', type: 'rect', width: 1920, height: 210, fill: { type: 'linear', x1: 0, y1: 0, x2: 1920, y2: 0, stops: [{ offset: 0, color: '#155768' }, { offset: 1, color: '#253246' }] } }, text('title', 'One composition. A finished video.', 70, 45, 70), text('subtitle', 'Submit → render → verify → deliver', 75, 155, 30), ...images, { id: 'insert', type: 'video', asset: 'video', x: 1170, y: 300, width: 660, height: 660, fit: 'cover', clip: { type: 'rect', width: 660, height: 660, radius: 36 } }];
  add('B02', 'Product explainer', 60, explainer, [{ asset: 'voice', end: 1800, fadeIn: 0.1, fadeOut: 0.5 }]);
  add('B03', 'One thousand animated primitives', 30, Array.from({ length: 1000 }, (_, i) => ({ id: `bar${i}`, type: 'rect', x: i % 50 * 38, y: Math.floor(i / 50) * 54, width: 28, height: { keyframes: [{ frame: 0, value: 8 + i % 32 }, { frame: 899, value: 45 - i % 32 }] }, fill: i % 2 ? '#8af0d0' : '#dfff83' })));
  add('B04', 'Portrait captions and cropped media', 60, [{ id: 'portrait', type: 'video', asset: 'video', width: 1080, height: 1920, fit: 'cover' }, { id: 'shade', type: 'rect', y: 1350, width: 1080, height: 570, fill: '#000000cc' }, ...Array.from({ length: 30 }, (_, i) => ({ ...text(`caption${i}`, `A precise caption. ${i + 1}`, 60, 1450, 62), width: 960, start: i * 60, end: (i + 1) * 60 }))], [{ asset: 'voice', end: 1800 }, { asset: 'music', end: 1800, gain: 0.25, fadeOut: 1 }], true);
  const montage: Node[] = [{ id: 'left', type: 'video', asset: 'video', width: 1100, height: 1080, fit: 'cover' }, { id: 'right', type: 'video', asset: 'video', sourceStart: 0.5, x: 820, width: 1100, height: 1080, fit: 'cover', opacity: { keyframes: [{ frame: 0, value: 0.2 }, { frame: 1799, value: 1 }] } }, text('montage-title', 'Two streams. One timeline.', 100, 90, 72)];
  add('B05', 'Two video layers and audio crossfade', 60, montage, [{ asset: 'voice', end: 1800, fadeOut: 2 }, { asset: 'music', end: 1800, gain: 0.3, fadeIn: 2 }]);
  const long: Node[] = [], longAudio = [];
  for (let i = 0; i < 10; i++) { long.push({ id: `scene${i}`, type: 'group', start: i * 1800, end: (i + 1) * 1800, children: (i % 2 ? montage : explainer).map(n => ({ ...n, id: `${n.id}_${i}`, start: i * 1800, end: (i + 1) * 1800, ...(n.transform ? { transform: undefined } : {}) })) }, { ...text(`marker${i}`, `Minute ${i + 1} / 10`, 1300, 980, 40), start: i * 1800, end: (i + 1) * 1800 }); longAudio.push({ asset: 'voice', start: i * 1800, end: (i + 1) * 1800 }); }
  add('B06', 'Ten-minute recovery and drift', 600, long, longAudio);
  add('B07', 'Fractional cadence flashes and impulses', 60, Array.from({ length: 60 }, (_, i) => ({ id: `flash${i}`, type: 'rect', width: 1920, height: 1080, fill: '#ffffff', start: Math.round(i * 30000 / 1001), end: Math.round(i * 30000 / 1001) + 1 })), [{ asset: 'impulses', end: 1798 }], false, true);
  const envelope: Node[] = [{ id: 'large', type: 'image', asset: 'large', width: 1920, height: 1080 }, ...montage.map(n => ({ ...n, opacity: 0.2 }))];
  for (let i = 0; i < 1980; i++) envelope.push({ id: `limit${i}`, type: 'rect', x: i % 60 * 32, y: Math.floor(i / 60) * 32, width: 18, height: 18, fill: '#dfff83', ...(i < 1666 ? { opacity: { keyframes: [{ frame: 0, value: 0.2 }, { frame: 30, value: 0.8 }, { frame: 899, value: 0.5 }] } } : {}) });
  let nested: Node = { id: 'depth16', type: 'rect', width: 30, height: 30, fill: '#ff0000', opacity: { keyframes: [{ frame: 0, value: 0.5 }, { frame: 899, value: 1 }] } };
  for (let i = 15; i >= 1; i--) nested = { id: `depth${i}`, type: 'group', children: [nested] };
  if (quick) envelope.push({ id: 'quickDepth', type: 'rect', width: 20, height: 20, fill: '#ff0000' }); else envelope.push(nested);
  add('B08', 'Combined declared envelope', 30, envelope, Array.from({ length: 4 }, (_, i) => ({ asset: i % 2 ? 'music' : 'voice', end: 900, gain: 0.2 })));
  for (const fixture of result) await writeFile(join(directory, `${fixture.id}.json`), JSON.stringify(fixture.plan, null, 2) + '\n');
  return result;
}
