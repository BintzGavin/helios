#!/usr/bin/env node
/**
 * Agent video scoreboard.
 *
 * Asks fresh, headless Claude Code sessions for videos, in throwaway directories, with and
 * without the Helios skills, then records per run: did it use Helios, did it produce an MP4,
 * does the MP4 match the request (duration, audio, size), how long it took and what it cost,
 * and where it failed. See README.md in this directory.
 *
 * No dependencies beyond Node 18+, the `claude` CLI, and ffmpeg/ffprobe on PATH.
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

const DEFAULTS = {
  model: 'claude-opus-5-5',
  budget: 8,
  timeoutMin: 40,
  parallel: 1,
  repeat: 1,
  conditions: 'baseline,helios',
  skillsDir: path.join(os.homedir(), 'Developer', 'helios-skills'),
  permissionMode: 'bypassPermissions',
  claudeBin: 'claude',
};

const USAGE = `Usage: node tests/agent-eval/run.mjs [options]

  --prompts <ids>          Comma-separated prompt ids from prompts.json (default: all)
  --conditions <ids>       baseline, helios, or both (default: ${DEFAULTS.conditions})
  --plugin-dir <path>      Plugin to load for the "helios" condition (default: a wrapper
                           built from --skills-dir, one entry per SKILL.md)
  --skills-dir <path>      helios-skills checkout (default: ${DEFAULTS.skillsDir})
  --model <id>             Model for the sessions (default: ${DEFAULTS.model})
  --budget <usd>           Per-run --max-budget-usd cap (default: ${DEFAULTS.budget})
  --timeout-min <n>        Per-run wall-clock limit (default: ${DEFAULTS.timeoutMin})
  --parallel <n>           Runs at once (default: ${DEFAULTS.parallel})
  --repeat <n>             Runs per prompt x condition (default: ${DEFAULTS.repeat})
  --permission-mode <m>    Passed to claude (default: ${DEFAULTS.permissionMode})
  --out <dir>              Results directory (default: tests/agent-eval/results/<timestamp>)
  --keep-workdirs          Keep each run's working directory (can be large: node_modules)
  --dry-run                Print what would run, spend nothing
  --claude-bin <path>      claude executable (default: claude)
  --rescore <dir>          Rebuild scoreboard.md/json from an existing results directory
`;

function parseArgs(argv) {
  const opts = { ...DEFAULTS };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) throw new Error(`Unexpected argument: ${arg}\n\n${USAGE}`);
    const key = arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (key === 'help') { console.log(USAGE); process.exit(0); }
    if (key === 'dryRun' || key === 'keepWorkdirs') { opts[key] = true; continue; }
    const value = argv[++i];
    if (value === undefined) throw new Error(`Missing value for ${arg}`);
    opts[key] = value;
  }
  for (const key of ['budget', 'timeoutMin', 'parallel', 'repeat']) opts[key] = Number(opts[key]);
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

function readTranscript(file) {
  const events = [];
  if (!fs.existsSync(file)) return events;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { events.push(JSON.parse(line)); } catch { /* partial last line after a kill */ }
  }
  return events;
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
  for (const e of events) {
    const content = e.message?.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (e.type === 'assistant' && block.type === 'tool_use') {
        toolUses.push({ name: block.name, input: block.input || {} });
      } else if (e.type === 'user' && block.type === 'tool_result' && block.is_error) {
        toolErrors.push(toolResultText(block.content).trim());
      }
    }
  }
  return { init, result, toolUses, toolErrors };
}

const SKIP_DIRS = new Set(['node_modules', '.git', '.cache', '.npm', '__pycache__', '.venv', 'venv']);

