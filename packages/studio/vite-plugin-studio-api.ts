import { Plugin } from 'vite';
import { AddressInfo } from 'net';
import fs from 'fs';
import path from 'path';
import { findCompositions, findAssets, getProjectRoot } from './src/server/discovery';
import { startRender, getJob, getJobs, cancelJob, deleteJob, diagnoseServer } from './src/server/render-manager';

export function studioApiPlugin(): Plugin {
  return {
    name: 'helios-studio-api',
    configureServer(server) {
      const getBody = async (req: any) => {
        return new Promise<any>((resolve, reject) => {
            let body = '';
            req.on('data', (chunk: any) => body += chunk.toString());
            req.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    resolve({});
                }
            });
            req.on('error', reject);
        });
      };

      server.middlewares.use('/api/compositions', async (req, res, next) => {
        if (req.url === '/' || req.url === '') {
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
                const jobId = cancelMatch[1];
                const success = cancelJob(jobId);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success }));
                return;
            }
        }

        // Get or Delete Job: /api/jobs/:id
        const match = req.url!.match(/^\/([^\/]+)$/);
        if (match) {
          const jobId = match[1];

          if (req.method === 'DELETE') {
              const success = deleteJob(jobId);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success }));
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
  }
}
