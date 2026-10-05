#!/usr/bin/env node
/**
 * Agent video scoreboard.
 *
 * Asks fresh, headless Claude Code sessions for videos, in throwaway directories, under one of
 * four conditions (no framework, Helios, HyperFrames, Remotion), then records per run: which
 * framework it used, did it produce an MP4, does the MP4 match the request (duration, audio,
 * size), does the project re-render identically, how soon it first looked at a frame, how long
 * it took and what it cost, and where it failed. See README.md in this directory, and
 * docs/benchmarks/2026-10-agent-video-benchmark.md for the pre-registered benchmark.
 *
 * No dependencies beyond Node 18+, git, the `claude` CLI, and ffmpeg/ffprobe on PATH.
 */
import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** Every condition the harness knows. The three framework conditions are pinned in conditions.json. */
const CONDITIONS = ['baseline', 'helios', 'hyperframes', 'remotion'];
const PINS = JSON.parse(fs.readFileSync(path.join(HERE, 'conditions.json'), 'utf8'));

const DEFAULTS = {
  model: 'claude-opus-5-5',
  budget: 8,
  timeoutMin: 40,
  parallel: 1,
  repeat: 1,
  conditions: 'baseline,helios',
  skillsDir: path.join(os.homedir(), 'Developer', 'helios-skills'),
  cacheDir: path.join(HERE, 'results', '.cache'),
  rerenderTimeoutMin: 15,
  permissionMode: 'bypassPermissions',
  claudeBin: 'claude',
};

const USAGE = `Usage: node tests/agent-eval/run.mjs [options]

  --prompts <ids>          Comma-separated prompt ids from prompts.json (default: all)
  --conditions <ids>       Any of ${CONDITIONS.join(', ')} (default: ${DEFAULTS.conditions})
  --plugin-dir <path>      Plugin to load for the "helios" condition (default: a wrapper
                           built from --skills-dir, one entry per SKILL.md)
  --skills-dir <path>      helios-skills checkout (default: ${DEFAULTS.skillsDir})
  --pinned                 "helios" loads the published plugin at the commit pinned in
                           conditions.json, like hyperframes and remotion (benchmark mode)
  --cache-dir <path>       Where pinned framework checkouts are kept (default: results/.cache)
  --model <id>             Model for the sessions (default: ${DEFAULTS.model})
  --budget <usd>           Per-run --max-budget-usd cap (default: ${DEFAULTS.budget})
  --stop-at-usd <usd>      Start no new run once the runs so far have cost this much
  --timeout-min <n>        Per-run wall-clock limit (default: ${DEFAULTS.timeoutMin})
  --parallel <n>           Runs at once (default: ${DEFAULTS.parallel})
  --repeat, --reps <n>     Runs per prompt x condition (default: ${DEFAULTS.repeat})
  --determinism            After each run, re-run its render twice and compare 5 frames
  --rerender-timeout-min <n>  Limit per re-render (default: ${DEFAULTS.rerenderTimeoutMin})
  --permission-mode <m>    Passed to claude (default: ${DEFAULTS.permissionMode})
  --out <dir>              Results directory (default: tests/agent-eval/results/<timestamp>)
  --keep-workdirs          Keep each run's working directory (can be large: node_modules)
  --dry-run                Print what would run, spend nothing
  --claude-bin <path>      claude executable (default: claude)
  --rescore <dir>          Rebuild scoreboard.md/json from an existing results directory
  --ratings <packet dir>   With --rescore: merge the raters' ratings.csv from a --blind packet
  --blind <dirs>           Build a blind rating packet from comma-separated results
                           directories into --out (default: results/blind-<timestamp>)
`;

const BOOLEAN_FLAGS = new Set(['dryRun', 'keepWorkdirs', 'determinism', 'pinned']);
const ALIASES = { reps: 'repeat' };

export function parseArgs(argv) {
  const opts = { ...DEFAULTS };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) throw new Error(`Unexpected argument: ${arg}\n\n${USAGE}`);
    let key = arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    key = ALIASES[key] || key;
    if (key === 'help') { console.log(USAGE); process.exit(0); }
    if (BOOLEAN_FLAGS.has(key)) { opts[key] = true; continue; }
    const value = argv[++i];
    if (value === undefined) throw new Error(`Missing value for ${arg}`);
    opts[key] = value;
  }
  for (const key of ['budget', 'timeoutMin', 'parallel', 'repeat', 'rerenderTimeoutMin']) opts[key] = Number(opts[key]);
  opts.stopAtUsd = opts.stopAtUsd == null ? Infinity : Number(opts.stopAtUsd);
  for (const key of ['budget', 'timeoutMin', 'parallel', 'repeat', 'rerenderTimeoutMin', 'stopAtUsd']) {
    if (Number.isNaN(opts[key])) throw new Error(`--${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)} needs a number`);
  }
  return opts;
}

// ---------------------------------------------------------------------------------------
// Setup

function which(bin) {
  return spawnSync('sh', ['-c', `command -v ${bin}`], { encoding: 'utf8' }).status === 0;
}

function ensureTrackMp3(assetsDir) {
  const track = path.join(assetsDir, 'track.mp3');
  if (fs.existsSync(track)) return track;
  // 15 s at 120 BPM: a kick on every beat, a bass note that changes each bar, a hi-hat on
  // the off-beats. Deterministic, so every run hears the same song.
  const expr = [
    '0.9*sin(2*PI*(50+60*exp(-30*mod(t,0.5)))*mod(t,0.5))*exp(-9*mod(t,0.5))',
    '0.25*sin(2*PI*(55*pow(2,floor(mod(t/2,4))*3/12))*t)',
    '0.08*(random(0)*2-1)*exp(-40*mod(t+0.25,0.5))',
  ].join('+');
  const result = spawnSync('ffmpeg', [
    '-v', 'error', '-y', '-f', 'lavfi', '-i', `aevalsrc='${expr}':s=44100:d=15`,
    '-ac', '2', '-b:a', '160k', track,
  ], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`Could not synthesise track.mp3: ${result.stderr}`);
  return track;
}