function findFiles(root, exts) {
  const out = [];
  (function walk(dir, depth) {
    if (depth > 6) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(full, depth + 1);
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

/** Which toolchain the run used, from its package.json, commands and source files. */
function detectPipeline(workdir, commands, pluginName) {
  const pkg = readText(path.join(workdir, 'package.json'));
  const sources = findFiles(workdir, ['.js', '.mjs', '.cjs', '.ts', '.html', '.py'])
    .filter((f) => f.size < 2_000_000)
    .map((f) => readText(f.path))
    .join('\n');
  const haystack = `${pkg}\n${commands.join('\n')}\n${sources}`;
  const tools = [];
  const has = (re) => re.test(haystack);
  if (has(/@helios-project\//)) tools.push('helios');
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
  return { tools, heliosInstalled, heliosRender, heliosCommands: heliosCommands.slice(0, 5), pluginName };
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

function scoreRun(run, exec) {
  const summary = summariseTranscript(readTranscript(path.join(run.resultDir, 'transcript.jsonl')));
  const commands = summary.toolUses.filter((t) => t.name === 'Bash').map((t) => String(t.input.command || ''));
  const skillCalls = summary.toolUses
    .filter((t) => t.name === 'Skill')
    .map((t) => String(t.input.skill || t.input.name || t.input.command || ''));
  const pluginName = run.pluginDir ? 'helios' : null;
  const heliosSkillCalls = skillCalls.filter((s) => s.startsWith('helios:') || /helios/i.test(s));
  const heliosSkillReads = summary.toolUses.filter((t) =>
    t.name === 'Read' && run.pluginDir && String(t.input.file_path || '').includes('SKILL.md')).length;

  const videos = findFiles(run.workdir, ['.mp4', '.mov', '.webm']).sort((a, b) => b.mtimeMs - a.mtimeMs);
  const mp4s = videos.filter((v) => v.path.toLowerCase().endsWith('.mp4'));
  const gifs = findFiles(run.workdir, ['.gif']);
  const finalText = typeof summary.result?.result === 'string' ? summary.result.result : '';
  // Prefer an MP4 the final message names; otherwise the newest one.
  const named = mp4s.find((v) => finalText.includes(path.basename(v.path)));
  const deliverable = named || mp4s[0] || null;
  const probe = deliverable ? ffprobe(deliverable.path) : null;
  const checkFailures = deliverable ? checkExpectations(run.prompt.expect || {}, probe, gifs) : [];

  let sheet = null;
  if (deliverable && probe && !probe.error) {
    const copy = path.join(run.resultDir, 'deliverable.mp4');
    fs.copyFileSync(deliverable.path, copy);
    if (contactSheet(copy, probe.durationSec, path.join(run.resultDir, 'sheet.png'))) sheet = 'sheet.png';
  }
  for (const gif of gifs.slice(0, 1)) fs.copyFileSync(gif.path, path.join(run.resultDir, 'deliverable.gif'));

  const pipeline = detectPipeline(run.workdir, commands, pluginName);
  const r = summary.result;
  const metrics = {
    id: run.id,
    prompt: run.prompt.id,
    condition: run.condition,
    repeat: run.repeat,
    model: summary.init?.model ?? null,
    pluginsLoaded: (summary.init?.plugins || []).map((p) => p.name),
    heliosSkillsAvailable: (summary.init?.skills || []).filter((s) => String(s).startsWith('helios:')).length,
    usedHelios: pipeline.heliosRender || pipeline.heliosInstalled,
    heliosRender: pipeline.heliosRender,
    heliosSkillCalls,
    heliosSkillReads,
    skillCalls,
    tools: pipeline.tools,
    heliosCommands: pipeline.heliosCommands,
    producedMp4: Boolean(deliverable),
    deliverable: deliverable ? path.relative(run.workdir, deliverable.path) : null,
    probe,
    checksFailed: checkFailures,
    passed: Boolean(deliverable) && checkFailures.length === 0,
    minutes: Math.round(((r?.duration_ms ?? exec.wallMs) / 60_000) * 10) / 10,
    costUsd: r?.total_cost_usd ?? null,
    turns: r?.num_turns ?? null,
    resultSubtype: r?.subtype ?? null,
    timedOut: exec.timedOut,
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

function scoreboard(results, meta) {
  const lines = [];
  lines.push(`# Agent video scoreboard`, '');
  lines.push(`${meta.startedAt} · model \`${meta.model}\` · $${meta.budget} cap per run · ${meta.timeoutMin} min limit`);
  if (meta.plugin) lines.push(`Helios condition: ${meta.plugin.skillCount} skills from \`${meta.plugin.source}\`${meta.plugin.commit ? ` @ ${meta.plugin.commit}` : ''}`);
  lines.push('');
  lines.push('| Condition | Runs | MP4 | Passed checks | Used Helios | Median min | Mean $ | Total $ |');
  lines.push('|---|---|---|---|---|---|---|---|');
  const conditions = [...new Set(results.map((r) => r.condition))];
  for (const c of conditions) {
    const rs = results.filter((r) => r.condition === c);
    const costs = rs.map((r) => r.costUsd).filter((x) => x != null);
    const total = costs.reduce((a, b) => a + b, 0);
    lines.push(`| ${c} | ${rs.length} | ${rs.filter((r) => r.producedMp4).length}/${rs.length} | ${rs.filter((r) => r.passed).length}/${rs.length} | ${rs.filter((r) => r.usedHelios).length}/${rs.length} | ${fmt(median(rs.map((r) => r.minutes)))} | ${costs.length ? fmt(total / costs.length, 2) : '–'} | ${fmt(total, 2)} |`);
  }
  lines.push('');
  lines.push('| Prompt | Condition | Used Helios | Toolchain | MP4 | Duration (asked) | Audio | Size | Min | $ | Turns | Failure |');
  lines.push('|---|---|---|---|---|---|---|---|---|---|---|---|');
  const prompts = new Map(meta.prompts.map((p) => [p.id, p]));
  for (const r of results) {
    const asked = prompts.get(r.prompt)?.expect?.durationSec;
    const helios = r.usedHelios
      ? `yes${r.heliosSkillCalls.length ? ` (skills: ${r.heliosSkillCalls.length})` : ''}`
      : (r.heliosSkillCalls.length ? `no (skills: ${r.heliosSkillCalls.length})` : 'no');
    lines.push(`| ${r.prompt}${r.repeat > 1 ? ` #${r.repeat}` : ''} | ${r.condition} | ${helios} | ${r.tools.join(', ') || '–'} | ${r.producedMp4 ? (r.passed ? 'yes' : 'yes, off-spec') : 'no'} | ${fmt(r.probe?.durationSec, 2)} (${asked ?? '–'}) | ${r.probe ? (r.probe.audio ? 'yes' : 'no') : '–'} | ${r.probe?.width ? `${r.probe.width}x${r.probe.height}` : '–'} | ${fmt(r.minutes)} | ${fmt(r.costUsd, 2)} | ${r.turns ?? '–'} | ${(r.failure || '').replace(/\|/g, '\\|')} |`);
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

  if (opts.rescore) {
    const data = JSON.parse(fs.readFileSync(path.join(opts.rescore, 'scoreboard.json'), 'utf8'));
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
    if (!['baseline', 'helios'].includes(c)) throw new Error(`Unknown condition: ${c}`);
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

  let plugin = null;
  if (conditions.includes('helios')) {
    plugin = opts.pluginDir
      ? { pluginDir: path.resolve(opts.pluginDir), skillCount: null, source: path.resolve(opts.pluginDir), commit: null }
      : buildHeliosPlugin(path.resolve(opts.skillsDir), outDir);
  }

  const runs = [];
  for (let repeat = 1; repeat <= opts.repeat; repeat++) {
    for (const prompt of prompts) {
      for (const condition of conditions) {
        const id = `${prompt.id}__${condition}${opts.repeat > 1 ? `__${repeat}` : ''}`;
        runs.push({ id, prompt, condition, repeat, opts, pluginDir: condition === 'helios' ? plugin.pluginDir : null });
      }
    }
  }

  const meta = { startedAt, model: opts.model, budget: opts.budget, timeoutMin: opts.timeoutMin, plugin, prompts };
  console.log(`${runs.length} run(s) → ${outDir}`);
  console.log(`Worst case spend: $${(runs.length * opts.budget).toFixed(2)} (${runs.length} × $${opts.budget} cap)`);

  if (opts.dryRun) {
    for (const run of runs) {
      console.log(`\n[${run.id}]\n  cd <fresh temp dir> && ${opts.claudeBin} ${claudeArgs(opts, run).map((a) => (/\s/.test(a) ? JSON.stringify(a) : a)).join(' ')}`);
    }
    return;
  }

  const results = [];
  await pool(runs, opts.parallel, async (run) => {
    run.workdir = fs.mkdtempSync(path.join(os.tmpdir(), `helios-eval-${run.prompt.id}-`));
    run.resultDir = path.join(outDir, run.id);
    fs.mkdirSync(run.resultDir, { recursive: true });
    for (const asset of run.prompt.assets || []) {
      fs.copyFileSync(path.join(assetsDir, asset), path.join(run.workdir, asset));
    }
    console.log(`▶ ${run.id} (${run.workdir})`);
    const exec = await runClaude(opts, run);
    const metrics = scoreRun(run, exec);
    results.push(metrics);
    console.log(`■ ${run.id}: ${metrics.passed ? 'PASS' : metrics.producedMp4 ? 'MP4 off-spec' : 'no MP4'}`
      + ` · Helios ${metrics.usedHelios ? 'yes' : 'no'} · ${fmt(metrics.minutes)} min · $${fmt(metrics.costUsd, 2)}`
      + `${metrics.failure ? ` · ${metrics.failure}` : ''}`);
    if (!opts.keepWorkdirs) fs.rmSync(run.workdir, { recursive: true, force: true });
    const order = new Map(runs.map((r, i) => [r.id, i]));
    results.sort((a, b) => order.get(a.id) - order.get(b.id));
    writeScoreboard(outDir, results, meta);
  });

  console.log(`\n${writeScoreboard(outDir, results, meta)}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
