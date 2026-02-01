import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

export interface DocSection {
  id: string;
  package: string;
  title: string;
  content: string;
}

export function findDocumentation(cwd: string): DocSection[] {
  const sections: DocSection[] = [];

  // Helper to parse markdown
  const parseMarkdown = (pkg: string, content: string) => {
    const lines = content.split('\n');
    let currentTitle = 'Introduction';
    let currentContent: string[] = [];
    let sectionCount = 0;

    const flush = () => {
      if (currentContent.length > 0) {
        // Skip empty sections
        const text = currentContent.join('\n').trim();
        if (text) {
            sections.push({
              id: `${pkg}-${sectionCount++}`,
              package: pkg,
              title: currentTitle,
              content: text
            });
        }
      }
      currentContent = [];
    };

    for (const line of lines) {
      if (line.startsWith('# ')) {
        flush();
        currentTitle = line.substring(2).trim();
      } else if (line.startsWith('## ')) {
        flush();
        currentTitle = line.substring(3).trim();
      } else {
        currentContent.push(line);
      }
    }
    flush();
  };

  // Strategy 1: Monorepo Development
  // We assume we are in packages/studio or running from root

  let monorepoRoot: string | null = null;
  // If cwd is package root (e.g. packages/studio)
  if (fs.existsSync(path.resolve(cwd, '../../packages/core'))) {
      monorepoRoot = path.resolve(cwd, '../../');
  }
  // If cwd is repo root
  else if (fs.existsSync(path.resolve(cwd, 'packages/core'))) {
      monorepoRoot = cwd;
  }

  if (monorepoRoot) {
      const packages = [
        { name: 'core', path: 'packages/core' },
        { name: 'studio', path: 'packages/studio' },
        { name: 'renderer', path: 'packages/renderer' },
        { name: 'player', path: 'packages/player' },
        { name: 'root', path: '.' }
      ];

      for (const p of packages) {
          const readmePath = path.join(monorepoRoot, p.path, 'README.md');
          if (fs.existsSync(readmePath)) {
              try {
                  const content = fs.readFileSync(readmePath, 'utf-8');
                  parseMarkdown(p.name, content);
              } catch (e) {
                  console.error(`Failed to read README for ${p.name}`, e);
              }
          }
      }

      // If we found docs, return them.
      // If not (e.g. strict peer dep issues in some monorepo tools), fall through.
      if (sections.length > 0) return sections;
  }

  // Strategy 2: Installed via NPM (node_modules)
  try {
      // Use createRequire to resolve package paths from the Current Working Directory
      // This ensures we find what the user has installed.
      const requireFunc = createRequire(path.join(cwd, 'index.js'));

      const pkgNames = {
          'core': '@helios-project/core',
          'renderer': '@helios-project/renderer',
          'player': '@helios-project/player',
          'studio': '@helios-project/studio'
      };

      for (const [shortName, pkgName] of Object.entries(pkgNames)) {
          try {
              const pkgJsonPath = requireFunc.resolve(`${pkgName}/package.json`);
              const pkgRoot = path.dirname(pkgJsonPath);
              const readmePath = path.join(pkgRoot, 'README.md');

              if (fs.existsSync(readmePath)) {
                  const content = fs.readFileSync(readmePath, 'utf-8');
                  parseMarkdown(shortName, content);
              }
          } catch (e) {
              // Ignore missing packages
          }
      }

  } catch (e) {
      console.warn("Failed to resolve documentation from node_modules", e);
  }

  return sections;
}
