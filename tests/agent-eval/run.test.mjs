// Unit checks for the agent video scoreboard harness. Run: node --test tests/agent-eval/
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  aggregateRatings,
  checkDeterminism,
  detectFrameworks,
  firstPreviewMs,
  firstTrySuccess,
  installProjectSkills,
  mcpRenderCommand,
  parseArgs,
  parsePsnr,
  pickRenderCommands,
  scoreboard,
  trackCwds,
} from './run.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RUN = path.join(HERE, 'run.mjs');

function tmpdir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'agent-eval-test-'));
}

test('--reps is an alias for --repeat and every condition is accepted', () => {
  const opts = parseArgs(['--reps', '3', '--conditions', 'baseline,helios,hyperframes,remotion', '--determinism']);
  assert.equal(opts.repeat, 3);
  assert.equal(opts.conditions, 'baseline,helios,hyperframes,remotion');
  assert.equal(opts.determinism, true);
});

test('an unknown condition fails before anything runs', () => {
  const r = spawnSync(process.execPath, [RUN, '--dry-run', '--conditions', 'baseline,manim'], { encoding: 'utf8' });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /Unknown condition: manim/);
});

test('default dry run keeps the two-condition plan and adds no setup lines', () => {
  const out = tmpdir();
  const r = spawnSync(process.execPath, [RUN, '--dry-run', '--out', out], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^16 run\(s\) → /);
  assert.match(r.stdout, /Worst case spend: \$128\.00 \(16 × \$8 cap\)/);
  assert.doesNotMatch(r.stdout, /setup:|hyperframes|remotion/i);
  const commands = r.stdout.split('\n').filter((l) => l.startsWith('  cd <fresh temp dir> && claude -p '));
  assert.equal(commands.length, 16);
  for (const line of commands) {
    assert.ok(line.includes(' --model claude-opus-5-5 --output-format stream-json --verbose --max-budget-usd 8 '
      + '--permission-mode bypassPermissions --setting-sources project --strict-mcp-config --no-session-persistence'));
  }
});

test('four-condition dry run prints a pinned setup for each framework', () => {
  const out = tmpdir();
  const r = spawnSync(process.execPath, [
    RUN, '--dry-run', '--conditions', 'baseline,helios,hyperframes,remotion', '--prompts', 'chart', '--reps', '2',
    '--out', out, '--cache-dir', path.join(out, 'cache'),
  ], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^8 run\(s\)/);
  assert.match(r.stdout, /\[chart__hyperframes__2\]/);
  assert.match(r.stdout, /--plugin-dir \S*hyperframes-9c7ff590fe9e/);
  assert.match(r.stdout, /setup: copy the skills in \S*remotion-473352613039\/skills into <fresh temp dir>\/\.claude\/skills/);
  assert.match(r.stdout, /heygen-com\/hyperframes @ v0\.8\.133 \(9c7ff590fe9e\)/);
});

test('framework detection: render commands, dependencies and MCP renders count; reading a skill does not', () => {
  const dir = tmpdir();
  fs.mkdirSync(path.join(dir, 'my-video'));
  fs.writeFileSync(path.join(dir, 'my-video', 'package.json'), JSON.stringify({ dependencies: { remotion: '4.0.533' } }));
  const d1 = detectFrameworks({ workdir: dir, commands: ['ls', 'cat SKILL.md'], toolNames: [] });
  assert.equal(d1.remotion.installed, true);
  assert.equal(d1.remotion.used, true);
  assert.equal(d1.hyperframes.used, false);
  assert.equal(d1.helios.used, false);

  const empty = tmpdir();
  const d2 = detectFrameworks({ workdir: empty, commands: ['npx hyperframes usage --json'], toolNames: [] });
  assert.equal(d2.hyperframes.used, false, 'usage probe is not a render');
  const d3 = detectFrameworks({
    workdir: empty,
    commands: ['node "/c/hyperframes-9c7ff590fe9e/skills/hyperframes/scripts/plugin-cli.mjs" render --output out.mp4'],
    toolNames: [],
  });
  assert.equal(d3.hyperframes.rendered, true);
  const d4 = detectFrameworks({ workdir: empty, commands: ['npx -y @helios-project/cli@latest render video.html -o v.mp4'], toolNames: [] });
  assert.equal(d4.helios.rendered, true);
  const d5 = detectFrameworks({ workdir: empty, commands: [], toolNames: ['mcp__plugin_helios_helios__render_video'] });
  assert.equal(d5.helios.rendered, true);
  const d6 = detectFrameworks({ workdir: empty, commands: ['npx remotion render src/index.ts Chart out/chart.mp4'], toolNames: [] });
  assert.equal(d6.remotion.rendered, true);
});

