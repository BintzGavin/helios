import { Command } from 'commander';
import { registerDeployCommand } from './packages/cli/dist/commands/deploy.js';

const program = new Command();
registerDeployCommand(program);
program.parse(['node', 'helios', 'deploy', 'cloudflare-sandbox']);
