import fs from 'fs';
import path from 'path';
import { templates, TemplateId } from './templates';
import { CompositionOptions } from './templates/types';

export interface CompositionInfo {
  id: string;
  name: string;
  url: string;
  thumbnailUrl?: string;
  description?: string;
  metadata?: CompositionOptions;
}

export interface AssetInfo {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video' | 'audio' | 'font' | 'model' | 'json' | 'shader' | 'folder' | 'other';
  relativePath: string;
}

const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.helios']);

export function getProjectRoot(cwd: string): string {
  if (process.env.HELIOS_PROJECT_ROOT) {
    return path.resolve(process.env.HELIOS_PROJECT_ROOT);
  }
  return path.resolve(cwd, '../../examples');
}

export async function findCompositions(rootDir: string): Promise<CompositionInfo[]> {
  // rootDir is expected to be packages/studio (or wherever the vite server is running from)
  const projectRoot = getProjectRoot(rootDir);

  if (!fs.existsSync(projectRoot)) {
    console.warn(`Project root directory not found at: ${projectRoot}`);
    return [];
  }

  // Helper to check existence asynchronously
  async function exists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async function scan(dir: string): Promise<CompositionInfo[]> {
    const compPath = path.join(dir, 'composition.html');

    // Check if it is a composition first (avoid readdir if so)
    if (await exists(compPath)) {
        // It is a composition
        const relativePath = path.relative(projectRoot, dir);
        // Ensure forward slashes for ID consistency across platforms
        const id = relativePath.split(path.sep).join('/');

        // Format name: "simple-canvas-animation" -> "Simple Canvas Animation"
        const name = path.basename(dir)
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        // Read metadata if exists
        let metadata: CompositionOptions | undefined;
        const metaPath = path.join(dir, 'composition.json');
        if (await exists(metaPath)) {
          try {
            const content = await fs.promises.readFile(metaPath, 'utf-8');
            metadata = JSON.parse(content);
          } catch (e) {
            console.warn(`Failed to parse metadata for ${id}`, e);
          }
        }

        // Check for thumbnail
        let thumbnailUrl: string | undefined;
        const thumbPath = path.join(dir, 'thumbnail.png');
        if (await exists(thumbPath)) {
          thumbnailUrl = `/@fs${thumbPath}`;
        }

        return [{
          id,
          name,
          // Use /@fs/ prefix with absolute path so Vite can serve files outside root
          // Ensure we don't double slash if path starts with /
          url: `/@fs${compPath}`,
          thumbnailUrl,
          description: id,
          metadata
        }];
    }

    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });

      // Recurse into subdirectories
      const subdirs = entries.filter(e => e.isDirectory() && !IGNORED_DIRS.has(e.name));
      const results: CompositionInfo[] = [];

      // Limit concurrency to avoid thread pool exhaustion
      const CONCURRENCY_LIMIT = 20;

      for (let i = 0; i < subdirs.length; i += CONCURRENCY_LIMIT) {
        const chunk = subdirs.slice(i, i + CONCURRENCY_LIMIT);
        const chunkPromises = chunk.map(subdir => scan(path.join(dir, subdir.name)));
        const chunkResults = await Promise.all(chunkPromises);
        results.push(...chunkResults.flat());
      }

      return results;

    } catch (e) {
      console.warn(`Failed to scan directory: ${dir}`, e);
      return [];
    }
  }

  return scan(projectRoot);
}

export function deleteComposition(rootDir: string, id: string): void {
  const projectRoot = getProjectRoot(rootDir);
  const compDir = path.resolve(projectRoot, id);

  // Security check: ensure path is within project root
  if (!compDir.startsWith(projectRoot)) {
    throw new Error('Access denied: Cannot delete outside project root');
  }

  if (!fs.existsSync(compDir)) {
    throw new Error(`Composition "${id}" not found`);
  }

  // Sanity check: ensure it looks like a composition
  if (!fs.existsSync(path.join(compDir, 'composition.html'))) {
    throw new Error(`Directory "${id}" is not a valid composition (missing composition.html)`);
  }

  fs.rmSync(compDir, { recursive: true, force: true });
}