/** A plugin wrapper exposing every SKILL.md under <skillsDir>/skills as a top-level skill. */
function buildHeliosPlugin(skillsDir, outDir) {
  const skillsRoot = path.join(skillsDir, 'skills');
  if (!fs.existsSync(skillsRoot)) throw new Error(`No skills/ in ${skillsDir}; pass --skills-dir or --plugin-dir`);
  const pluginDir = path.join(outDir, '_plugin-helios');
  fs.rmSync(pluginDir, { recursive: true, force: true });
  fs.mkdirSync(path.join(pluginDir, '.claude-plugin'), { recursive: true });
  fs.mkdirSync(path.join(pluginDir, 'skills'));
  const found = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const full = path.join(dir, entry.name);
      if (fs.existsSync(path.join(full, 'SKILL.md'))) found.push(full);
      walk(full);
    }
  })(skillsRoot);
  for (const dir of found) {
    const name = path.basename(dir);
    const link = path.join(pluginDir, 'skills', name);
    if (fs.existsSync(link)) throw new Error(`Two skills named ${name} under ${skillsRoot}`);
    fs.symlinkSync(dir, link);
  }
  const git = spawnSync('git', ['-C', skillsDir, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' });
  fs.writeFileSync(path.join(pluginDir, '.claude-plugin', 'plugin.json'), JSON.stringify({
    name: 'helios',
    version: '0.0.0-eval',
    description: `Helios skills from ${skillsDir}${git.status === 0 ? ` @ ${git.stdout.trim()}` : ''}`,
  }, null, 2));
  return { pluginDir, skillCount: found.length, source: skillsDir, commit: git.status === 0 ? git.stdout.trim() : null };
}

function git(args, cwd) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${(result.stderr || '').trim().slice(0, 400)}`);
  return result.stdout.trim();
}

function shortRepo(repo) {
  return repo.replace(/^https:\/\/github\.com\//, '');
}

function pinnedDir(name, pin, cacheDir) {
  return path.join(cacheDir, `${name}-${pin.commit.slice(0, 12)}`);
}

const PIN_MARKER = '.eval-pin.json';

/**
 * A shallow, sparse checkout of `pin.repo` at exactly `pin.commit`, cached under cacheDir.
 * It is fetched into a temp directory and renamed into place once verified, so a crash leaves
 * nothing half-written, and two harness instances racing for the same pin both end up with
 * one complete copy.
 */
function fetchPinnedRepo(name, pin, cacheDir) {
  const dir = pinnedDir(name, pin, cacheDir);
  if (fs.existsSync(path.join(dir, PIN_MARKER))) return dir;
  if (fs.existsSync(dir)) throw new Error(`${dir} exists but is not a verified checkout; delete it and retry`);
  fs.mkdirSync(cacheDir, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(cacheDir, `.tmp-${name}-`));
  try {
    git(['init', '-q'], tmp);
    git(['remote', 'add', 'origin', pin.repo], tmp);
    if (pin.sparse) git(['sparse-checkout', 'set', '--cone', ...pin.sparse], tmp);
    git(['fetch', '-q', '--depth', '1', '--filter=blob:none', 'origin', pin.commit], tmp);
    git(['checkout', '-q', '--detach', 'FETCH_HEAD'], tmp);
    const head = git(['rev-parse', 'HEAD'], tmp);
    if (head !== pin.commit) throw new Error(`${pin.repo}: fetched ${head}, expected ${pin.commit}`);
    fs.writeFileSync(path.join(tmp, PIN_MARKER), JSON.stringify({ repo: pin.repo, commit: head, fetchedAt: new Date().toISOString() }, null, 2));
    try {
      fs.renameSync(tmp, dir);
    } catch (err) {
      if (!fs.existsSync(path.join(dir, PIN_MARKER))) throw err;
      fs.rmSync(tmp, { recursive: true, force: true }); // another instance won the race
    }
  } catch (err) {
    fs.rmSync(tmp, { recursive: true, force: true });
    throw err;
  }
  return dir;
}

function skillDirs(root) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(root, e.name, 'SKILL.md')))
    .map((e) => e.name);
}

/**
 * Project skills, the way `npx skills add <repo>` leaves them for Claude Code: one directory per
 * skill under <workdir>/.claude/skills.
 */
export function installProjectSkills(srcSkillsDir, workdir) {
  const dest = path.join(workdir, '.claude', 'skills');
  fs.mkdirSync(dest, { recursive: true });
  const names = skillDirs(srcSkillsDir);
  for (const name of names) fs.cpSync(path.join(srcSkillsDir, name), path.join(dest, name), { recursive: true });
  return names;
}

/**
 * The setup for a pinned framework condition: a --plugin-dir, or project skills copied into each
 * run's directory. In a dry run nothing is fetched; the paths are the ones a real run would use.
 */
function setupPinnedCondition(condition, cacheDir, dryRun) {
  const pin = PINS[condition];
  const dir = pinnedDir(condition, pin, cacheDir);
  const cached = fs.existsSync(path.join(dir, PIN_MARKER));
  if (!dryRun && !cached) {
    console.log(`Fetching ${shortRepo(pin.repo)} @ ${pin.ref || pin.commit.slice(0, 12)} → ${dir}`);
    fetchPinnedRepo(condition, pin, cacheDir);
  }
  const setup = {
    condition,
    label: pin.label,
    repo: pin.repo,
    ref: pin.ref || null,
    commit: pin.commit,
    version: pin.version,
    install: pin.install,
    maintainerInstall: pin.maintainerInstall,
    runtimePackages: pin.runtimePackages || [],
    source: dir,
    fetched: !dryRun || cached,
  };
  if (pin.install === 'plugin-dir') {
    setup.pluginDir = path.join(dir, pin.pluginRoot);
    if (pin.mcpConfig) setup.mcpConfig = path.join(setup.pluginDir, pin.mcpConfig);
    if (setup.fetched) {
      const manifest = JSON.parse(fs.readFileSync(path.join(setup.pluginDir, '.claude-plugin', 'plugin.json'), 'utf8'));
      if (manifest.version !== pin.version) {
        throw new Error(`${condition}: plugin.json says ${manifest.version}, conditions.json pins ${pin.version}`);
      }
      setup.pluginName = manifest.name;
      setup.skillCount = skillDirs(path.join(setup.pluginDir, 'skills')).length;
      if (pin.mcpConfig && !fs.existsSync(path.join(setup.pluginDir, pin.mcpConfig))) {
        throw new Error(`${condition}: no ${pin.mcpConfig} in the pinned plugin`);
      }
    }
  } else if (pin.install === 'project-skills') {
    setup.projectSkillsDir = path.join(dir, pin.skillsPath);
    if (setup.fetched) setup.skillCount = skillDirs(setup.projectSkillsDir).length;
  } else {
    throw new Error(`${condition}: unknown install "${pin.install}" in conditions.json`);
  }
  return setup;
}

function describeSetup(s) {
  const at = `${shortRepo(s.repo)} @ ${s.ref ? `${s.ref} (${s.commit.slice(0, 12)})` : s.commit.slice(0, 12)}`;
  const how = s.pluginDir ? `plugin ${s.pluginName || s.condition} ${s.version} via --plugin-dir` : `project skills (${s.version})`;
  const count = s.skillCount != null ? `, ${s.skillCount} skills` : '';
  return `${s.label} condition: ${how}${count}, from ${at}${s.fetched ? '' : ' (fetched on the first real run)'}`;
}

/** The npm `latest` of each package, recorded so runs that resolve `@latest` can be traced. */
function npmLatest(packages) {
  const out = {};
  for (const pkg of packages) {
    const result = spawnSync('npm', ['view', pkg, 'version'], { encoding: 'utf8', timeout: 30_000 });
    out[pkg] = result.status === 0 ? result.stdout.trim() : null;
  }
  return out;
}

/** Machine and tool versions, so runs on different machines are never pooled by accident. */
function environment(claudeBin) {
  const first = (bin, args) => {
    const r = spawnSync(bin, args, { encoding: 'utf8', timeout: 30_000 });
    return r.status === 0 ? r.stdout.split('\n')[0].trim() : null;
  };
  return {
    platform: `${os.platform()} ${os.release()} ${os.arch()}`,
    cpu: os.cpus()[0]?.model ?? null,
    cpus: os.cpus().length,
    memGb: Math.round(os.totalmem() / 2 ** 30),
    node: process.version,
    ffmpeg: first('ffmpeg', ['-version']),
    claude: first(claudeBin, ['--version']),
  };
}

function harnessRevision() {
  const head = spawnSync('git', ['-C', HERE, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
  const dirty = spawnSync('git', ['-C', HERE, 'status', '--porcelain', '--', '.'], { encoding: 'utf8' });
  return head.status === 0 ? { commit: head.stdout.trim(), dirty: Boolean(dirty.stdout.trim()) } : null;
}

/** Environment for the child: the parent's, minus anything that marks it as a nested session. */
function childEnv() {
  const env = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (key === 'CLAUDECODE' || key.startsWith('CLAUDE_CODE_') || key.startsWith('CLAUDE_AGENT_SDK')
      || key === 'CLAUDE_EFFORT' || key === 'CLAUDE_PID') continue;
    env[key] = value;
  }
  return env;
}

function claudeArgs(opts, run) {
  const args = [
    '-p', run.prompt.prompt,
    '--model', opts.model,
    '--output-format', 'stream-json', '--verbose',
    '--max-budget-usd', String(opts.budget),
    '--permission-mode', opts.permissionMode,
    // Hermetic but realistic: no user settings, skills, hooks, CLAUDE.md or MCP servers,
    // and the full default tool set (unlike --bare, which drops the Skill tool).
    '--setting-sources', 'project',
    '--strict-mcp-config',
    '--no-session-persistence',
  ];
  if (run.pluginDir) args.push('--plugin-dir', run.pluginDir);
  // --strict-mcp-config drops a plugin's own MCP servers, so a pinned plugin that ships one
  // gets that same config passed explicitly. Nothing else from the machine is admitted.
  if (run.mcpConfig) args.push('--mcp-config', run.mcpConfig);
  return args;
}

// ---------------------------------------------------------------------------------------
// Running

function runClaude(opts, run) {
  return new Promise((resolve) => {
    const transcript = fs.createWriteStream(path.join(run.resultDir, 'transcript.jsonl'));
    const stderr = fs.createWriteStream(path.join(run.resultDir, 'stderr.log'));
    const started = Date.now();
    const child = spawn(opts.claudeBin, claudeArgs(opts, run), {
      cwd: run.workdir,
      env: childEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true, // own process group, so a timeout can kill everything it started
    });
    child.stdout.pipe(transcript);
    child.stderr.pipe(stderr);
    // When each transcript line arrived, in ms since spawn (stream-json lines carry no time).
    const lineMs = [];
    child.stdout.on('data', (chunk) => {
      const now = Date.now() - started;
      for (const byte of chunk) if (byte === 10) lineMs.push(now);
    });
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      try { process.kill(-child.pid, 'SIGKILL'); } catch { /* already gone */ }
    }, opts.timeoutMin * 60_000);
    child.on('close', (code) => {
      clearTimeout(timer);
      // Anything it left running (dev servers, browsers) goes too.
      try { process.kill(-child.pid, 'SIGKILL'); } catch { /* already gone */ }
      transcript.end();
      stderr.end();
      fs.writeFileSync(path.join(run.resultDir, 'transcript-times.json'), JSON.stringify(lineMs));
      resolve({ exitCode: code, timedOut, wallMs: Date.now() - started });
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      transcript.end();
      stderr.end();
      resolve({ exitCode: -1, timedOut: false, wallMs: Date.now() - started, spawnError: err.message });
    });
  });
}

// ---------------------------------------------------------------------------------------
// Scoring

function readTranscript(file, lineMs = null) {
  const events = [];
  if (!fs.existsSync(file)) return events;
  fs.readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    if (!line.trim()) return;
    try {
      const event = JSON.parse(line);
      if (lineMs) event._ms = lineMs[i] ?? null;
      events.push(event);
    } catch { /* partial last line after a kill */ }
  });
  return events;
}

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

function toolResultText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map((c) => (typeof c === 'string' ? c : c.text || '')).join('\n');
  return '';
}

function summariseTranscript(events) {
  const init = events.find((e) => e.type === 'system' && e.subtype === 'init') || null;
  const result = [...events].reverse().find((e) => e.type === 'result') || null;
  const toolUses = [];
  const toolErrors = [];
  const toolResults = new Map();
  for (const e of events) {
    const content = e.message?.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (e.type === 'assistant' && block.type === 'tool_use') {
        toolUses.push({ name: block.name, input: block.input || {}, id: block.id, ms: e._ms ?? null });
      } else if (e.type === 'user' && block.type === 'tool_result') {
        toolResults.set(block.tool_use_id, { ok: !block.is_error, ms: e._ms ?? null });
        if (block.is_error) toolErrors.push(toolResultText(block.content).trim());
      }
    }
  }
  // Each tool call with its outcome; a call with no result (the run was killed) did not succeed.
  const calls = toolUses.map((t) => {
    const r = toolResults.get(t.id);
    return { ...t, ok: r?.ok ?? false, ms: r?.ms ?? t.ms };
  });
  return { init, result, toolUses, toolErrors, calls };
}

const SKIP_DIRS = new Set(['node_modules', '.git', '.cache', '.npm', '__pycache__', '.venv', 'venv']);

function findFiles(root, exts, skip = []) {
  const out = [];
  const skipPaths = new Set(skip);
  (function walk(dir, depth) {
    if (depth > 6) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name) && !skipPaths.has(full)) walk(full, depth + 1);
      } else if (exts.some((ext) => entry.name.toLowerCase().endsWith(ext))) {
        const stat = fs.statSync(full);
        out.push({ path: full, size: stat.size, mtimeMs: stat.mtimeMs });
      }
    }
  })(root, 0);
  return out;
}

function ffprobe(file) {
  const result = spawnSync('ffprobe', [
    '-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file,
  ], { encoding: 'utf8' });
  if (result.status !== 0) return { error: (result.stderr || 'ffprobe failed').trim().slice(0, 200) };
  const data = JSON.parse(result.stdout);
  const video = (data.streams || []).find((s) => s.codec_type === 'video');
  const audio = (data.streams || []).find((s) => s.codec_type === 'audio');
  const [num, den] = String(video?.avg_frame_rate || '0/1').split('/').map(Number);
  return {
    durationSec: Number(data.format?.duration) || null,
    width: video?.width ?? null,
    height: video?.height ?? null,
    fps: den ? Math.round((num / den) * 100) / 100 : null,
    videoCodec: video?.codec_name ?? null,
    audio: Boolean(audio),
    audioCodec: audio?.codec_name ?? null,
  };
}

function contactSheet(file, durationSec, outFile) {
  if (!durationSec) return false;
  const result = spawnSync('ffmpeg', [
    '-v', 'error', '-y', '-i', file,
    '-vf', `fps=5/${durationSec},scale=320:-2,tile=5x1`, '-frames:v', '1', outFile,
  ], { encoding: 'utf8' });
  return result.status === 0 && fs.existsSync(outFile);
}

function readText(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch { return ''; }
}

const SOURCE_EXTS = ['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.html', '.py'];

function readSources(workdir, skip = []) {
  return findFiles(workdir, SOURCE_EXTS, skip)
    .filter((f) => f.size < 2_000_000)
    .map((f) => readText(f.path))
    .join('\n');
}

/**
 * The same rule for every framework: a run used it if it installed it (a package.json anywhere in
 * the project declares it, or it sits in node_modules) or rendered with it (a CLI render/still
 * command, an MCP render tool, or code importing its renderer). Reading a skill does not count.
 */
const FRAMEWORKS = {
  helios: {
    cli: /@helios-project\/(cli|renderer)|\bhelios\s+(render|init|preview|studio|still|sheet|verify|doctor)\b/,
    renderVerb: /\b(render|still|sheet)\b/,
    dep: /"@helios-project\/[\w.-]+"\s*:/,
    modules: ['@helios-project'],
    renderImport: /@helios-project\/renderer/,
    mcpRender: /^mcp__.*helios.*__render_video$/i,
  },
  hyperframes: {
    cli: /\bhyperframes(@[\w.-]+)?\s+[a-z]|skills\/hyperframes\/scripts\/plugin-cli\.mjs/,
    renderVerb: /\brender\b/,
    dep: /"(hyperframes|@hyperframes\/[\w.-]+)"\s*:|\bhyperframes@\d/,
    modules: ['hyperframes', '@hyperframes'],
    renderImport: /['"]@hyperframes\/(producer|engine|renderer)['"]/,
    mcpRender: /^mcp__.*hyperframes.*__render/i,
  },
  remotion: {
    cli: /\bremotion\s+[a-z]|@remotion\/(cli|renderer)/,
    renderVerb: /\b(render|still)\b/,
    dep: /"(remotion|@remotion\/[\w.-]+)"\s*:/,
    modules: ['remotion', '@remotion'],
    renderImport: /['"]@remotion\/renderer['"]/,
    mcpRender: /^mcp__.*remotion.*__render/i,
  },
};

/** A framework command that writes a video (not a still or a sheet). */
const isFrameworkRender = (command) =>
  Object.values(FRAMEWORKS).some((fw) => fw.cli.test(command) && /\brender\b/.test(command));

const shellQuote = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;

/**
 * The CLI equivalent of a Helios MCP render_video call, so the determinism check can re-run a
 * render the agent made through the plugin's MCP server. `cliSpec` is the package the plugin's
 * .mcp.json runs (for example @helios-project/cli@0.46.0).
 */
export function mcpRenderCommand(name, input, cliSpec = '@helios-project/cli@latest') {
  if (!FRAMEWORKS.helios.mcpRender.test(name) || !input?.path) return null;
  const page = String(input.path);
  const output = input.output || page.replace(/\.html?$/i, '') + '.mp4';
  const args = ['npx', '-y', cliSpec, 'render', shellQuote(page), '-o', shellQuote(output)];
  for (const key of ['duration', 'fps', 'width', 'height', 'mode', 'preset']) {
    if (input[key] != null) args.push(`--${key}`, shellQuote(input[key]));
  }
  if (input.audio) args.push('--audio', shellQuote(input.audio));
  return args.join(' ');
}

function pluginCliSpec(pluginDir) {
  const mcp = pluginDir ? readJson(path.join(pluginDir, '.mcp.json'), null) : null;
  const args = Object.values(mcp?.mcpServers || {}).flatMap((s) => s.args || []);
  return args.find((a) => /^@helios-project\/cli@/.test(a)) || '@helios-project/cli@latest';
}

export function detectFrameworks({ workdir, commands, toolNames, skip = [], sources }) {
  const pkgFiles = findFiles(workdir, ['package.json'], skip).filter((f) => path.basename(f.path) === 'package.json');
  const pkgs = pkgFiles.map((f) => ({ dir: path.dirname(f.path), text: readText(f.path) }));
  const projectDirs = [workdir, ...pkgs.map((p) => p.dir)];
  const src = sources ?? readSources(workdir, skip);
  const out = {};
  for (const [name, fw] of Object.entries(FRAMEWORKS)) {
    const installed = pkgs.some((p) => fw.dep.test(p.text))
      || projectDirs.some((d) => fw.modules.some((m) => fs.existsSync(path.join(d, 'node_modules', m))));
    const rendered = commands.some((c) => fw.cli.test(c) && fw.renderVerb.test(c))
      || toolNames.some((t) => fw.mcpRender.test(t))
      || fw.renderImport.test(src);
    out[name] = { installed, rendered, used: installed || rendered };
  }
  return out;
}

/** Which toolchain the run used, from its package.json, commands and source files. */
function detectPipeline(workdir, commands, pluginName, skip = []) {
  const pkg = readText(path.join(workdir, 'package.json'));
  const sources = readSources(workdir, skip);
  const haystack = `${pkg}\n${commands.join('\n')}\n${sources}`;
  const tools = [];
  const has = (re) => re.test(haystack);
  if (has(/@helios-project\//)) tools.push('helios');
  if (has(/\bhyperframes\b/i)) tools.push('hyperframes');
  if (has(/\bremotion\b/i)) tools.push('remotion');
  if (has(/\bpuppeteer/)) tools.push('puppeteer');
  if (has(/\bplaywright/)) tools.push('playwright');
  if (has(/\bmanim\b/)) tools.push('manim');
  if (has(/\bmoviepy\b/)) tools.push('moviepy');
  if (has(/matplotlib\.animation|FuncAnimation/)) tools.push('matplotlib');
  if (has(/\bPIL\b|from PIL|import PIL/)) tools.push('pillow');
  if (commands.some((c) => /\bffmpeg\b/.test(c))) tools.push('ffmpeg');

  const heliosCommands = commands.filter((c) =>
    /@helios-project\/(cli|renderer)|\bhelios\s+(render|init|preview|studio|still|sheet|verify|doctor)\b/.test(c));
  const heliosInstalled = fs.existsSync(path.join(workdir, 'node_modules', '@helios-project'))
    || /"@helios-project\//.test(pkg);
  const heliosRender = heliosCommands.some((c) => /render|still|sheet/.test(c))
    || /@helios-project\/renderer/.test(sources);
  return { tools, heliosInstalled, heliosRender, heliosCommands: heliosCommands.slice(0, 5), pluginName, sources };
}

const PREVIEW_COMMANDS = [
  /(@helios-project\/cli\S*|\bhelios)\s+(preview|still|sheet|studio)\b/,
  /\bhyperframes(@\S+)?\s+(preview|snapshot|snapshots|studio)\b/,
  /plugin-cli\.mjs"?\s+(preview|snapshot|snapshots|studio)\b/,
  /\bremotion\s+(studio|preview|still)\b/,
  /-frames:v\s+1\b|-vframes\s+1\b/, // an ffmpeg frame grab
  /\.screenshot\(/, // an inline Puppeteer/Playwright screenshot
];
const IMAGE_FILE = /\.(png|jpe?g|webp|gif)$/i;
const MCP_PREVIEW = /^mcp__.*__(preview|get_frames|still|snapshot|sheet)/i;

function isPreviewCall(call) {
  if (call.name === 'Bash') return PREVIEW_COMMANDS.some((re) => re.test(String(call.input.command || '')));
  if (call.name === 'Read') return IMAGE_FILE.test(String(call.input.file_path || ''));
  return MCP_PREVIEW.test(call.name);
}

/**
 * When the agent first had a frame to look at: the result time of the first successful call
 * that previewed, rendered a still or contact sheet, grabbed a frame, or opened an image.
 */
export function firstPreviewMs(calls) {
  const hit = calls.find((c) => c.ok && isPreviewCall(c));
  return hit ? hit.ms ?? null : null;
}

/** The directory each Bash call ran in: the Bash tool keeps `cd` between calls. */
export function trackCwds(commands, start) {
  let cwd = start;
  const out = [];
  for (const command of commands) {
    out.push(cwd);
    // Subshells and command substitutions do not move the shell.
    let text = String(command);
    for (let prev = ''; prev !== text;) { prev = text; text = text.replace(/\([^()]*\)/g, ''); }
    for (const raw of text.split(/&&|\|\||;|\n/)) {
      const m = raw.trim().match(/^cd\s+(?:"([^"]*)"|'([^']*)'|(\S+))\s*$/);
      if (!m) continue;
      const arg = m[1] ?? m[2] ?? m[3];
      if (arg.startsWith('~') || arg === '-' || arg.includes('$')) continue;
      cwd = path.resolve(cwd, arg);
    }
  }
  return out;
}

const VIDEO_OUT = /\.(mp4|mov|webm)\b/i;
const SEQUENCE_INPUT = /%0?\d*d|-pattern_type\s+glob|-f\s+(image2|concat|rawvideo)\b/;
const PIPE_INPUT = /-i\s+(-|pipe:\S*)(\s|$)/;
const SCRIPT_RUN = /^\s*(?:[A-Z_][A-Z0-9_]*=\S+\s+)*(?:node|python3?|bun|deno\s+run(?:\s+-\S+)*|tsx|ts-node|npx\s+(?:-y\s+)?(?:tsx|ts-node))\s+(\S+)/;
const NPM_RENDER = /\b(npm|pnpm|yarn|bun)\s+(run\s+)?(render|build|export|video|make)\b/;

function scriptMakesVideo(call) {
  const m = call.command.match(SCRIPT_RUN);
  if (!m) return false;
  if (VIDEO_OUT.test(call.command)) return true;
  const file = path.resolve(call.cwd || '.', m[1].replace(/^["']|["']$/g, ''));
  return /\bffmpeg\b|\.(mp4|mov|webm)\b|moviepy|write_videofile|VideoWriter/.test(readText(file));
}

/**
 * The command(s) that produced the video, for re-rendering: the last successful foreground call
 * that renders with a framework, runs an npm render script, encodes a frame sequence or pipe
 * with ffmpeg, or runs a script that writes video. An ffmpeg encode of frames on disk also
 * brings the script run that wrote those frames.
 */
export function pickRenderCommands(calls) {
  const isEncode = (c) => /\bffmpeg\b/.test(c) && VIDEO_OUT.test(c) && (SEQUENCE_INPUT.test(c) || PIPE_INPUT.test(c));
  const usable = calls.filter((c) => c.ok && !c.background);
  for (let i = usable.length - 1; i >= 0; i--) {
    const call = usable[i];
    const c = call.command;
    if (isFrameworkRender(c) || NPM_RENDER.test(c) || scriptMakesVideo(call)) return [call];
    if (!isEncode(c)) continue;
    if (PIPE_INPUT.test(c) || SCRIPT_RUN.test(c)) return [call];
    const producer = usable.slice(0, i).reverse().find((p) => SCRIPT_RUN.test(p.command));
    return producer ? [producer, call] : [call];
  }
  return [];
}

/** Ok when the MP4 is readable, has video, is within ±5% of the asked duration, and has audio if asked. */
export function firstTrySuccess(expect, probe) {
  if (!probe || probe.error || !probe.videoCodec) return { ok: false, reasons: ['no valid MP4'] };
  const reasons = [];
  if (expect.durationSec) {
    const tol = 0.05 * expect.durationSec;
    if (probe.durationSec == null || Math.abs(probe.durationSec - expect.durationSec) > tol + 1e-9) {
      reasons.push(`duration ${probe.durationSec?.toFixed(2) ?? '?'}s not within ±5% of ${expect.durationSec}s`);
    }
  }
  if (expect.audio && !probe.audio) reasons.push('no audio stream');
  return { ok: reasons.length === 0, reasons };
}

// ---------------------------------------------------------------------------------------
// Determinism: re-run the render twice, compare five frames.

export function parsePsnr(stderr) {
  const matches = [...String(stderr).matchAll(/average:(inf|[\d.]+)/g)];
  if (!matches.length) return null;
  const v = matches.at(-1)[1];
  return v === 'inf' ? Infinity : Number(v);
}

const PSNR_THRESHOLD_DB = 50;
const SAMPLE_FRAMES = 5;

function frameHash(file, t) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-ss', String(t), '-i', file, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'],
    { maxBuffer: 512 * 1024 * 1024 });
  if (r.status !== 0 || !r.stdout?.length) return null;
  return crypto.createHash('sha256').update(r.stdout).digest('hex');
}

function framePsnr(a, b, t) {
  const r = spawnSync('ffmpeg', ['-v', 'info', '-nostats', '-ss', String(t), '-i', a, '-ss', String(t), '-i', b,
    '-frames:v', '1', '-lavfi', '[0:v][1:v]psnr', '-f', 'null', '-'], { encoding: 'utf8' });
  return parsePsnr(r.stderr);
}

/** Five frames at the centres of five equal slices; each must match by hash or reach 50 dB PSNR. */
function compareVideos(a, b) {
  const pa = ffprobe(a);
  const pb = ffprobe(b);
  if (pa.error || pb.error) return { pass: false, reason: 'unreadable video' };
  if (pa.width !== pb.width || pa.height !== pb.height) {
    return { pass: false, reason: `frame size ${pa.width}x${pa.height} vs ${pb.width}x${pb.height}` };
  }
  const duration = Math.min(pa.durationSec || 0, pb.durationSec || 0);
  if (!duration) return { pass: false, reason: 'no duration' };
  const frames = [];
  for (let i = 0; i < SAMPLE_FRAMES; i++) {
    const t = Math.round(duration * ((i + 0.5) / SAMPLE_FRAMES) * 1000) / 1000;
    const ha = frameHash(a, t);
    const hb = frameHash(b, t);
    const sameHash = Boolean(ha) && ha === hb;
    const psnr = sameHash ? Infinity : framePsnr(a, b, t);
    frames.push({ t, sameHash, psnr: psnr === Infinity ? 'inf' : psnr, pass: sameHash || (psnr != null && psnr >= PSNR_THRESHOLD_DB) });
  }
  const pass = frames.every((f) => f.pass);
  return {
    pass,
    durations: [pa.durationSec, pb.durationSec],
    frames,
    reason: pass ? '' : `${frames.filter((f) => !f.pass).length}/${SAMPLE_FRAMES} frames differ`,
  };
}

function runShell(command, cwd, timeoutMs, logFile) {
  return new Promise((resolve) => {
    const log = fs.createWriteStream(logFile, { flags: 'a' });
    log.write(`\n$ (cd ${cwd}) ${command}\n`);
    const child = spawn('sh', ['-c', command], { cwd, env: childEnv(), stdio: ['ignore', 'pipe', 'pipe'], detached: true });
    child.stdout.pipe(log, { end: false });
    child.stderr.pipe(log, { end: false });
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      try { process.kill(-child.pid, 'SIGKILL'); } catch { /* already gone */ }
    }, timeoutMs);
    const finish = (code) => {
      clearTimeout(timer);
      try { process.kill(-child.pid, 'SIGKILL'); } catch { /* already gone */ }
      log.end();
      resolve({ code, timedOut });
    };
    child.on('close', finish);
    child.on('error', () => finish(-1));
  });
}

/**
 * Re-run the run's own render command(s) twice in its working directory and compare the two
 * outputs (and the first against the delivered MP4, for information).
 */
export async function checkDeterminism(run, bashCalls, deliverable) {
  const chain = pickRenderCommands(bashCalls);
  const commands = chain.map((c) => ({ command: c.command, cwd: path.relative(run.workdir, c.cwd) || '.' }));
  if (!chain.length) return { deterministic: false, reason: 'no render command found', commands };
  const logFile = path.join(run.resultDir, 'rerender.log');
  const copies = [];
  for (let i = 1; i <= 2; i++) {
    const since = Date.now() - 5;
    for (const step of chain) {
      const cwd = fs.existsSync(step.cwd) ? step.cwd : run.workdir;
      const r = await runShell(step.command, cwd, run.opts.rerenderTimeoutMin * 60_000, logFile);
      if (r.code !== 0) {
        return { deterministic: false, reason: `re-render ${i} ${r.timedOut ? 'timed out' : `exited ${r.code}`}`, commands };
      }
    }
    const fresh = findFiles(run.workdir, ['.mp4', '.mov', '.webm'], run.skip || [])
      .filter((f) => f.mtimeMs >= since)
      .sort((a, b) => b.mtimeMs - a.mtimeMs);
    const out = fresh.find((f) => path.basename(f.path) === path.basename(deliverable)) || fresh[0];
    if (!out) return { deterministic: false, reason: `re-render ${i} wrote no video`, commands };
    const copy = path.join(run.resultDir, `rerender-${i}${path.extname(out.path)}`);
    fs.copyFileSync(out.path, copy);
    copies.push(copy);
  }
  const between = compareVideos(copies[0], copies[1]);
  const delivered = path.join(run.resultDir, 'deliverable.mp4');
  const vsDelivered = fs.existsSync(delivered) ? compareVideos(delivered, copies[0]) : null;
  if (!run.opts.keepWorkdirs) for (const c of copies) fs.rmSync(c, { force: true });
  return {
    deterministic: between.pass,
    reason: between.reason,
    commands,
    frames: between.frames,
    matchesDelivered: vsDelivered ? vsDelivered.pass : null,
  };
}

function checkExpectations(expect, probe, gifs) {
  const failures = [];
  if (!probe || probe.error) return ['unreadable MP4'];
  if (expect.durationSec) {
    const tol = expect.durationTolerance ?? 0.5;
    if (probe.durationSec == null || Math.abs(probe.durationSec - expect.durationSec) > tol) {
      failures.push(`duration ${probe.durationSec?.toFixed(2) ?? '?'}s (asked ${expect.durationSec}s)`);
    }
  }
  if (expect.audio && !probe.audio) failures.push('no audio stream');
  if (expect.width && (probe.width !== expect.width || probe.height !== expect.height)) {
    failures.push(`size ${probe.width}x${probe.height} (asked ${expect.width}x${expect.height})`);
  }
  if (expect.gif && gifs.length === 0) failures.push('no GIF');
  return failures;
}

function failurePoint(run, exec, summary, deliverable, checkFailures) {
  const r = summary.result;
  if (exec.spawnError) return `could not start claude: ${exec.spawnError}`;
  if (exec.timedOut) return `killed at the ${run.opts.timeoutMin} min limit`;
  if (r?.subtype === 'error_max_budget_usd') return `hit the $${run.opts.budget} budget cap`;
  if (r?.subtype === 'error_max_turns') return 'hit max turns';
  if (r?.is_error && typeof r.result === 'string') return r.result.slice(0, 160);
  if (!r) return 'no result event (crashed?)';
  if (!deliverable) {
    const lastError = summary.toolErrors.at(-1);
    return `no MP4${lastError ? `; last tool error: ${lastError.split('\n')[0].slice(0, 140)}` : ''}`;
  }
  if (checkFailures.length) return checkFailures.join('; ');
  return '';
}

/** Skill names a condition's own setup provides, as the session's init event lists them. */
const OWN_SKILL = {
  helios: (s) => s.startsWith('helios:'),
  hyperframes: (s) => s.startsWith('hyperframes:'),
  remotion: (s) => s.startsWith('remotion-'),
};

async function scoreRun(run, exec) {
  const lineMs = readJson(path.join(run.resultDir, 'transcript-times.json'), null);
  const summary = summariseTranscript(readTranscript(path.join(run.resultDir, 'transcript.jsonl'), lineMs));
  const skip = run.skip || [];
  const commands = summary.toolUses.filter((t) => t.name === 'Bash').map((t) => String(t.input.command || ''));
  const skillCalls = summary.toolUses
    .filter((t) => t.name === 'Skill')
    .map((t) => String(t.input.skill || t.input.name || t.input.command || ''));
  const pluginName = run.pluginDir ? run.condition : null;
  const heliosSkillCalls = skillCalls.filter((s) => s.startsWith('helios:') || /helios/i.test(s));
  const heliosSkillReads = summary.toolUses.filter((t) =>
    t.name === 'Read' && run.condition === 'helios' && run.pluginDir && String(t.input.file_path || '').includes('SKILL.md')).length;
  const ownSkill = OWN_SKILL[run.condition];

  const videos = findFiles(run.workdir, ['.mp4', '.mov', '.webm'], skip).sort((a, b) => b.mtimeMs - a.mtimeMs);
  const mp4s = videos.filter((v) => v.path.toLowerCase().endsWith('.mp4'));
  const gifs = findFiles(run.workdir, ['.gif'], skip);
  const finalText = typeof summary.result?.result === 'string' ? summary.result.result : '';
  // Prefer an MP4 the final message names; otherwise the newest one.
  const named = mp4s.find((v) => finalText.includes(path.basename(v.path)));
  const deliverable = named || mp4s[0] || null;
  const probe = deliverable ? ffprobe(deliverable.path) : null;
  const checkFailures = deliverable ? checkExpectations(run.prompt.expect || {}, probe, gifs) : [];
  const firstTry = firstTrySuccess(run.prompt.expect || {}, probe);

  let sheet = null;
  if (deliverable && probe && !probe.error) {
    const copy = path.join(run.resultDir, 'deliverable.mp4');
    fs.copyFileSync(deliverable.path, copy);
    if (contactSheet(copy, probe.durationSec, path.join(run.resultDir, 'sheet.png'))) sheet = 'sheet.png';
  }
  for (const gif of gifs.slice(0, 1)) fs.copyFileSync(gif.path, path.join(run.resultDir, 'deliverable.gif'));

  const pipeline = detectPipeline(run.workdir, commands, pluginName, skip);
  const toolNames = summary.toolUses.map((t) => t.name);
  const frameworks = detectFrameworks({ workdir: run.workdir, commands, toolNames, skip, sources: pipeline.sources });

  // Every call that may have written the video, in order, each with the directory it ran in.
  const bashCalls = summary.calls.filter((c) => c.name === 'Bash');
  const cwds = trackCwds(bashCalls.map((c) => String(c.input.command || '')), run.workdir);
  const cwdOf = new Map(bashCalls.map((c, i) => [c, cwds[i]]));
  const cliSpec = pluginCliSpec(run.pluginDir);
  const renderCalls = summary.calls.flatMap((c) => {
    if (c.name === 'Bash') {
      return [{ command: String(c.input.command || ''), cwd: cwdOf.get(c), ok: c.ok, background: Boolean(c.input.run_in_background) }];
    }
    const command = mcpRenderCommand(c.name, c.input, cliSpec);
    return command ? [{ command, cwd: run.workdir, ok: c.ok, background: false }] : [];
  });

  let determinism = null;
  if (run.opts.determinism && deliverable && probe && !probe.error) {
    determinism = await checkDeterminism(run, renderCalls, deliverable.path);
  }

  const previewMs = firstPreviewMs(summary.calls);
  const r = summary.result;
  const metrics = {
    id: run.id,
    prompt: run.prompt.id,
    condition: run.condition,
    repeat: run.repeat,
    model: summary.init?.model ?? null,
    pluginsLoaded: (summary.init?.plugins || []).map((p) => p.name),
    heliosSkillsAvailable: (summary.init?.skills || []).filter((s) => String(s).startsWith('helios:')).length,
    ownSkillsAvailable: ownSkill ? (summary.init?.skills || []).filter((s) => ownSkill(String(s))).length : null,
    mcpServers: (summary.init?.mcp_servers || []).map((s) => `${s.name}:${s.status}`),
    usedHelios: pipeline.heliosRender || pipeline.heliosInstalled,
    heliosRender: pipeline.heliosRender,
    heliosSkillCalls,
    heliosSkillReads,
    skillCalls,
    ownSkillCalls: ownSkill ? skillCalls.filter((s) => ownSkill(s) || s === run.condition).length : null,
    frameworks,
    frameworkUsed: run.condition === 'baseline' ? null : frameworks[run.condition].used,
    tools: pipeline.tools,
    heliosCommands: pipeline.heliosCommands,
    producedMp4: Boolean(deliverable),
    deliverable: deliverable ? path.relative(run.workdir, deliverable.path) : null,
    probe,
    checksFailed: checkFailures,
    passed: Boolean(deliverable) && checkFailures.length === 0,
    firstTrySuccess: firstTry.ok,
    firstTryFailures: firstTry.reasons,
    determinism,
    firstPreviewMin: previewMs == null ? null : Math.round((previewMs / 60_000) * 100) / 100,
    minutes: Math.round(((r?.duration_ms ?? exec.wallMs) / 60_000) * 10) / 10,
    wallMinutes: Math.round((exec.wallMs / 60_000) * 10) / 10,
    costUsd: r?.total_cost_usd ?? null,
    turns: r?.num_turns ?? null,
    resultSubtype: r?.subtype ?? null,
    timedOut: exec.timedOut,
    // Not the agent's doing, so re-run under the pre-registration: the CLI did not start, died
    // without a result, or the API/auth failed.
    harnessCrash: Boolean(exec.spawnError) || (!r && !exec.timedOut)
      || Boolean(r?.is_error && /Failed to authenticate|API Error|overloaded|Internal server error/i.test(String(r.result || ''))),
    failure: failurePoint(run, exec, summary, deliverable, checkFailures),
    toolErrorCount: summary.toolErrors.length,
    lastToolErrors: summary.toolErrors.slice(-3).map((e) => e.slice(0, 400)),
    finalMessage: finalText.slice(-600),
    sheet,
    workdir: run.opts.keepWorkdirs ? run.workdir : null,
  };
  fs.writeFileSync(path.join(run.resultDir, 'metrics.json'), JSON.stringify(metrics, null, 2));
  return metrics;
}

// ---------------------------------------------------------------------------------------
// Reporting

function fmt(value, digits = 1) {
  return value == null || Number.isNaN(value) ? '–' : Number(value).toFixed(digits);
}

function median(values) {
  const v = values.filter((x) => x != null).sort((a, b) => a - b);
  if (!v.length) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

/** "k/n" over the runs that recorded the field; "–" when none did (results from before it existed). */
function rate(rs, pick) {
  const known = rs.map(pick).filter((v) => v != null);
  return known.length ? `${known.filter(Boolean).length}/${known.length}` : '–';
}

const yesNo = (v) => (v == null ? '–' : v ? 'yes' : 'no');

export function scoreboard(results, meta) {
  const lines = [];
  lines.push(`# Agent video scoreboard`, '');
  lines.push(`${meta.startedAt} · model \`${meta.model}\` · $${meta.budget} cap per run · ${meta.timeoutMin} min limit`);
  if (meta.plugin) lines.push(`Helios condition: ${meta.plugin.skillCount} skills from \`${meta.plugin.source}\`${meta.plugin.commit ? ` @ ${meta.plugin.commit}` : ''}`);
  for (const setup of Object.values(meta.setups || {})) lines.push(describeSetup(setup));
  const latest = Object.entries(meta.npmLatest || {}).filter(([, v]) => v);
  if (latest.length) lines.push(`npm latest at start: ${latest.map(([k, v]) => `${k} ${v}`).join(', ')}`);
  if (meta.harness) lines.push(`Harness: ${meta.harness.commit.slice(0, 12)}${meta.harness.dirty ? ' (uncommitted changes)' : ''}`);
  const rated = results.some((r) => r.rating != null);
  lines.push('');
  lines.push(`| Condition | Runs | MP4 | Passed checks | Used Helios | First-try success | Used own framework | Deterministic | Median first preview (min) | Median min | Mean $ | Total $ |${rated ? ' Mean rating |' : ''}`);
  lines.push(`|---|---|---|---|---|---|---|---|---|---|---|---|${rated ? '---|' : ''}`);
  const conditions = [...new Set(results.map((r) => r.condition))];
  for (const c of conditions) {
    const rs = results.filter((r) => r.condition === c);
    const costs = rs.map((r) => r.costUsd).filter((x) => x != null);
    const total = costs.reduce((a, b) => a + b, 0);
    // A run with no MP4 has nothing to post: it is rated 1.
    const ratings = rs.map((r) => (r.producedMp4 ? r.rating : 1)).filter((x) => x != null);
    const meanRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
    lines.push(`| ${c} | ${rs.length} | ${rs.filter((r) => r.producedMp4).length}/${rs.length} | ${rs.filter((r) => r.passed).length}/${rs.length} | ${rs.filter((r) => r.usedHelios).length}/${rs.length} | ${rate(rs, (r) => r.firstTrySuccess)} | ${rate(rs, (r) => r.frameworkUsed)} | ${rate(rs, (r) => r.determinism?.deterministic)} | ${fmt(median(rs.map((r) => r.firstPreviewMin)), 2)} | ${fmt(median(rs.map((r) => r.minutes)))} | ${costs.length ? fmt(total / costs.length, 2) : '–'} | ${fmt(total, 2)} |${rated ? ` ${fmt(meanRating, 2)} |` : ''}`);
  }
  lines.push('');
  lines.push('| Prompt | Condition | Used Helios | Own framework | Toolchain | MP4 | First try | Deterministic | Duration (asked) | Audio | Size | First preview (min) | Min | $ | Turns | Failure |');
  lines.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  const prompts = new Map(meta.prompts.map((p) => [p.id, p]));
  for (const r of results) {
    const asked = prompts.get(r.prompt)?.expect?.durationSec;
    const helios = r.usedHelios
      ? `yes${r.heliosSkillCalls.length ? ` (skills: ${r.heliosSkillCalls.length})` : ''}`
      : (r.heliosSkillCalls.length ? `no (skills: ${r.heliosSkillCalls.length})` : 'no');
    const det = r.determinism ? (r.determinism.deterministic ? 'yes' : `no: ${r.determinism.reason}`) : '–';
    lines.push(`| ${r.prompt}${r.repeat > 1 ? ` #${r.repeat}` : ''} | ${r.condition} | ${helios} | ${yesNo(r.frameworkUsed)} | ${r.tools.join(', ') || '–'} | ${r.producedMp4 ? (r.passed ? 'yes' : 'yes, off-spec') : 'no'} | ${yesNo(r.firstTrySuccess)} | ${det.replace(/\|/g, '\\|')} | ${fmt(r.probe?.durationSec, 2)} (${asked ?? '–'}) | ${r.probe ? (r.probe.audio ? 'yes' : 'no') : '–'} | ${r.probe?.width ? `${r.probe.width}x${r.probe.height}` : '–'} | ${fmt(r.firstPreviewMin, 2)} | ${fmt(r.minutes)} | ${fmt(r.costUsd, 2)} | ${r.turns ?? '–'} | ${(r.failure || '').replace(/\|/g, '\\|')} |`);
  }
  lines.push('');
  return lines.join('\n');
}

function writeScoreboard(outDir, results, meta) {
  fs.writeFileSync(path.join(outDir, 'scoreboard.json'), JSON.stringify({ meta, results }, null, 2));
  const md = scoreboard(results, meta);
  fs.writeFileSync(path.join(outDir, 'scoreboard.md'), md);
  return md;
}

// ---------------------------------------------------------------------------------------
// Blind rating

/** Mean score per run from the raters' CSV (rater,clip,score), keyed `<results dir>::<run id>`. */
export function aggregateRatings(key, csvText) {
  const rows = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const header = rows.shift().split(',').map((h) => h.trim().toLowerCase());
  const col = (name) => {
    const i = header.indexOf(name);
    if (i < 0) throw new Error(`ratings.csv needs a "${name}" column`);
    return i;
  };
  const [ri, ci, si] = [col('rater'), col('clip'), col('score')];
  const seen = new Set();
  const sums = new Map();
  for (const row of rows) {
    const cells = row.split(',').map((c) => c.trim());
    const [rater, clip, score] = [cells[ri], cells[ci], Number(cells[si])];
    if (!key[clip]) throw new Error(`ratings.csv: unknown clip ${clip}`);
    if (!Number.isInteger(score) || score < 1 || score > 5) throw new Error(`ratings.csv: score for ${clip} by ${rater} must be 1-5`);
    if (seen.has(`${rater}::${clip}`)) throw new Error(`ratings.csv: ${rater} rated ${clip} twice`);
    seen.add(`${rater}::${clip}`);
    const k = `${key[clip].dir}::${key[clip].id}`;
    const s = sums.get(k) || { total: 0, n: 0 };
    sums.set(k, { total: s.total + score, n: s.n + 1 });
  }
  return new Map([...sums].map(([k, s]) => [k, { mean: s.total / s.n, n: s.n }]));
}

/**
 * Copies every delivered MP4 and contact sheet into <packet>/clips/<clip id>/ under shuffled ids,
 * with container metadata stripped so nothing names the toolchain. key.json (which clip is which
 * run) stays at the packet root: send raters only clips/ and ratings.csv.
 */
function buildBlindPacket(resultDirs, packetDir) {
  const entries = [];
  for (const dir of resultDirs.map((d) => path.resolve(d))) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, 'scoreboard.json'), 'utf8'));
    const prompts = new Map((data.meta.prompts || []).map((p) => [p.id, p.prompt]));
    for (const r of data.results) {
      if (fs.existsSync(path.join(dir, r.id, 'deliverable.mp4'))) entries.push({ dir, id: r.id, prompt: prompts.get(r.prompt) || '' });
    }
  }
  for (let i = entries.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [entries[i], entries[j]] = [entries[j], entries[i]];
  }
  fs.mkdirSync(path.join(packetDir, 'clips'), { recursive: true });
  const key = {};
  entries.forEach((e, i) => {
    const clip = `clip-${String(i + 1).padStart(3, '0')}`;
    const dest = path.join(packetDir, 'clips', clip);
    fs.mkdirSync(dest);
    const strip = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', path.join(e.dir, e.id, 'deliverable.mp4'),
      '-map', '0', '-c', 'copy', '-map_metadata', '-1', '-fflags', '+bitexact', path.join(dest, 'video.mp4')], { encoding: 'utf8' });
    if (strip.status !== 0) throw new Error(`Could not copy ${e.id}: ${strip.stderr}`);
    const sheet = path.join(e.dir, e.id, 'sheet.png');
    if (fs.existsSync(sheet)) fs.copyFileSync(sheet, path.join(dest, 'sheet.png'));
    fs.writeFileSync(path.join(dest, 'prompt.txt'), `${e.prompt}\n`);
    key[clip] = { dir: e.dir, id: e.id };
  });
  fs.writeFileSync(path.join(packetDir, 'key.json'), JSON.stringify(key, null, 2));
  fs.writeFileSync(path.join(packetDir, 'ratings.csv'), 'rater,clip,score\n');
  return entries.length;
}

