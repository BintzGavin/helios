import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun';

export function detectPackageManager(rootDir: string): PackageManager {
  if (fs.existsSync(path.resolve(rootDir, 'yarn.lock'))) {
    return 'yarn';
  }
  if (fs.existsSync(path.resolve(rootDir, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }
  if (fs.existsSync(path.resolve(rootDir, 'bun.lockb'))) {
    return 'bun';
  }
  return 'npm';
}

export async function installPackage(
  rootDir: string,
  dependencies: string[],
  isDev: boolean = false
): Promise<void> {
  const pm = detectPackageManager(rootDir);
  const args: string[] = [];

  switch (pm) {
    case 'npm':
      args.push('install');
      if (isDev) args.push('--save-dev');
      break;
    case 'yarn':
      args.push('add');
      if (isDev) args.push('--dev');
      break;
    case 'pnpm':
      args.push('add');
      if (isDev) args.push('--save-dev');
      break;
    case 'bun':
      args.push('add');
      if (isDev) args.push('--dev');
      break;
  }

  args.push(...dependencies);

  return new Promise((resolve, reject) => {
    const command = process.platform === 'win32' ? `${pm}.cmd` : pm;
    const child = spawn(command, args, {
      cwd: rootDir,
      stdio: 'inherit',
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Failed to install dependencies with ${pm}`));
      }
    });
  });
}
