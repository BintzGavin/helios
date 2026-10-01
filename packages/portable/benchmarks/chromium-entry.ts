import { SkiaRasterizer } from '../src/skia.js';

let scene: SkiaRasterizer, plan: any, videos = new Map<string, HTMLVideoElement>(), infos: Map<string, any>;
const active = (nodes: any[], frame: number): any[] => nodes.flatMap(node => frame < (node.start ?? 0) || frame >= (node.end ?? plan.frameCount) ? [] : node.type === 'video' ? [node] : node.children ? active(node.children, frame) : []);
(window as any).loadScene = async (input: any) => {
  plan = input.plan; infos = new Map(input.videos);
  const images = new Map(input.images.map(([id, data]: string[]) => [id, Uint8Array.from(atob(data), char => char.charCodeAt(0))]));
  scene = new SkiaRasterizer(plan, { fonts: new Map(), text: new Map(input.text), images, videos: infos, frames: new Map() } as any);
  await scene.prepare();
  const visit = async (nodes: any[]) => { for (const node of nodes) {
    if (node.type === 'video') {
      const video = document.createElement('video'), info = infos.get(node.asset);
      video.muted = true; video.preload = 'auto'; video.width = info.width; video.height = info.height;
      const ready = new Promise<void>((done, reject) => { video.onloadeddata = () => done(); video.onerror = () => reject(new Error('Benchmark video did not load')); });
      video.src = `${input.base}/${node.asset}`; await ready; videos.set(node.id, video);
    }
    if (node.children) await visit(node.children);
  } };
  await visit(plan.nodes);
};
(window as any).drawFrame = async (frame: number) => {
  const nodes = active(plan.nodes, frame);
  await Promise.all(nodes.map(async node => {
    const video = videos.get(node.id)!, info = infos.get(node.asset);
    const index = Math.floor(((node.sourceStart ?? 0) + (frame - (node.start ?? 0)) * plan.fps.den / plan.fps.num) * info.fps.num / info.fps.den + 1e-7);
    const time = (index + 0.1) * info.fps.den / info.fps.num;
    if (Math.abs(video.currentTime - time) > 1e-7) {
      const ready = new Promise<void>((done, reject) => { video.onseeked = () => done(); video.onerror = () => reject(new Error('Benchmark video seek failed')); });
      video.currentTime = time; await ready;
    }
    // Benchmark adapter uses the browser's native video surface, avoiding a Node pixel bridge.
    (scene as any).video.set(node.id, video);
  }));
  scene.draw(frame);
};