export function renameComposition(
  rootDir: string,
  id: string,
  newName: string
): CompositionInfo {
  const projectRoot = getProjectRoot(rootDir);
  const sourceDir = path.resolve(projectRoot, id);

  // Security check
  if (!sourceDir.startsWith(projectRoot)) {
    throw new Error('Access denied: Cannot rename outside project root');
  }

  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Composition "${id}" not found`);
  }

  // Sanitize new name to create dirName
  let dirName = newName.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (!dirName) {
    throw new Error('Invalid composition name');
  }

  // If the directory name is same (case insensitive or after sanitization), just return current info
  // But wait, if they rename "My Comp" to "My  Comp", sanitization might make it same "my-comp".
  // In that case, we should probably still update the DISPLAY name in metadata, but filesystem rename might fail or be no-op.
  // Actually, renameComposition implies changing the ID/Directory.
  // If the user wants to change display name only, that's strictly metadata.
  // BUT, in this project, ID is derived from directory name.
  // So if dirName is same as current ID, it's essentially a metadata update for "name" (which we don't store explicitly, we derive it).
  // However, `findCompositions` derives name from directory name.
  // So to change the name, we MUST change the directory name.

  const targetDir = path.join(projectRoot, dirName);

  if (targetDir === sourceDir) {
     // No change in directory name
     return {
        id,
        name: newName, // Return the requested name, although next scan will derive it from dir again
        url: `/@fs${path.join(sourceDir, 'composition.html')}`
     };
  }

  if (fs.existsSync(targetDir)) {
    throw new Error(`Composition "${newName}" (directory: ${dirName}) already exists`);
  }

  fs.renameSync(sourceDir, targetDir);

  // Return new info
  const displayName = dirName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const compPath = path.join(targetDir, 'composition.html');

  // Try to preserve metadata
  let metadata: CompositionOptions | undefined;
  const metaPath = path.join(targetDir, 'composition.json');
  if (fs.existsSync(metaPath)) {
    try {
      metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    } catch (e) {
      console.warn(`Failed to parse metadata for ${dirName}`, e);
    }
  }

  // Check for thumbnail
  let thumbnailUrl: string | undefined;
  const thumbPath = path.join(targetDir, 'thumbnail.png');
  if (fs.existsSync(thumbPath)) {
    thumbnailUrl = `/@fs${thumbPath}`;
  }

  return {
    id: dirName,
    name: displayName,
    url: `/@fs${compPath}`,
    thumbnailUrl,
    description: `Example: ${displayName}`,
    metadata
  };
}

export function duplicateComposition(
  rootDir: string,
  sourceId: string,
  newName: string
): CompositionInfo {
  const projectRoot = getProjectRoot(rootDir);
  const sourceDir = path.resolve(projectRoot, sourceId);

  // Security check
  if (!sourceDir.startsWith(projectRoot)) {
    throw new Error('Access denied: Cannot duplicate outside project root');
  }

  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Source composition "${sourceId}" not found`);
  }

  // Sanitize new name to create dirName
  let dirName = newName.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (!dirName) {
    throw new Error('Invalid composition name');
  }

  const targetDir = path.join(projectRoot, dirName);
  if (fs.existsSync(targetDir)) {
    throw new Error(`Composition "${newName}" (directory: ${dirName}) already exists`);
  }

  // Copy directory
  fs.cpSync(sourceDir, targetDir, { recursive: true });

  // Read metadata to return correct info
  let metadata: CompositionOptions | undefined;
  const metaPath = path.join(targetDir, 'composition.json');
  if (fs.existsSync(metaPath)) {
    try {
      metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    } catch (e) {
      console.warn(`Failed to parse metadata for ${dirName}`, e);
    }
  }

  const displayName = dirName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const compPath = path.join(targetDir, 'composition.html');

  // Check for thumbnail
  let thumbnailUrl: string | undefined;
  const thumbPath = path.join(targetDir, 'thumbnail.png');
  if (fs.existsSync(thumbPath)) {
    thumbnailUrl = `/@fs${thumbPath}`;
  }

  return {
    id: dirName,
    name: displayName,
    url: `/@fs${compPath}`,
    thumbnailUrl,
    description: `Example: ${displayName}`,
    metadata
  };
}

