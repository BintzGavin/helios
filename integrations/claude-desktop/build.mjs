// Builds dist/helios.mcpb, the Claude Desktop extension, pinned to the CLI version in
// packages/cli/package.json. Run it after that version is published to npm.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../..');
const version = JSON.parse(fs.readFileSync(path.join(repo, 'packages/cli/package.json'), 'utf8')).version;

const stage = path.join(here, 'dist', 'stage');
fs.rmSync(stage, { recursive: true, force: true });
fs.mkdirSync(path.join(stage, 'server'), { recursive: true });

const manifest = JSON.parse(fs.readFileSync(path.join(here, 'manifest.json'), 'utf8'));
manifest.version = version;
manifest.server.mcp_config.env.HELIOS_CLI_VERSION = version;
fs.writeFileSync(path.join(stage, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
fs.copyFileSync(path.join(here, 'server/index.js'), path.join(stage, 'server/index.js'));
fs.copyFileSync(path.join(repo, 'assets/brand/icon-512.png'), path.join(stage, 'icon.png'));

const out = path.join(here, 'dist', 'helios.mcpb');
const mcpb = ['-y', '@anthropic-ai/mcpb@2.1.2'];
execFileSync('npx', [...mcpb, 'validate', path.join(stage, 'manifest.json')], { stdio: 'inherit' });
execFileSync('npx', [...mcpb, 'pack', stage, out], { stdio: 'inherit' });
console.log(`Built ${path.relative(repo, out)} for @helios-project/cli@${version}`);
