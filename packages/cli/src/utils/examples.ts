import fs from 'fs';
import path from 'path';
import { downloadTemplate } from 'giget';
import chalk from 'chalk';

export async function fetchExamples(repoPath: string = 'BintzGavin/helios/examples'): Promise<string[]> {
  try {
    const parts = repoPath.split('/');
    if (parts.length < 2) {
      console.warn(chalk.yellow(`Invalid repository format: ${repoPath}`));
      return [];
    }

    const owner = parts[0];
    const repo = parts[1];
    const subdir = parts.slice(2).join('/');

    let url = `https://api.github.com/repos/${owner}/${repo}/contents`;
    if (subdir) {
      url += `/${subdir}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch examples: ${response.statusText}`);
    }
    const data = await response.json() as any[];
    if (!Array.isArray(data)) {
      console.warn(chalk.yellow(`Path ${repoPath} is not a directory.`));
      return [];
    }
    return data
      .filter((item: any) => item.type === 'dir')
      .map((item: any) => item.name);
  } catch (error) {
    console.warn(chalk.yellow(`Failed to fetch examples list from ${repoPath}.`));
    return [];
  }
}

export async function downloadExample(name: string, targetDir: string, repoBase: string = 'BintzGavin/helios/examples'): Promise<void> {
  // Ensure no double slashes if repoBase ends with /
  const base = repoBase.endsWith('/') ? repoBase.slice(0, -1) : repoBase;

  // Construct giget source string
  // giget expects input like "github:owner/repo/subdir" or "owner/repo/subdir" (defaults to github)
  let source = `${base}/${name}`;
  if (!source.includes(':')) {
    source = `github:${source}`;
  }

  try {
    await downloadTemplate(source, {
      dir: targetDir,
      force: true,
    });
  } catch (error) {
    throw new Error(`Failed to download example '${name}' from '${source}': ${(error as Error).message}`);
  }
}

export function transformProject(targetDir: string) {
  // 1. package.json
  const pkgPath = path.join(targetDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkgContent = fs.readFileSync(pkgPath, 'utf-8');
      const pkg = JSON.parse(pkgContent);

      const processDeps = (deps: Record<string, string> = {}) => {
        for (const [key, value] of Object.entries(deps)) {
          if (value.startsWith('file:') && key.startsWith('@helios-project/')) {
            deps[key] = 'latest';
          }
        }
      };

      if (pkg.dependencies) processDeps(pkg.dependencies);
      if (pkg.devDependencies) processDeps(pkg.devDependencies);

      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
    } catch (e) {
      console.warn(chalk.yellow('Failed to transform package.json'));
    }
  }

  // 2. vite.config.ts
  const vitePath = path.join(targetDir, 'vite.config.ts');
  if (fs.existsSync(vitePath)) {
    try {
      let content = fs.readFileSync(vitePath, 'utf-8');

      // Handle imports cleanup first
      // Remove searchForWorkspaceRoot from imports if present with others
      content = content.replace(/,\s*searchForWorkspaceRoot\b/g, '');
      content = content.replace(/\bsearchForWorkspaceRoot\s*,\s*/g, '');
      // Remove standalone import if it was the only one
      content = content.replace(/import\s*\{\s*searchForWorkspaceRoot\s*\}\s*from\s*['"]vite['"];?\r?\n?/g, '');

      // Split lines to filter out usages
      const lines = content.split('\n');
      const newLines = lines.filter(line => {
        // Keep import lines (already cleaned up)
        if (line.trim().startsWith('import')) return true;

        // Remove lines using searchForWorkspaceRoot function
        if (line.includes('searchForWorkspaceRoot(')) return false;

        // Remove lines with aliases to @helios-project/core
        if (line.includes("'@helios-project/core':")) return false;
        if (line.includes('"@helios-project/core":')) return false;

        return true;
      });
      content = newLines.join('\n');

      fs.writeFileSync(vitePath, content);
    } catch (e) {
      console.warn(chalk.yellow('Failed to transform vite.config.ts'));
    }
  }

  // 3. tsconfig.json
  const tsconfigPath = path.join(targetDir, 'tsconfig.json');
  if (fs.existsSync(tsconfigPath)) {
    try {
      let content = fs.readFileSync(tsconfigPath, 'utf-8');

      // Line based removal for paths
      const lines = content.split('\n');
      const newLines = lines.filter(line => {
         // Check for path mapping to core
         if (line.includes('"@helios-project/core":')) return false;
         return true;
      });
      content = newLines.join('\n');

      fs.writeFileSync(tsconfigPath, content);
    } catch (e) {
      console.warn(chalk.yellow('Failed to transform tsconfig.json'));
    }
  }

  // 4. postcss.config.cjs
  const postcssPath = path.join(targetDir, 'postcss.config.cjs');
  if (!fs.existsSync(postcssPath)) {
    fs.writeFileSync(postcssPath, 'module.exports = {};\n');
  }
}
