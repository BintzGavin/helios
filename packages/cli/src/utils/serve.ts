import http from 'http';
import fs from 'fs';
import path from 'path';
import { AddressInfo } from 'net';

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.wasm': 'application/wasm',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
};

export interface ServedPage {
  /** The page's http://127.0.0.1 URL. */
  url: string;
  close: () => Promise<void>;
}

/**
 * Serves a local page over http on 127.0.0.1, so it can fetch() files next to it (file://
 * pages can't) and so media gets byte ranges. The root is the current directory when the
 * page is inside it (so ../shared/ paths work), otherwise the page's own folder.
 */
export async function serveLocalPage(filePath: string): Promise<ServedPage> {
  const page = path.resolve(filePath);
  const cwd = process.cwd();
  const root = page.startsWith(cwd + path.sep) ? cwd : path.dirname(page);

  const server = http.createServer((req, res) => {
    let target: string;
    try {
      const pathname = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname);
      target = path.resolve(root, '.' + pathname);
    } catch {
      res.writeHead(400).end();
      return;
    }
    if (target !== root && !target.startsWith(root + path.sep)) {
      res.writeHead(403).end();
      return;
    }
    const send = (file: string, stat: fs.Stats) => {
      const headers: http.OutgoingHttpHeaders = {
        'Content-Type': CONTENT_TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-store',
      };
      const size = stat.size;
      const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
      if (range && (range[1] || range[2])) {
        const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
        const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
        if (start > end || start >= size) {
          res.writeHead(416, { 'Content-Range': `bytes */${size}` }).end();
          return;
        }
        res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 });
        if (req.method === 'HEAD') res.end();
        else fs.createReadStream(file, { start, end }).pipe(res);
        return;
      }
      res.writeHead(200, { ...headers, 'Content-Length': size });
      if (req.method === 'HEAD') res.end();
      else fs.createReadStream(file).pipe(res);
    };

    fs.stat(target, (err, stat) => {
      if (!err && stat.isDirectory()) {
        const index = path.join(target, 'index.html');
        fs.stat(index, (indexErr, indexStat) => {
          if (indexErr || !indexStat.isFile()) res.writeHead(404).end();
          else send(index, indexStat);
        });
        return;
      }
      if (err || !stat.isFile()) res.writeHead(404).end();
      else send(target, stat);
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const { port } = server.address() as AddressInfo;
  const relative = path.relative(root, page).split(path.sep).map(encodeURIComponent).join('/');

  return {
    url: `http://127.0.0.1:${port}/${relative}`,
    close: () => new Promise<void>((resolve) => {
      server.closeAllConnections?.();
      server.close(() => resolve());
    }),
  };
}
