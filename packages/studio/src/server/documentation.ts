import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

export interface DocSection {
  id: string;
  package: string;
  title: string;
  content: string;
}

export function resolveDocumentationPath(cwd: string, pkgName: string): string | null {
  // Strategy 1: Monorepo Development
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
      const paths: Record<string, string> = {
        'core': 'packages/core',
        'studio': 'packages/studio',
        'renderer': 'packages/renderer',
        'player': 'packages/player',
        'root': '.'
      };

      if (paths[pkgName]) {
          const readmePath = path.join(monorepoRoot, paths[pkgName], 'README.md');
          if (fs.existsSync(readmePath)) {
              return readmePath;
          }
      }
      return null;
  }

  // Strategy 2: Installed via NPM (node_modules)
  try {
      if (pkgName === 'root') {
          const readmePath = path.join(cwd, 'README.md');
          return fs.existsSync(readmePath) ? readmePath : null;
      }

      // Use createRequire to resolve package paths from the Current Working Directory
      const requireFunc = createRequire(path.join(cwd, 'index.js'));
      const pkgMap: Record<string, string> = {
          'core': '@helios-project/core',
          'renderer': '@helios-project/renderer',
          'player': '@helios-project/player',
          'studio': '@helios-project/studio'
      };

      if (pkgMap[pkgName]) {
           try {
              const pkgJsonPath = requireFunc.resolve(`${pkgMap[pkgName]}/package.json`);
              const pkgRoot = path.dirname(pkgJsonPath);
              const readmePath = path.join(pkgRoot, 'README.md');
              if (fs.existsSync(readmePath)) {
                  return readmePath;
              }
           } catch (e) {
               // Ignore missing packages
           }
      }
  } catch (e) {
      console.warn("Failed to resolve documentation from node_modules", e);
  }

  return null;
}

// Helper to parse markdown
function parseMarkdown(pkg: string, content: string, sections: DocSection[], titlePrefix: string = '') {
  const lines = content.split('\n');
  let currentTitle = titlePrefix ? `${titlePrefix}Introduction` : 'Introduction';
  let currentContent: string[] = [];
  // Calculate starting index to ensure unique IDs if appending to existing package sections
  let sectionCount = sections.filter(s => s.package === pkg).length;

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
      currentTitle = (titlePrefix || '') + line.substring(2).trim();
    } else if (line.startsWith('## ')) {
      flush();
      currentTitle = (titlePrefix || '') + line.substring(3).trim();
    } else {
      currentContent.push(line);
    }
  }
  flush();
}

function findSkills(cwd: string, sections: DocSection[]) {
  let skillsRoot: string | null = null;
  const possiblePaths = [
      path.resolve(cwd, '../../.agents/skills/helios'), // From packages/studio
      path.resolve(cwd, '.agents/skills/helios')        // From root
  ];

  for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
          skillsRoot = p;
          break;
      }
  }

  if (!skillsRoot) return;

  const packages = ['core', 'studio', 'renderer', 'player', 'cli'];
  for (const pkg of packages) {
      const skillPath = path.join(skillsRoot, pkg, 'SKILL.md');
      if (fs.existsSync(skillPath)) {
          try {
              const content = fs.readFileSync(skillPath, 'utf-8');
              parseMarkdown(pkg, content, sections, 'Agent Skill: ');
          } catch (e) {
              console.error(`Failed to read SKILL.md for ${pkg}`, e);
          }
      }
  }
}

export function findDocumentation(cwd: string): DocSection[] {
  const sections: DocSection[] = [];

  const packages = ['core', 'studio', 'renderer', 'player', 'root'];

  for (const pkg of packages) {
      const readmePath = resolveDocumentationPath(cwd, pkg);
      if (readmePath) {
          try {
              const content = fs.readFileSync(readmePath, 'utf-8');
              parseMarkdown(pkg, content, sections);
          } catch (e) {
              console.error(`Failed to read README for ${pkg}`, e);
          }
      }
  }

  findSkills(cwd, sections);

  return sections;
}