test('framework detection ignores the installed skills directory', () => {
  const dir = tmpdir();
  const skill = path.join(dir, '.claude', 'skills', 'remotion-render');
  fs.mkdirSync(skill, { recursive: true });
  fs.writeFileSync(path.join(skill, 'package.json'), JSON.stringify({ dependencies: { remotion: '4' } }));
  const d = detectFrameworks({ workdir: dir, commands: [], toolNames: [], skip: [path.join(dir, '.claude', 'skills')] });
  assert.equal(d.remotion.used, false);
});

test('cwd tracking follows cd the way the Bash tool keeps it between calls', () => {
  const cwds = trackCwds(['mkdir app && cd app', 'npm i', '(cd sub && ls)', 'cd "out dir"; ls', 'cd ..', 'ls'], '/w');
  assert.deepEqual(cwds, ['/w', '/w/app', '/w/app', '/w/app', '/w/app/out dir', '/w/app']);
});

test('render command: the last video-producing call, with the frame producer before an image-sequence encode', () => {
  const calls = [
    { command: 'npm install puppeteer', cwd: '/w', ok: true },
    { command: 'node capture.js', cwd: '/w', ok: true },
    { command: 'ffmpeg -y -framerate 30 -i frames/%05d.png -c:v libx264 out.mp4', cwd: '/w', ok: true },
    { command: 'cp out.mp4 final.mp4', cwd: '/w', ok: true },
  ];
  assert.deepEqual(pickRenderCommands(calls).map((c) => c.command), ['node capture.js', calls[2].command]);

  const framework = [
    { command: 'npx hyperframes render', cwd: '/w/v', ok: false },
    { command: 'npx hyperframes render --quality high', cwd: '/w/v', ok: true },
    { command: 'ls renders', cwd: '/w/v', ok: true },
  ];
  assert.deepEqual(pickRenderCommands(framework).map((c) => c.command), ['npx hyperframes render --quality high']);

  const piped = [{ command: 'node frames.mjs | ffmpeg -f image2pipe -i - -c:v libx264 out.mp4', cwd: '/w', ok: true }];
  assert.equal(pickRenderCommands(piped).length, 1);

  const background = [{ command: 'npx remotion render x out.mp4', cwd: '/w', ok: true, background: true }];
  assert.deepEqual(pickRenderCommands(background), []);
});

test('time to first preview: framework stills, frame grabs, MCP previews and image reads count', () => {
  const calls = [
    { name: 'Bash', input: { command: 'npm i' }, ok: true, ms: 1000 },
    { name: 'Bash', input: { command: 'npx -y @helios-project/cli@latest still video.html --at 1' }, ok: false, ms: 2000 },
    { name: 'Read', input: { file_path: '/w/frame.png' }, ok: true, ms: 3000 },
  ];
  assert.equal(firstPreviewMs(calls), 3000);
  assert.equal(firstPreviewMs([{ name: 'mcp__helios__preview_video', input: {}, ok: true, ms: 42 }]), 42);
  assert.equal(firstPreviewMs([{ name: 'Bash', input: { command: 'ffmpeg -ss 2 -i a.mp4 -frames:v 1 f.png' }, ok: true, ms: 7 }]), 7);
  assert.equal(firstPreviewMs([{ name: 'Bash', input: { command: 'npm i' }, ok: true, ms: 1 }]), null);
});

test('first-try success: duration within ±5%, audio when asked, a readable video stream', () => {
  const probe = { durationSec: 12.5, videoCodec: 'h264', audio: false };
  assert.equal(firstTrySuccess({ durationSec: 12 }, probe).ok, true);
  assert.equal(firstTrySuccess({ durationSec: 12 }, { ...probe, durationSec: 12.7 }).ok, false);
  assert.equal(firstTrySuccess({ durationSec: 15, audio: true }, { ...probe, durationSec: 15 }).ok, false);
  assert.equal(firstTrySuccess({ durationSec: 15 }, { error: 'moov atom not found' }).ok, false);
  assert.equal(firstTrySuccess({ durationSec: 15 }, null).ok, false);
});

test('PSNR parsing handles identical frames and numbers', () => {
  assert.equal(parsePsnr('[Parsed_psnr_0 @ 0x1] PSNR y:inf u:inf v:inf average:inf min:inf max:inf'), Infinity);
  assert.equal(parsePsnr('PSNR r:51.2 g:50.1 b:49.0 average:50.07 min:48.1 max:52.0'), 50.07);
  assert.equal(parsePsnr('no psnr here'), null);
});

