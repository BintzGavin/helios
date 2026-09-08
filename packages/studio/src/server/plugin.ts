import { Plugin, ViteDevServer, PreviewServer } from 'vite';
import { AddressInfo } from 'net';
import fs from 'fs';
import path from 'path';
import { createMcpHttpHandler } from './mcp-http';
import { startRemoteMcp } from './remote-startup';
import { RenderAccessError, serveRenderOutput } from './render-access';
import { findCompositions, findAssets, getProjectRoot, configureProjectRoot, createComposition, deleteComposition, updateCompositionMetadata, duplicateComposition, renameComposition, renameAsset, deleteAsset, createDirectory, moveAsset } from './discovery';
import { templates } from './templates';
import { findDocumentation, resolveDocumentationPath } from './documentation';
import { initializeRenderManager, startRender, getRenderJobSpec, getJob, getJobs, cancelJob, deleteJob, diagnoseServer } from './render-manager';
import { StudioPluginOptions } from './types';

export type { StudioPluginOptions, StudioComponentDefinition } from './types';

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

      // Local Studio and remote MCP are separate network surfaces.
      const projectRoot = options.projectRoot ?? getProjectRoot(process.cwd());
      configureProjectRoot(projectRoot);
      void initializeRenderManager(projectRoot);
      const getPort = () => {
          const address = server.httpServer?.address();
          return typeof address === 'object' && address !== null ? address.port : 5173;
      };
      const localMcp = createMcpHttpHandler(getPort, {
          ...options, projectRoot,
          allowedHosts: ['localhost', '127.0.0.1', '[::1]'],
          allowedOrigins: () => [`http://localhost:${getPort()}`, `http://127.0.0.1:${getPort()}`, `http://[::1]:${getPort()}`],
          authenticate: async req => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress ?? '') ? 'local-owner' : undefined,
      });
      server.middlewares.use((req, res, next) => {
          if (req.url?.split('?')[0].startsWith('/mcp')) { void localMcp.handle(req, res); return; }
          next();
      });
      server.httpServer?.once('close', () => { void localMcp.close(); });
      if (options.remoteMcp) {
          // Vite calls configureServer before binding. Start the gateway only
          // after the renderer's loopback origin is available.
          server.httpServer?.once('listening', () => {
              void startRemoteMcp(getPort, { ...options, projectRoot }, options.remoteMcp!).then(remote => {
                  server.httpServer?.once('close', () => { void remote.close(); });
                  console.log(`Authenticated MCP: ${options.remoteMcp!.publicUrl}/mcp (loopback gateway port ${options.remoteMcp!.port})`);
              }).catch(() => {
                  console.error('Remote MCP startup failed. Check the dedicated OS secret-store entry and listener port.');
                  void server.close();
                  process.exitCode = 1;
              });
          });
      }

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

            if (req.method === 'PUT') {
                try {
                    const body = await getBody(req);
                    const { name } = body;
                    if (!name) {
                        res.statusCode = 400;
                        res.end(JSON.stringify({ error: 'Name is required' }));
                        return;
                    }
                    if (options.onUpdateComponent) {
                        await options.onUpdateComponent(name);
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ success: true }));
                    } else {
                        res.statusCode = 501;
                        res.end(JSON.stringify({ error: 'Component update not supported' }));
                    }
                } catch (e: any) {
                    console.error(e);
                    res.statusCode = 500;
                    res.end(JSON.stringify({ error: e.message }));
                }
                return;
            }

            if (req.method === 'DELETE') {
                try {
                    let name: string | null = null;
                    const qIndex = req.url?.indexOf('?');
                    if (qIndex !== undefined && qIndex !== -1) {
                        const params = new URLSearchParams(req.url?.substring(qIndex));
                        name = params.get('name');
                    }

                    if (!name) {
                        const body = await getBody(req);
                        name = body?.name;
                    }

                    if (!name) {
                        res.statusCode = 400;
                        res.end(JSON.stringify({ error: 'Name is required' }));
                        return;
                    }

                    if (options.onRemoveComponent) {
                        await options.onRemoveComponent(name);
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ success: true }));
                    } else {
                        res.statusCode = 501;
                        res.end(JSON.stringify({ error: 'Component removal not supported' }));
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
                  const newComp = await renameComposition(process.cwd(), id, name);
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
            const comps = await findCompositions(process.cwd());
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
            const docs = findDocumentation(process.cwd(), options.skillsRoot);
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
              const assets = await findAssets(process.cwd());
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

              deleteAsset(process.cwd(), id);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (e: any) {
              console.error(e);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: e.message }));
            }
            return;
          }
        }

        // POST: Create Directory
        if (req.url === '/mkdir' && req.method === 'POST') {
           try {
             const body = await getBody(req);
             const { path: dirPath } = body;

             if (!dirPath) {
               res.statusCode = 400;
               res.end(JSON.stringify({ error: 'Path is required' }));
               return;
             }

             const newDir = createDirectory(process.cwd(), dirPath);
             res.setHeader('Content-Type', 'application/json');
             res.end(JSON.stringify(newDir));
           } catch (e: any) {
             console.error(e);
             res.statusCode = 500;
             res.end(JSON.stringify({ error: e.message }));
           }
           return;
        }

        // POST: Move asset
        if (req.url === '/move' && req.method === 'POST') {
           try {
             const body = await getBody(req);
             const { sourceId, targetFolderId } = body;

             if (!sourceId || !targetFolderId) {
               res.statusCode = 400;
               res.end(JSON.stringify({ error: 'sourceId and targetFolderId are required' }));
               return;
             }

             const newAsset = moveAsset(process.cwd(), sourceId, targetFolderId);
             res.setHeader('Content-Type', 'application/json');
             res.end(JSON.stringify(newAsset));
           } catch (e: any) {
             console.error(e);
             res.statusCode = 500;
             res.end(JSON.stringify({ error: e.message }));
           }
           return;
        }

        // POST: Upload asset
        if (req.url === '/upload' && req.method === 'POST') {
          const filename = req.headers['x-filename'] as string;
          const directory = req.headers['x-directory'] as string || '';

          if (!filename) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Missing x-filename header' }));
            return;
          }

          try {
            const safeFilename = path.basename(filename);
            const safeDirectory = path.normalize(directory).replace(/^(\.\.[\/\\])+/, ''); // Prevent traversal

            const projectRoot = getProjectRoot(process.cwd());
            const publicDir = path.join(projectRoot, 'public');

            // Use public directory if it exists, otherwise use project root
            const baseDir = fs.existsSync(publicDir) ? publicDir : projectRoot;
            const targetDir = path.join(baseDir, safeDirectory);

            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }

            const targetPath = path.join(targetDir, safeFilename);

            // Security check: ensure target path is still within project root
            if (!targetPath.startsWith(baseDir)) {
                 res.statusCode = 403;
                 res.end(JSON.stringify({ error: 'Access denied: Path traversal detected' }));
                 return;
            }

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

      server.middlewares.use('/api/render/job-spec', async (req, res, next) => {
        if (req.method === 'POST') {
            try {
                const body = await getBody(req);
                const spec = await getRenderJobSpec(body);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(spec));
            } catch (e: any) {
                console.error(e);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: e.message }));
            }
            return;
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

      server.middlewares.use('/api/renders', async (req, res) => {
        // Legacy browser URL shares the managed-output validation. Remote
        // access uses /mcp/outputs exclusively on the authenticated listener.
        const local = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress ?? '');
        let host: string;
        try { host = new URL(`http://${req.headers.host}`).hostname; }
        catch { res.statusCode = 403; res.end(); return; }
        const allowedOrigin = !req.headers.origin || [`http://localhost:${getPort()}`, `http://127.0.0.1:${getPort()}`].includes(req.headers.origin);
        if (!local || !['localhost', '127.0.0.1', '[::1]'].includes(host) || !allowedOrigin) { res.statusCode = 403; res.end(); return; }
        const match = /^\/render-([a-zA-Z0-9-]{1,100})\.mp4$/.exec((req.url ?? '').split('?')[0]);
        if (!match) { res.statusCode = 404; res.end(); return; }
        try { await serveRenderOutput(match[1], projectRoot, req, res); }
        catch (error) {
          if (res.headersSent) { res.destroy(); return; }
          res.statusCode = error instanceof RenderAccessError ? error.status : 500;
          res.end(error instanceof RenderAccessError ? error.code : 'OUTPUT_ERROR');
        }
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
