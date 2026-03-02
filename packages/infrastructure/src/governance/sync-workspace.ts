import fs from 'node:fs/promises';
import path from 'node:path';

export interface SyncOptions {
  rootDir: string;
}

interface PackageJson {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

/**
 * Scans the provided root directory for package.json files within `packages/*`,
 * builds a map of workspace package versions (e.g., @helios-project/*), and
 * updates their dependencies to match explicit version numbers (e.g., ^0.24.0).
 *
 * @param options Configuration options, specifically the bounded root directory
 */
export async function syncWorkspaceDependencies(options: SyncOptions): Promise<void> {
  const { rootDir } = options;
  const packagesDir = path.join(rootDir, 'packages');

  let entries;
  try {
    entries = await fs.readdir(packagesDir, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return; // No packages directory, nothing to sync
    }
    throw error;
  }

  const packagePaths: string[] = [];
  const versionMap = new Map<string, string>();
  const parsedPackages = new Map<string, PackageJson>();

  // 1. Discover packages and build the version map
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const packageJsonPath = path.join(packagesDir, entry.name, 'package.json');
      try {
        const content = await fs.readFile(packageJsonPath, 'utf8');
        const pkg: PackageJson = JSON.parse(content);

        if (pkg.name && pkg.version) {
          packagePaths.push(packageJsonPath);
          versionMap.set(pkg.name, pkg.version);
          parsedPackages.set(packageJsonPath, pkg);
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
           throw error;
        }
        // Ignore directories without package.json
      }
    }
  }

  // 2. Synchronize dependencies
  for (const pkgPath of packagePaths) {
    const pkg = parsedPackages.get(pkgPath)!;
    let modified = false;

    const updateDeps = (deps?: Record<string, string>) => {
      if (!deps) return;
      for (const [depName, currentVersion] of Object.entries(deps)) {
        if (versionMap.has(depName)) {
          const actualVersion = versionMap.get(depName)!;
          const targetVersion = `^${actualVersion}`;
          if (currentVersion !== targetVersion) {
            deps[depName] = targetVersion;
            modified = true;
          }
        }
      }
    };

    updateDeps(pkg.dependencies);
    updateDeps(pkg.devDependencies);

    // 3. Write back if modified
    if (modified) {
      await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    }
  }
}