export function createComposition(
    rootDir: string,
    name: string,
    templateId: string = 'vanilla',
    options?: CompositionOptions
): CompositionInfo {
  const projectRoot = getProjectRoot(rootDir);

  // Sanitize name: lowercase, replace spaces with hyphens, remove special chars
  let dirName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

  // Enforce -solid suffix for Solid template to allow vite.config.ts regex to separate frameworks
  if (templateId === 'solid' && !dirName.includes('solid')) {
      dirName = `${dirName}-solid`;
  }

  if (!dirName) {
    throw new Error('Invalid composition name');
  }

  const compDir = path.join(projectRoot, dirName);
  if (fs.existsSync(compDir)) {
    throw new Error(`Composition "${name}" (directory: ${dirName}) already exists`);
  }

  const template = templates[templateId] || templates['vanilla'];
  if (!template) {
      throw new Error(`Template "${templateId}" not found`);
  }

  // Default options if not provided
  const compOptions: CompositionOptions = options || {
      width: 1920,
      height: 1080,
      fps: 30,
      duration: 5
  };

  fs.mkdirSync(compDir, { recursive: true });

  const files = template.generate(name, compOptions);
  for (const file of files) {
      const filePath = path.join(compDir, file.path);
      const fileDir = path.dirname(filePath);
      if (!fs.existsSync(fileDir)) {
          fs.mkdirSync(fileDir, { recursive: true });
      }
      fs.writeFileSync(filePath, file.content);
  }

  // Write composition.json
  fs.writeFileSync(path.join(compDir, 'composition.json'), JSON.stringify(compOptions, null, 2));

  // Return the new composition info
  const displayName = dirName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return {
    id: dirName,
    name: displayName,
    url: `/@fs${path.join(compDir, 'composition.html')}`,
    description: `Example: ${displayName}`,
    metadata: compOptions
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

export async function findAssets(rootDir: string): Promise<AssetInfo[]> {
  const projectRoot = getProjectRoot(rootDir);

  if (!fs.existsSync(projectRoot)) {
    console.warn(`Project root directory not found at: ${projectRoot}`);
    return [];
  }

  const publicDir = path.join(projectRoot, 'public');
  const hasPublic = fs.existsSync(publicDir);
  const scanRoot = hasPublic ? publicDir : projectRoot;

  const assets: AssetInfo[] = [];

  async function scan(dir: string) {
    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      const promises: Promise<void>[] = [];

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (IGNORED_DIRS.has(entry.name)) continue;

          // Add directory as an asset
          const relativePath = path.relative(scanRoot, fullPath).replace(/\\/g, '/');
          // For folders, URL is not really applicable but we provide one consistent with files
          const url = hasPublic ? `/${relativePath}` : `/@fs${fullPath}`;

          assets.push({
            id: fullPath,
            name: entry.name,
            url,
            type: 'folder',
            relativePath
          });

          promises.push(scan(fullPath));
        } else {
          const ext = path.extname(entry.name).toLowerCase();
          const type = getAssetType(ext);

          if (type !== 'other') {
             const relativePath = path.relative(scanRoot, fullPath).replace(/\\/g, '/');
             const url = hasPublic ? `/${relativePath}` : `/@fs${fullPath}`;

             assets.push({
               id: fullPath,
               name: entry.name,
               url,
               type,
               relativePath
             });
          }
        }
      }
      await Promise.all(promises);
    } catch (e) {
      console.warn(`Failed to scan directory: ${dir}`, e);
    }
  }

  await scan(scanRoot);
  return assets;
}

