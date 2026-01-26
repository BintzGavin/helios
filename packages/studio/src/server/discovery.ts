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
  type: 'image' | 'video' | 'audio' | 'font' | 'other';
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

function getAssetType(ext: string): AssetInfo['type'] {
  const images = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'];
  const videos = ['.mp4', '.webm', '.mov'];
  const audio = ['.mp3', '.wav', '.aac', '.ogg'];
  const fonts = ['.ttf', '.otf', '.woff', '.woff2'];

  if (images.includes(ext)) return 'image';
  if (videos.includes(ext)) return 'video';
  if (audio.includes(ext)) return 'audio';
  if (fonts.includes(ext)) return 'font';
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
