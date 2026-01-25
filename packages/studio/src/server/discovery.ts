import fs from 'fs';
import path from 'path';

export interface CompositionInfo {
  id: string;
  name: string;
  url: string;
  description?: string;
}

export function findCompositions(rootDir: string): CompositionInfo[] {
  // rootDir is expected to be packages/studio (or wherever the vite server is running from)
  // We want to look at ../../examples
  const examplesDir = path.resolve(rootDir, '../../examples');

  if (!fs.existsSync(examplesDir)) {
    console.warn(`Examples directory not found at: ${examplesDir}`);
    return [];
  }

  const entries = fs.readdirSync(examplesDir, { withFileTypes: true });
  const compositions: CompositionInfo[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const compPath = path.join(examplesDir, entry.name, 'composition.html');
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