export function renameAsset(
  rootDir: string,
  id: string,
  newName: string
): AssetInfo {
  const projectRoot = getProjectRoot(rootDir);
  const publicDir = path.join(projectRoot, 'public');
  const hasPublic = fs.existsSync(publicDir);
  const scanRoot = hasPublic ? publicDir : projectRoot;

  // Resolve source path
  // id is the full path in the current implementation of findAssets
  const sourcePath = path.resolve(id);

  // Security check
  if (!sourcePath.startsWith(scanRoot)) {
    throw new Error('Access denied: Cannot rename outside project/public root');
  }

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Asset "${id}" not found`);
  }

  const dir = path.dirname(sourcePath);
  const ext = path.extname(sourcePath);

  // Ensure newName has an extension, if not, append original extension
  let finalName = newName;
  if (path.extname(newName) === '') {
    finalName = newName + ext;
  }

  const targetPath = path.join(dir, finalName);

  // Security check for target
  if (!targetPath.startsWith(scanRoot)) {
    throw new Error('Access denied: Cannot rename to outside project/public root');
  }

  if (fs.existsSync(targetPath)) {
    throw new Error(`Asset "${finalName}" already exists`);
  }

  fs.renameSync(sourcePath, targetPath);

  const relativePath = path.relative(scanRoot, targetPath).replace(/\\/g, '/');
  const url = hasPublic ? `/${relativePath}` : `/@fs${targetPath}`;
  const type = getAssetType(path.extname(targetPath).toLowerCase());

  return {
    id: targetPath,
    name: finalName,
    url,
    type,
    relativePath
  };
}

export function createDirectory(
  rootDir: string,
  dirPath: string
): AssetInfo {
  const projectRoot = getProjectRoot(rootDir);
  const publicDir = path.join(projectRoot, 'public');
  const hasPublic = fs.existsSync(publicDir);
  const scanRoot = hasPublic ? publicDir : projectRoot;

  // Sanitize input path to prevent traversal
  const safePath = path.normalize(dirPath).replace(/^(\.\.[\/\\])+/, '');
  const fullPath = path.join(scanRoot, safePath);

  // Security check
  if (!fullPath.startsWith(scanRoot)) {
    throw new Error('Access denied: Cannot create directory outside project/public root');
  }

  if (fs.existsSync(fullPath)) {
    throw new Error(`Directory "${dirPath}" already exists`);
  }

  fs.mkdirSync(fullPath, { recursive: true });

  const relativePath = path.relative(scanRoot, fullPath).replace(/\\/g, '/');
  const url = hasPublic ? `/${relativePath}` : `/@fs${fullPath}`;

  return {
    id: fullPath,
    name: path.basename(fullPath),
    url,
    type: 'folder',
    relativePath
  };
}

export function updateCompositionMetadata(
  rootDir: string,
  id: string,
  metadata: CompositionOptions
): CompositionInfo {
  const projectRoot = getProjectRoot(rootDir);
  const compDir = path.resolve(projectRoot, id);

  // Security check: ensure path is within project root
  if (!compDir.startsWith(projectRoot)) {
    throw new Error('Access denied: Cannot update outside project root');
  }

  if (!fs.existsSync(compDir)) {
    throw new Error(`Composition "${id}" not found`);
  }

  // Read existing metadata
  const metaPath = path.join(compDir, 'composition.json');
  let currentMetadata: CompositionOptions = {
    width: 1920,
    height: 1080,
    fps: 30,
    duration: 5
  };

  if (fs.existsSync(metaPath)) {
    try {
      currentMetadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    } catch (e) {
      console.warn(`Failed to parse metadata for ${id}, using defaults`, e);
    }
  }

  // Merge metadata
  const newMetadata = {
    ...currentMetadata,
    ...metadata
  };

  // Write back
  fs.writeFileSync(metaPath, JSON.stringify(newMetadata, null, 2));

  // Return updated info
  const name = id
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const compPath = path.join(compDir, 'composition.html');

  // Check for thumbnail
  let thumbnailUrl: string | undefined;
  const thumbPath = path.join(compDir, 'thumbnail.png');
  if (fs.existsSync(thumbPath)) {
    thumbnailUrl = `/@fs${thumbPath}`;
  }

  return {
    id: id,
    name: name,
    url: `/@fs${compPath}`,
    thumbnailUrl,
    description: `Example: ${name}`,
    metadata: newMetadata
  };
}
