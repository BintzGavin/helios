import fs from 'fs';
import path from 'path';
import degit from 'degit';
import chalk from 'chalk';

export async function fetchExamples(): Promise<string[]> {
  try {
    const response = await fetch('https://api.github.com/repos/BintzGavin/helios/contents/examples');
    if (!response.ok) {
      throw new Error(`Failed to fetch examples: ${response.statusText}`);
    }
    const data = await response.json() as any[];
    return data
      .filter((item: any) => item.type === 'dir')
      .map((item: any) => item.name);
  } catch (error) {
    console.warn(chalk.yellow('Failed to fetch examples list from GitHub.'));
    return [];
  }
}

export async function downloadExample(name: string, targetDir: string): Promise<void> {
  const emitter = degit(`BintzGavin/helios/examples/${name}`, {
    cache: false,
    force: true,
    verbose: false,
  });

  await emitter.clone(targetDir);
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
