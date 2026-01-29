import fs from 'fs';
import path from 'path';

export interface CompositionInfo {
  id: string;
  name: string;
  url: string;
  description?: string;
}

export interface AssetInfo {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video' | 'audio' | 'font' | 'model' | 'json' | 'shader' | 'other';
}

export function getProjectRoot(cwd: string): string {
  if (process.env.HELIOS_PROJECT_ROOT) {
    return path.resolve(process.env.HELIOS_PROJECT_ROOT);
  }
  return path.resolve(cwd, '../../examples');
}

export function findCompositions(rootDir: string): CompositionInfo[] {
  // rootDir is expected to be packages/studio (or wherever the vite server is running from)
  const projectRoot = getProjectRoot(rootDir);

  if (!fs.existsSync(projectRoot)) {
    console.warn(`Project root directory not found at: ${projectRoot}`);
    return [];
  }

  const entries = fs.readdirSync(projectRoot, { withFileTypes: true });
  const compositions: CompositionInfo[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const compPath = path.join(projectRoot, entry.name, 'composition.html');
      if (fs.existsSync(compPath)) {
        // Format name: "simple-canvas-animation" -> "Simple Canvas Animation"
        const name = entry.name
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        compositions.push({
          id: entry.name,
          name: name,
          // Use /@fs/ prefix with absolute path so Vite can serve files outside root
          // Ensure we don't double slash if path starts with /
          url: `/@fs${compPath}`,
          description: `Example: ${name}`
        });
      }
    }
  }
  return compositions;
}

export function createComposition(rootDir: string, name: string): CompositionInfo {
  const projectRoot = getProjectRoot(rootDir);

  // Sanitize name: lowercase, replace spaces with hyphens, remove special chars
  const dirName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

  if (!dirName) {
    throw new Error('Invalid composition name');
  }

  const compDir = path.join(projectRoot, dirName);
  if (fs.existsSync(compDir)) {
    throw new Error(`Composition "${name}" (directory: ${dirName}) already exists`);
  }

  fs.mkdirSync(compDir, { recursive: true });

  const template = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name}</title>
  <style>
    body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background-color: #000; }
    canvas { display: block; width: 100%; height: 100%; }
  </style>
</head>
<body>
  <canvas id="canvas"></canvas>
  <script type="module">
    import { Helios } from '@helios-project/core';

    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const helios = new Helios({ duration: 5, fps: 30 });
    helios.bindToDocumentTimeline();

    helios.subscribe((state) => {
      const { width, height } = canvas;
      const t = state.time; // in seconds

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#fff';
      const x = (Math.sin(t) + 1) / 2 * (width - 100) + 50;
      const y = height / 2;
      ctx.beginPath();
      ctx.arc(x, y, 50, 0, Math.PI * 2);
      ctx.fill();
    });
  </script>
</body>
</html>`;

  fs.writeFileSync(path.join(compDir, 'composition.html'), template);

  // Return the new composition info
  const displayName = dirName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return {
    id: dirName,
    name: displayName,
    url: `/@fs${path.join(compDir, 'composition.html')}`,
    description: \`Example: \${displayName}\`
  };
}

function getAssetType(ext: string): AssetInfo['type'] {
  const images = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'];
  const videos = ['.mp4', '.webm', '.mov'];
  const audio = ['.mp3', '.wav', '.aac', '.ogg'];
  const fonts = ['.ttf', '.otf', '.woff', '.woff2'];
  const models = ['.glb', '.gltf'];
  const json = ['.json'];
  const shaders = ['.glsl', '.vert', '.frag'];

  if (images.includes(ext)) return 'image';
  if (videos.includes(ext)) return 'video';
  if (audio.includes(ext)) return 'audio';
  if (fonts.includes(ext)) return 'font';
  if (models.includes(ext)) return 'model';
  if (json.includes(ext)) return 'json';
  if (shaders.includes(ext)) return 'shader';
  return 'other';
}

export function findAssets(rootDir: string): AssetInfo[] {
  const projectRoot = getProjectRoot(rootDir);

  if (!fs.existsSync(projectRoot)) {
    console.warn(`Project root directory not found at: ${projectRoot}`);
    return [];
  }

  const assets: AssetInfo[] = [];

  function scan(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (['node_modules', '.git', 'dist', 'build'].includes(entry.name)) continue;
        scan(fullPath);
      } else {
        const ext = path.extname(entry.name).toLowerCase();
        const type = getAssetType(ext);

        if (type !== 'other') {
           assets.push({
             id: fullPath,
             name: entry.name,
             url: `/@fs${fullPath}`,
             type
           });
        }
      }
    }
  }

  scan(projectRoot);
  return assets;
}
