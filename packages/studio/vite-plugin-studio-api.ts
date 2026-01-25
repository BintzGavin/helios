import { Plugin } from 'vite';
import { AddressInfo } from 'net';
import { findCompositions, findAssets } from './src/server/discovery';
import { startRender, getJob, getJobs } from './src/server/render-manager';

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

      server.middlewares.use('/api/assets', async (req, res, next) => {
        if (req.url === '/' || req.url === '') {
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

      server.middlewares.use('/api/jobs', async (req, res, next) => {
        if (req.url === '/' || req.url === '') {
          const jobs = getJobs();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(jobs));
          return;
        }

        const match = req.url!.match(/^\/([^\/]+)$/);
        if (match) {
          const jobId = match[1];
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