// ---------------------------------------------------------------------------------------

async function pool(items, size, worker) {
  const queue = [...items];
  const workers = Array.from({ length: Math.max(1, size) }, async () => {
    while (queue.length) await worker(queue.shift());
  });
  await Promise.all(workers);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const allPrompts = JSON.parse(fs.readFileSync(path.join(HERE, 'prompts.json'), 'utf8'));

  if (opts.blind) {
    const packet = path.resolve(opts.out || path.join(HERE, 'results', `blind-${new Date().toISOString().replace(/[:.]/g, '-')}`));
    const n = buildBlindPacket(String(opts.blind).split(','), packet);
    console.log(`${n} clip(s) → ${path.join(packet, 'clips')}\nKey (do not share with raters): ${path.join(packet, 'key.json')}`);
    return;
  }

  if (opts.rescore) {
    const data = JSON.parse(fs.readFileSync(path.join(opts.rescore, 'scoreboard.json'), 'utf8'));
    if (opts.ratings) {
      const key = JSON.parse(fs.readFileSync(path.join(opts.ratings, 'key.json'), 'utf8'));
      const ratings = aggregateRatings(key, fs.readFileSync(path.join(opts.ratings, 'ratings.csv'), 'utf8'));
      const dir = path.resolve(opts.rescore);
      for (const r of data.results) {
        const got = ratings.get(`${dir}::${r.id}`);
        r.rating = got ? got.mean : null;
        r.raters = got ? got.n : 0;
      }
    }
    console.log(writeScoreboard(opts.rescore, data.results, data.meta));
    return;
  }

  const wanted = opts.prompts ? String(opts.prompts).split(',') : allPrompts.map((p) => p.id);
  const prompts = wanted.map((id) => {
    const p = allPrompts.find((x) => x.id === id);
    if (!p) throw new Error(`Unknown prompt id: ${id}`);
    return p;
  });
  const conditions = String(opts.conditions).split(',');
  for (const c of conditions) {
    if (!CONDITIONS.includes(c)) throw new Error(`Unknown condition: ${c}`);
  }

  for (const bin of ['ffmpeg', 'ffprobe']) {
    if (!which(bin)) throw new Error(`${bin} is required on PATH`);
  }
  if (!opts.dryRun && !which(opts.claudeBin)) throw new Error(`${opts.claudeBin} not found`);

  const startedAt = new Date().toISOString();
  const outDir = path.resolve(opts.out || path.join(HERE, 'results', startedAt.replace(/[:.]/g, '-')));
  fs.mkdirSync(outDir, { recursive: true });

  const assetsDir = path.join(HERE, 'assets');
  if (prompts.some((p) => (p.assets || []).includes('track.mp3'))) ensureTrackMp3(assetsDir);

  // "helios" without --pinned keeps the day-to-day setup: a wrapper over a local helios-skills
  // checkout. Every other framework condition, and "helios" with --pinned, loads the setup its
  // maintainers publish, at the commit pinned in conditions.json.
  let plugin = null;
  const setups = {};
  const cacheDir = path.resolve(opts.cacheDir);
  for (const condition of conditions) {
    if (condition === 'baseline') continue;
    if (condition === 'helios' && !opts.pinned) {
      plugin = opts.pluginDir
        ? { pluginDir: path.resolve(opts.pluginDir), skillCount: null, source: path.resolve(opts.pluginDir), commit: null }
        : buildHeliosPlugin(path.resolve(opts.skillsDir), outDir);
      if (conditions.length > 2 || conditions.some((c) => c === 'hyperframes' || c === 'remotion')) {
        console.error(`Note: "helios" is the local wrapper over ${plugin.source}, not the pinned plugin the benchmark uses; pass --pinned for that.`);
      }
      continue;
    }
    setups[condition] = setupPinnedCondition(condition, cacheDir, opts.dryRun);
  }
  const setupFor = (condition) => (condition === 'helios' && plugin ? plugin : setups[condition] || null);

  const runs = [];
  for (let repeat = 1; repeat <= opts.repeat; repeat++) {
    for (const prompt of prompts) {
      for (const condition of conditions) {
        const id = `${prompt.id}__${condition}${opts.repeat > 1 ? `__${repeat}` : ''}`;
        const setup = setupFor(condition);
        runs.push({
          id, prompt, condition, repeat, opts,
          pluginDir: setup?.pluginDir || null,
          projectSkillsDir: setup?.projectSkillsDir || null,
          mcpConfig: setup?.mcpConfig || null,
        });
      }
    }
  }

  const meta = {
    startedAt, model: opts.model, budget: opts.budget, timeoutMin: opts.timeoutMin, plugin, prompts,
    conditions, repeat: opts.repeat, pinned: Boolean(opts.pinned), determinism: Boolean(opts.determinism), setups,
  };
  console.log(`${runs.length} run(s) → ${outDir}`);
  console.log(`Worst case spend: $${(runs.length * opts.budget).toFixed(2)} (${runs.length} × $${opts.budget} cap)`);
  for (const setup of Object.values(setups)) {
    console.log(`${describeSetup(setup)}\n  maintainers' install: ${setup.maintainerInstall}`);
  }

  if (opts.dryRun) {
    for (const run of runs) {
      console.log(`\n[${run.id}]`);
      if (run.projectSkillsDir) {
        console.log(`  setup: copy the skills in ${run.projectSkillsDir} into <fresh temp dir>/.claude/skills (as \`${PINS[run.condition].maintainerInstall}\` does)`);
      }
      console.log(`  cd <fresh temp dir> && ${opts.claudeBin} ${claudeArgs(opts, run).map((a) => (/\s/.test(a) ? JSON.stringify(a) : a)).join(' ')}`);
    }
    return;
  }

  if (Object.keys(setups).length) {
    meta.npmLatest = npmLatest(Object.values(setups).flatMap((s) => s.runtimePackages));
  }
  meta.harness = harnessRevision();
  meta.environment = environment(opts.claudeBin);

  const results = [];
  let spent = 0;
  await pool(runs, opts.parallel, async (run) => {
    if (spent >= opts.stopAtUsd) {
      console.log(`□ ${run.id}: not run, $${fmt(spent, 2)} spent of the $${opts.stopAtUsd} stop`);
      return;
    }
    run.workdir = fs.mkdtempSync(path.join(os.tmpdir(), `helios-eval-${run.prompt.id}-`));
    run.resultDir = path.join(outDir, run.id);
    fs.mkdirSync(run.resultDir, { recursive: true });
    for (const asset of run.prompt.assets || []) {
      fs.copyFileSync(path.join(assetsDir, asset), path.join(run.workdir, asset));
    }
    if (run.projectSkillsDir) {
      installProjectSkills(run.projectSkillsDir, run.workdir);
      run.skip = [path.join(run.workdir, '.claude', 'skills')];
    }
    console.log(`▶ ${run.id} (${run.workdir})`);
    const exec = await runClaude(opts, run);
    const metrics = await scoreRun(run, exec);
    spent += metrics.costUsd || 0;
    results.push(metrics);
    console.log(`■ ${run.id}: ${metrics.passed ? 'PASS' : metrics.producedMp4 ? 'MP4 off-spec' : 'no MP4'}`
      + ` · Helios ${metrics.usedHelios ? 'yes' : 'no'}`
      + `${metrics.frameworkUsed != null && run.condition !== 'helios' ? ` · ${run.condition} ${metrics.frameworkUsed ? 'yes' : 'no'}` : ''}`
      + `${metrics.determinism ? ` · deterministic ${metrics.determinism.deterministic ? 'yes' : 'no'}` : ''}`
      + ` · ${fmt(metrics.minutes)} min · $${fmt(metrics.costUsd, 2)}`
      + `${metrics.failure ? ` · ${metrics.failure}` : ''}`);
    if (!opts.keepWorkdirs) fs.rmSync(run.workdir, { recursive: true, force: true });
    const order = new Map(runs.map((r, i) => [r.id, i]));
    results.sort((a, b) => order.get(a.id) - order.get(b.id));
    writeScoreboard(outDir, results, meta);
  });

  console.log(`\n${writeScoreboard(outDir, results, meta)}`);
}

// Run only when executed, so the tests can import the helpers.
const invoked = process.argv[1] && fs.realpathSync(path.resolve(process.argv[1])) === fs.realpathSync(fileURLToPath(import.meta.url));
if (invoked) {
  main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
}