test('ratings: mean per run over raters, keyed through the blind key', () => {
  const key = { 'clip-001': { dir: '/r/sonnet', id: 'chart__helios' }, 'clip-002': { dir: '/r/sonnet', id: 'chart__remotion' } };
  const csv = 'rater,clip,score\nA,clip-001,4\nB,clip-001,5\nC,clip-001,3\nA,clip-002,2\n';
  const ratings = aggregateRatings(key, csv);
  assert.deepEqual(ratings.get('/r/sonnet::chart__helios'), { mean: 4, n: 3 });
  assert.deepEqual(ratings.get('/r/sonnet::chart__remotion'), { mean: 2, n: 1 });
  assert.throws(() => aggregateRatings(key, 'rater,clip,score\nA,clip-009,4\n'), /unknown clip/);
  assert.throws(() => aggregateRatings(key, 'rater,clip,score\nA,clip-001,7\n'), /score/);
});

test('rescoring results written before this change still renders a scoreboard', () => {
  const legacy = {
    id: 'chart__helios', prompt: 'chart', condition: 'helios', repeat: 1, usedHelios: true, heliosSkillCalls: [],
    tools: ['helios'], producedMp4: true, passed: true, probe: { durationSec: 12, audio: false, width: 1920, height: 1080 },
    minutes: 4, costUsd: 2.5, turns: 30, failure: '',
  };
  const md = scoreboard([legacy], { startedAt: 'x', model: 'm', budget: 8, timeoutMin: 40, prompts: [{ id: 'chart', expect: { durationSec: 12 } }] });
  assert.match(md, /\| helios \| 1 \| 1\/1 \| 1\/1 \| 1\/1 \|/);
});

test('a Helios MCP render becomes the equivalent pinned CLI render', () => {
  const cmd = mcpRenderCommand('mcp__plugin_helios_helios__render_video', { path: 'chart.html', duration: 12, audio: "it's.mp3" }, '@helios-project/cli@0.46.0');
  assert.equal(cmd, "npx -y @helios-project/cli@0.46.0 render 'chart.html' -o 'chart.mp4' --duration '12' --audio 'it'\\''s.mp3'");
  assert.equal(mcpRenderCommand('mcp__plugin_helios_helios__preview_video', { path: 'a.html' }), null);
  assert.equal(mcpRenderCommand('Bash', { command: 'ls' }), null);
});

const SCRIPT = (color) => `import { execFileSync } from 'node:child_process';
execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=${color}:s=64x64:d=1:r=10', '-pix_fmt', 'yuv420p', 'out.mp4']);
`;

async function determinismOf(script) {
  const workdir = tmpdir();
  const resultDir = tmpdir();
  fs.writeFileSync(path.join(workdir, 'make.mjs'), script);
  const run = { workdir, resultDir, opts: { rerenderTimeoutMin: 1, keepWorkdirs: false } };
  const calls = [{ command: 'node make.mjs', cwd: workdir, ok: true }];
  return checkDeterminism(run, calls, path.join(workdir, 'out.mp4'));
}

test('determinism: the same render twice passes, a render that changes each time fails', async () => {
  const same = await determinismOf(SCRIPT('red'));
  assert.equal(same.deterministic, true, same.reason);
  assert.equal(same.frames.length, 5);
  assert.deepEqual(same.commands, [{ command: 'node make.mjs', cwd: '.' }]);

  const random = await determinismOf(SCRIPT('red').replace("'color=c=red", "'color=c=0x' + crypto.randomBytes(3).toString('hex') + '")
    .replace('import {', "import crypto from 'node:crypto';\nimport {"));
  assert.equal(random.deterministic, false);
  assert.match(random.reason, /frames differ/);

  const none = await checkDeterminism({ workdir: tmpdir(), resultDir: tmpdir(), opts: {} }, [{ command: 'ls', cwd: '/', ok: true }], 'x.mp4');
  assert.deepEqual([none.deterministic, none.reason], [false, 'no render command found']);
});

test('project skills are copied under .claude/skills, one directory per SKILL.md', () => {
  const src = tmpdir();
  for (const name of ['remotion-render', 'remotion-create']) {
    fs.mkdirSync(path.join(src, name, 'rules'), { recursive: true });
    fs.writeFileSync(path.join(src, name, 'SKILL.md'), `---\nname: ${name}\n---\n`);
    fs.writeFileSync(path.join(src, name, 'rules', 'a.md'), 'x');
  }
  fs.writeFileSync(path.join(src, 'README.md'), 'not a skill');
  const work = tmpdir();
  const names = installProjectSkills(src, work);
  assert.deepEqual(names.sort(), ['remotion-create', 'remotion-render']);
  assert.ok(fs.existsSync(path.join(work, '.claude', 'skills', 'remotion-render', 'rules', 'a.md')));
  assert.ok(!fs.existsSync(path.join(work, '.claude', 'skills', 'README.md')));
});
