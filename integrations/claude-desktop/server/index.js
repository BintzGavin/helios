// Starts the Helios MCP server (`helios mcp`) for Claude Desktop and relays MCP over stdio.
//
// Claude runs this file in its built-in Node runtime, which can't run the Helios CLI itself
// (rendering starts child processes with the running Node), so it finds a system Node 20+ and
// runs the CLI with it: HELIOS_CLI when set (a local checkout), otherwise the published
// package through npx. The built-in runtime gives children no real stdio, so pipe explicitly.
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const MIN_NODE_MAJOR = 20;
const home = os.homedir();
const root = process.env.HELIOS_ROOT || path.join(home, 'Movies', 'Helios');
const cliVersion = process.env.HELIOS_CLI_VERSION || 'latest';

function fail(message) {
  process.stderr.write(`Helios: ${message}\n`);
  process.exit(1);
}

function nodeMajor(bin) {
  const out = spawnSync(bin, ['-v'], { encoding: 'utf8', timeout: 5000 });
  const match = /^v(\d+)\./.exec((out.stdout || '').trim());
  return match ? Number(match[1]) : 0;
}

/** Folders that may hold `node`: PATH first, then the usual installers' locations. */
function candidateDirs() {
  const dirs = (process.env.PATH || '').split(path.delimiter).filter(Boolean);
  dirs.push('/opt/homebrew/bin', '/usr/local/bin', path.join(home, '.volta', 'bin'), path.join(home, '.local', 'bin'));
  for (const base of [path.join(home, '.nvm', 'versions', 'node'), path.join(home, '.fnm', 'node-versions')]) {
    try {
      const versions = fs.readdirSync(base).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
      for (const v of versions) dirs.push(path.join(base, v, 'bin'), path.join(base, v, 'installation', 'bin'));
    } catch {}
  }
  return [...new Set(dirs)];
}

function findNode() {
  if (process.env.HELIOS_NODE) return process.env.HELIOS_NODE;
  for (const dir of candidateDirs()) {
    const bin = path.join(dir, process.platform === 'win32' ? 'node.exe' : 'node');
    if (fs.existsSync(bin) && nodeMajor(bin) >= MIN_NODE_MAJOR) return bin;
  }
  return null;
}

const node = findNode();
if (!node) fail(`Helios needs Node.js ${MIN_NODE_MAJOR} or newer. Install it from https://nodejs.org, then turn the Helios extension off and on.`);
const nodeDir = path.dirname(node);

let command;
let args;
if (process.env.HELIOS_CLI) {
  command = node;
  args = [process.env.HELIOS_CLI, 'mcp', '--root', root];
} else {
  const pkg = [`@helios-project/cli@${cliVersion}`, 'mcp', '--root', root];
  const npxCli = path.join(nodeDir, '..', 'lib', 'node_modules', 'npm', 'bin', 'npx-cli.js');
  const npxBin = path.join(nodeDir, process.platform === 'win32' ? 'npx.cmd' : 'npx');
  if (fs.existsSync(npxCli)) {
    command = node;
    args = [npxCli, '-y', ...pkg];
  } else if (fs.existsSync(npxBin)) {
    command = npxBin;
    args = ['-y', ...pkg];
  } else {
    fail(`Could not find npx next to ${node}. Reinstall Node.js from https://nodejs.org.`);
  }
}

const env = { ...process.env, PATH: [nodeDir, process.env.PATH].filter(Boolean).join(path.delimiter) };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'], env });
process.stdin.pipe(child.stdin);
child.stdout.pipe(process.stdout);
child.stderr.on('data', (d) => process.stderr.write(d));
child.on('error', (e) => fail(e.message));
child.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
process.stdin.on('end', () => child.stdin.end());
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig));
