import { Command } from 'commander';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

export function registerStudioCommand(program: Command) {
  program
    .command('studio')
    .description('Launch the Helios Studio')
    .action(async () => {
      console.log('Starting Studio...');

      // Resolve path to packages/studio
      // This file is in .../packages/cli/dist/commands/studio.js
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const studioPath = path.resolve(__dirname, '../../../studio');

      console.log(`Resolved Studio path: ${studioPath}`);

      const child = spawn('npm', ['run', 'dev'], {
        cwd: studioPath,
        env: {
          ...process.env,
          HELIOS_PROJECT_ROOT: process.env.HELIOS_PROJECT_ROOT || process.cwd(),
        },
        stdio: 'inherit',
        shell: true,
      });

      child.on('error', (err) => {
        console.error('Failed to start studio:', err);
      });

      child.on('close', (code) => {
        if (code !== 0) {
           console.log(`Studio process exited with code ${code}`);
        }
      });
    });
}
