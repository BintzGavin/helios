import { Plugin } from 'vite';
import { findCompositions } from './src/server/discovery';

export function studioApiPlugin(): Plugin {
  return {
    name: 'helios-studio-api',
    configureServer(server) {
      server.middlewares.use('/api/compositions', async (req, res, next) => {
        // Basic routing for exact match
        // req.url here is relative to the mount point of the middleware,
        // but server.middlewares.use('/api/compositions') mounts it at that path.
        // Wait, connect middlewares: if mounted at /api/compositions, req.url is '/' inside the handler.

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
    }
  }
}
