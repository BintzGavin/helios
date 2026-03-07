import fs from 'node:fs/promises';
import path from 'node:path';
import { syncWorkspaceDependencies } from '../src/governance/sync-workspace.js';

async function main() {
  const tmpDir = path.join(process.cwd(), '.tmp-sync-example');
  const packagesDir = path.join(tmpDir, 'packages');

  try {
    // 1. Scaffold dummy packages and package.json files with outdated deps
    console.log(`Creating dummy workspace at ${tmpDir}...`);
    await fs.mkdir(packagesDir, { recursive: true });

    const pkg1Dir = path.join(packagesDir, 'pkg-a');
    await fs.mkdir(pkg1Dir, { recursive: true });
    const pkg1Json = {
      name: '@helios-project/pkg-a',
      version: '1.2.3',
      dependencies: {
        'external-dep': '^1.0.0'
      }
    };
    await fs.writeFile(path.join(pkg1Dir, 'package.json'), JSON.stringify(pkg1Json, null, 2), 'utf8');

    const pkg2Dir = path.join(packagesDir, 'pkg-b');
    await fs.mkdir(pkg2Dir, { recursive: true });
    // pkg-b has an OUTDATED dependency on pkg-a (1.0.0 instead of actual 1.2.3)
    const pkg2Json = {
      name: '@helios-project/pkg-b',
      version: '2.0.0',
      dependencies: {
        '@helios-project/pkg-a': '^1.0.0'
      }
    };
    await fs.writeFile(path.join(pkg2Dir, 'package.json'), JSON.stringify(pkg2Json, null, 2), 'utf8');

    console.log('\n--- Before Sync ---');
    console.log('pkg-a version:', pkg1Json.version);
    console.log('pkg-b dependencies:');
    console.log(JSON.stringify(pkg2Json.dependencies, null, 2));

    // 2. Call syncWorkspaceDependencies({ rootDir: tmpDir })
    console.log('\nRunning syncWorkspaceDependencies...');
    await syncWorkspaceDependencies({ rootDir: tmpDir });

    // 3. Read and log the updated package.json to show synchronized versions
    console.log('\n--- After Sync ---');
    const updatedPkg2Content = await fs.readFile(path.join(pkg2Dir, 'package.json'), 'utf8');
    const updatedPkg2 = JSON.parse(updatedPkg2Content);
    console.log('pkg-b dependencies:');
    console.log(JSON.stringify(updatedPkg2.dependencies, null, 2));

  } catch (err) {
    console.error('Error during example execution:', err);
  } finally {
    // 4. Clean up tmpDir
    console.log(`\nCleaning up temporary directory ${tmpDir}...`);
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch (cleanupErr) {
      console.error('Failed to clean up:', cleanupErr);
    }
  }
}

main();
