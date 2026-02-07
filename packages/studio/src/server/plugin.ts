import { Plugin, ViteDevServer, PreviewServer } from 'vite';
import { AddressInfo } from 'net';
import fs from 'fs';
import path from 'path';
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createMcpServer } from './mcp';
import { findCompositions, findAssets, getProjectRoot, createComposition, deleteComposition, updateCompositionMetadata, duplicateComposition, renameComposition, renameAsset } from './discovery';
import { templates } from './templates';
import { findDocumentation, resolveDocumentationPath } from './documentation';
import { startRender, getJob, getJobs, cancelJob, deleteJob, diagnoseServer } from './render-manager';

export interface StudioComponentDefinition {
  name: string;
  description?: string;
  type: string;
  files: { name: string; content: string }[];
  dependencies?: Record<string, string>;
}

export interface StudioPluginOptions {
  studioRoot?: string;
  components?: StudioComponentDefinition[];
  onInstallComponent?: (name: string) => Promise<void>;
  onCheckInstalled?: (name: string) => Promise<boolean>;
}

const getBody = async (req: any) => {
  return new Promise<any>((resolve, reject) => {
      const chunks: any[] = [];
      req.on('data', (chunk: any) => chunks.push(chunk));
      req.on('end', () => {
          try {
              resolve(JSON.parse(Buffer.concat(chunks).toString()));
          } catch (e) {
              resolve({});
          }
      });
      req.on('error', reject);
  });
};

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.ts': 'text/plain', // Browser cannot run TS, but serve as text
  '.tsx': 'text/plain',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.txt': 'text/plain',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function configureMiddlewares(server: ViteDevServer | PreviewServer, isPreview: boolean, options: StudioPluginOptions) {
      // Static File Serving for Studio UI (Overlay)
      if (options.studioRoot) {
          server.middlewares.use((req, res, next) => {
              if (!req.url) return next();

              // Only handle GET/HEAD
              if (req.method !== 'GET' && req.method !== 'HEAD') return next();

              const url = req.url.split('?')[0];
              const safeUrl = path.normalize(url).replace(/^(\.\.[\/\\])+/, '');

              // 1. Try serving exact file from studioRoot
              let filePath = path.join(options.studioRoot!, safeUrl);

              // If root request, serve index.html
              if (url === '/') {
                  filePath = path.join(options.studioRoot!, 'index.html');
              }

              if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                  const ext = path.extname(filePath).toLowerCase();
                  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
                  res.setHeader('Content-Type', contentType);
                  fs.createReadStream(filePath).pipe(res);
                  return;
              }

              next();
          });
      }

      // MCP Server Setup
      const mcpServer = createMcpServer(() => {
          const address = server.httpServer?.address();
          return (typeof address === 'object' && address !== null) ? address.port : 5173;
      });
      const mcpTransports = new Map<string, SSEServerTransport>();

      server.middlewares.use('/mcp/sse', async (req, res, next) => {
          const transport = new SSEServerTransport("/mcp/messages", res);
          const sessionId = transport.sessionId;
          mcpTransports.set(sessionId, transport);

          transport.onclose = () => {
              mcpTransports.delete(sessionId);
          };

          await mcpServer.connect(transport);
      });

      server.middlewares.use('/mcp/messages', async (req, res, next) => {
          if (req.method !== 'POST') return next();

          const urlStr = req.url || '/';
          const qIndex = urlStr.indexOf('?');
          let sessionId: string | null = null;
          if (qIndex !== -1) {
              const params = new URLSearchParams(urlStr.substring(qIndex));
              sessionId = params.get('sessionId');
          }

          if (!sessionId) {
              res.statusCode = 400;
              res.end("Missing sessionId");
              return;
          }

          const transport = mcpTransports.get(sessionId);
          if (!transport) {
              res.statusCode = 404;
              res.end("Session not found");
              return;
          }

          await transport.handlePostMessage(req, res);
      });

      server.middlewares.use('/api/components', async (req, res, next) => {
        if (req.url === '/' || req.url === '') {
            if (req.method === 'GET') {
                const components = options.components || [];
                const enriched = await Promise.all(components.map(async (c) => ({
                    ...c,
                    installed: options.onCheckInstalled ? await options.onCheckInstalled(c.name) : false
                })));
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(enriched));
                return;
            }
            if (req.method === 'POST') {
                try {
                    const body = await getBody(req);
                    const { name } = body;
                    if (!name) {
                        res.statusCode = 400;
                        res.end(JSON.stringify({ error: 'Name is required' }));
                        return;
                    }
                    if (options.onInstallComponent) {
                        await options.onInstallComponent(name);
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ success: true }));
                    } else {
                        res.statusCode = 501;
                        res.end(JSON.stringify({ error: 'Component installation not supported' }));
                    }
                } catch (e: any) {
                    console.error(e);
                    res.statusCode = 500;
                    res.end(JSON.stringify({ error: e.message }));
                }
                return;
            }
        }
        next();
      });

      // NEW: Middleware for /@fs/ (Project File Serving)
      // Only enabled in PREVIEW mode because Vite Dev server handles /@fs/ natively with HMR support.
      if (isPreview) {
        server.middlewares.use('/@fs', (req, res, next) => {
            if (!req.url) return next();

            // Decode the URL (it comes as /Path/To/File%20Name.ext)
            const decodedUrl = decodeURIComponent(req.url);

            // Remove leading slash if it precedes a drive letter (Windows fix)
            // e.g. /C:/Windows -> C:/Windows
            let fsPath = decodedUrl;
            if (process.platform === 'win32' && /^\/[a-zA-Z]:/.test(fsPath)) {
              fsPath = fsPath.slice(1);
            } else if (fsPath.startsWith('/')) {
              // For non-windows (or absolute paths on unix), ensure it treats it as absolute path
            }

            if (fs.existsSync(fsPath) && fs.statSync(fsPath).isFile()) {
              const ext = path.extname(fsPath).toLowerCase();
              const contentType = MIME_TYPES[ext] || 'application/octet-stream';

              res.setHeader('Content-Type', contentType);
              const stream = fs.createReadStream(fsPath);
              stream.pipe(res);
              return;
            }

            next();
        });
      }

      server.middlewares.use('/api/compositions/duplicate', async (req, res, next) => {
        if (req.method === 'POST') {
            try {
                const body = await getBody(req);
                const { sourceId, newName } = body;

                if (!sourceId || !newName) {
                    res.statusCode = 400;
                    res.end(JSON.stringify({ error: 'Source ID and New Name are required' }));
                    return;
                }

                const newComp = duplicateComposition(process.cwd(), sourceId, newName);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(newComp));
            } catch (e: any) {
                console.error(e);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: e.message }));
            }
            return;
        }
        next();
      });

      server.middlewares.use('/api/templates', (req, res, next) => {
        if (req.url === '/' || req.url === '') {
          if (req.method === 'GET') {
            const list = Object.values(templates).map(t => ({ id: t.id, label: t.label }));
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(list));
            return;
          }
        }
        next();
      });

      server.middlewares.use('/api/compositions', async (req, res, next) => {
        const match = req.url!.match(/^\/([^\/]+)\/thumbnail$/);
        if (match && req.method === 'POST') {
            const id = decodeURIComponent(match[1]);
            try {
                const projectRoot = getProjectRoot(process.cwd());
                const compDir = path.resolve(projectRoot, id);

                // Security check
                if (!compDir.startsWith(projectRoot)) {
                    res.statusCode = 403;
                    res.end(JSON.stringify({ error: 'Access denied' }));
                    return;
                }

                if (!fs.existsSync(compDir)) {
                    res.statusCode = 404;
                    res.end(JSON.stringify({ error: 'Composition not found' }));
                    return;
                }

                const thumbPath = path.join(compDir, 'thumbnail.png');
                const writeStream = fs.createWriteStream(thumbPath);

                req.pipe(writeStream);

                writeStream.on('finish', () => {
                   res.setHeader('Content-Type', 'application/json');
                   res.end(JSON.stringify({ success: true }));
                });

                writeStream.on('error', (err) => {
                   console.error('Thumbnail write error:', err);
                   res.statusCode = 500;
                   res.end(JSON.stringify({ error: 'Write failed' }));
                });

                req.on('error', (err) => {
                   console.error('Thumbnail upload error:', err);
                   if (!res.headersSent) {
                       res.statusCode = 500;
                       res.end(JSON.stringify({ error: 'Upload failed' }));
                   }
                });

            } catch (e: any) {
                console.error(e);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: e.message }));
            }
            return;
        }

        if (req.url === '/' || req.url === '') {
          if (req.method === 'POST') {
             try {
                const body = await getBody(req);
                const { name, template, width, height, fps, duration } = body;
                if (!name) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Name is required' }));
                  return;
                }

                const options = (width && height && fps && duration) ? {
                    width: Number(width),
                    height: Number(height),
                    fps: Number(fps),
                    duration: Number(duration)
                } : undefined;

                const newComp = createComposition(process.cwd(), name, template, options);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(newComp));
             } catch (e: any) {
                console.error(e);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: e.message }));
             }
             return;
          }

          if (req.method === 'PATCH') {
            try {
              const body = await getBody(req);
              const { id, name, width, height, fps, duration, defaultProps } = body;

              if (!id) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'ID is required' }));
                return;
              }

              let currentId = id;

              // Handle Rename
              if (name) {
                  const newComp = renameComposition(process.cwd(), id, name);
                  currentId = newComp.id;

                  // If no other metadata provided, just return the result of rename
                  if (width === undefined && height === undefined && fps === undefined && duration === undefined) {
                      res.setHeader('Content-Type', 'application/json');
                      res.end(JSON.stringify(newComp));
                      return;
                  }
              }

              const options: any = {};
              if (width !== undefined) options.width = Number(width);
              if (height !== undefined) options.height = Number(height);
              if (fps !== undefined) options.fps = Number(fps);
              if (duration !== undefined) options.duration = Number(duration);
              if (defaultProps !== undefined) options.defaultProps = defaultProps;

              const updatedComp = updateCompositionMetadata(process.cwd(), currentId, options);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(updatedComp));
            } catch (e: any) {
              console.error(e);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: e.message }));
            }
            return;
          }

          if (req.method === 'DELETE') {
            try {
              let id: string | null = null;
              const qIndex = req.url?.indexOf('?');
              if (qIndex !== undefined && qIndex !== -1) {
                  const params = new URLSearchParams(req.url?.substring(qIndex));
                  id = params.get('id');
              }

              if (!id) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Missing composition ID' }));
                return;
              }

              deleteComposition(process.cwd(), id);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (e: any) {
              console.error(e);
              const isAccessDenied = e.message.includes('Access denied');
              const isNotFound = e.message.includes('not found') || e.message.includes('not a valid');

              if (isAccessDenied) res.statusCode = 403;
              else if (isNotFound) res.statusCode = 404;
              else res.statusCode = 500;

              res.end(JSON.stringify({ error: e.message }));
            }
            return;
          }

          try {
            const comps = findCompositions(process.cwd());
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(comps));
          } catch (e) {
            console.error(e);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Failed to scan compositions' }));
          }
          return;
        }
        next();
      });

      server.middlewares.use('/api/diagnose', async (req, res, next) => {
        if (req.url === '/' || req.url === '') {
          try {
            const report = await diagnoseServer();
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(report));
          } catch (e: any) {
            console.error(e);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message || 'Diagnostics failed' }));
          }
          return;
        }
        next();
      });

      server.middlewares.use('/docs', async (req, res, next) => {
        const match = req.url!.match(/^\/([^\/]+)\.md$/);
        if (match) {
            const pkgName = match[1];
            try {
                const readmePath = resolveDocumentationPath(process.cwd(), pkgName);
                if (readmePath && fs.existsSync(readmePath)) {
                    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
                    const stream = fs.createReadStream(readmePath);
                    stream.pipe(res);
                } else {
                    res.statusCode = 404;
                    res.end('Documentation not found');
                }
            } catch (e: any) {
                console.error(e);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: e.message }));
            }
            return;
        }
        next();
      });

      server.middlewares.use('/api/documentation', async (req, res, next) => {
        if (req.url === '/' || req.url === '') {
          try {
            const docs = findDocumentation(process.cwd());
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(docs));
          } catch (e: any) {
             console.error(e);
             res.statusCode = 500;
             res.end(JSON.stringify({ error: e.message || 'Documentation scan failed' }));
          }
          return;
        }
        next();
      });

      server.middlewares.use('/api/assets', async (req, res, next) => {
        const url = req.url || '/';
        const pathOnly = url.split('?')[0];

        if (pathOnly === '/' || pathOnly === '') {
          // GET: List assets
          if (req.method === 'GET') {
            try {
              const assets = findAssets(process.cwd());
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(assets));
            } catch (e) {
              console.error(e);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'Failed to scan assets' }));
            }
            return;
          }

          // PATCH: Rename asset
          if (req.method === 'PATCH') {
            try {
              const body = await getBody(req);
              const { id, newName } = body;

              if (!id || !newName) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'ID and newName are required' }));
                return;
              }

              const newAsset = renameAsset(process.cwd(), id, newName);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(newAsset));
            } catch (e: any) {
              console.error(e);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: e.message }));
            }
            return;
          }

          // DELETE: Delete asset
          if (req.method === 'DELETE') {
            try {
              let id: string | null = null;

              // Try query param
              const qIndex = req.url?.indexOf('?');
              if (qIndex !== undefined && qIndex !== -1) {
                  const params = new URLSearchParams(req.url?.substring(qIndex));
                  id = params.get('id');
              }

              // Fallback to body if needed (but prefer query for DELETE)
              if (!id) {
                  const body = await getBody(req);
                  id = body.id;
              }

              if (!id) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Missing asset ID' }));
                return;
              }

              // Security check: ensure file is within project root
              const projectRoot = getProjectRoot(process.cwd());
              const resolvedPath = path.resolve(id);

              if (!resolvedPath.startsWith(projectRoot)) {
                 res.statusCode = 403;
                 res.end(JSON.stringify({ error: 'Access denied: File outside project root' }));
                 return;
              }

              if (fs.existsSync(resolvedPath)) {
                fs.unlinkSync(resolvedPath);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true }));
              } else {
                res.statusCode = 404;
                res.end(JSON.stringify({ error: 'File not found' }));
              }
            } catch (e: any) {
              console.error(e);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: e.message }));
            }
            return;
          }
        }

        // POST: Upload asset
        if (req.url === '/upload' && req.method === 'POST') {
          const filename = req.headers['x-filename'] as string;
          if (!filename) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Missing x-filename header' }));
            return;
          }

          try {
            const safeFilename = path.basename(filename);
            const projectRoot = getProjectRoot(process.cwd());
            const publicDir = path.join(projectRoot, 'public');

            // Use public directory if it exists, otherwise use project root
            const targetDir = fs.existsSync(publicDir) ? publicDir : projectRoot;
            const targetPath = path.join(targetDir, safeFilename);

            const writeStream = fs.createWriteStream(targetPath);
            req.pipe(writeStream);

            req.on('end', () => {
               res.setHeader('Content-Type', 'application/json');
               res.end(JSON.stringify({ success: true, path: targetPath }));
            });

            req.on('error', (err: any) => {
               console.error('Upload error:', err);
               res.statusCode = 500;
               res.end(JSON.stringify({ error: 'Upload failed' }));
            });
            return;

          } catch (e: any) {
             console.error(e);
             res.statusCode = 500;
             res.end(JSON.stringify({ error: e.message }));
             return;
          }
        }

        next();
      });

      server.middlewares.use('/api/render', async (req, res, next) => {
        if (req.url === '/' || req.url === '') {
          if (req.method === 'POST') {
            try {
              const body = await getBody(req);
              const address = server.httpServer?.address();
              const port = typeof address === 'object' && address !== null ? address.port : 5173;

              const jobId = await startRender(body, port);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ jobId }));
            } catch (e: any) {
              console.error(e);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: e.message }));
            }
            return;
          }
        }
        next();
      });

      server.middlewares.use('/api/renders', async (req, res, next) => {
        const match = req.url!.match(/^\/([^\/]+)$/);
        if (match) {
            const filename = match[1];
            // Security check: simple basename check to avoid traversal
            if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
                res.statusCode = 400;
                res.end('Invalid filename');
                return;
            }

            const projectRoot = getProjectRoot(process.cwd());
            const rendersDir = path.resolve(projectRoot, 'renders');
            const filePath = path.join(rendersDir, filename);

            if (fs.existsSync(filePath)) {
                res.setHeader('Content-Type', 'video/mp4');
                const stream = fs.createReadStream(filePath);
                stream.pipe(res);
            } else {
                res.statusCode = 404;
                res.end('File not found');
            }
            return;
        }
        next();
      });

      server.middlewares.use('/api/jobs', async (req, res, next) => {
        if (req.url === '/' || req.url === '') {
          const jobs = getJobs();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(jobs));
          return;
        }

        // Cancel Job: POST /api/jobs/:id/cancel
        const cancelMatch = req.url!.match(/^\/([^\/]+)\/cancel$/);
        if (cancelMatch) {
            if (req.method === 'POST') {
                try {
                    const jobId = cancelMatch[1];
                    const success = await cancelJob(jobId);
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ success }));
                } catch (e: any) {
                    res.statusCode = 500;
                    res.end(JSON.stringify({ error: e.message }));
                }
                return;
            }
        }

        // Get or Delete Job: /api/jobs/:id
        const match = req.url!.match(/^\/([^\/]+)$/);
        if (match) {
          const jobId = match[1];

          if (req.method === 'DELETE') {
              try {
                  const success = await deleteJob(jobId);
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success }));
              } catch (e: any) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: e.message }));
              }
              return;
          }

          const job = getJob(jobId);
          if (job) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(job));
          } else {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: 'Job not found' }));
          }
          return;
        }
        next();
      });
}

export function studioApiPlugin(options: StudioPluginOptions = {}): Plugin {
  return {
    name: 'helios-studio-api',
    configureServer: (server) => configureMiddlewares(server, false, options),
    configurePreviewServer: (server) => configureMiddlewares(server, true, options)
  };
}
