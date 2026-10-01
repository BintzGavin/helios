import { RenderService } from '../../src/jobs.js';
import { NativeBackend } from '../../src/backend.js';
import { FileStore, ObjectStore, ByteSource, byteChunks } from '../../src/storage.js';
import { join } from 'node:path';

const [directory, id, phase, rasterizer] = process.argv.slice(2);
async function checkpoint() { process.send?.({ phase }); await new Promise(() => {}); }
class FaultBackend extends NativeBackend {
  async chunk(...args: Parameters<NativeBackend['chunk']>) { await super.chunk(...args); if (phase === 'render') await checkpoint(); }
  async finalize(...args: Parameters<NativeBackend['finalize']>) { await super.finalize(...args); if (phase === 'finalize') await checkpoint(); }
}
const files = new FileStore(join(directory, 'store'));
const store: ObjectStore = {
  get: key => files.get(key), list: prefix => files.list(prefix),
  async put(key, body, version) {
    if (phase === 'commit' && key.startsWith('j/') && body instanceof Uint8Array) {
      const state = JSON.parse(new TextDecoder().decode(body));
      if (!state.lease && state.completedChunks > 1) await checkpoint();
    }
    if (phase === 'upload' && key.startsWith('a/')) {
      const stream = async function* (source: ByteSource) { for await (const bytes of byteChunks(source)) { yield bytes; await checkpoint(); } };
      return files.put(key, stream(body), version);
    }
    return files.put(key, body, version);
  },
};
const service = new RenderService(store, new FaultBackend({ rasterizer: rasterizer === 'skia' ? 'skia' : 'native' }), { workspace: join(directory, 'work'), chunkFrames: 5, leaseMs: 1200, pollMs: 100 });
await service.advance('tenant', id);
