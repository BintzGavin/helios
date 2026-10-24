#!/usr/bin/env node
// Roll the random part of a brand video's direction, after the format and the style shortlist are fixed.
// Same seed + same flags = same direction. Node 18+, no dependencies, no network.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const deck = JSON.parse(fs.readFileSync(path.join(here, '../references/direction-deck.json'), 'utf8'));
const stylesDir = path.join(here, '../../../design/motion-styles/references/styles');

const usage = `Usage: node roll-direction.mjs --format <${deck.formats.join('|')}> --styles <slug[,slug...]> [options]
  --styles <list>         Motion styles that fit the brief, best first. One slug locks it;
                          several let the seed pick, skipping styles the last two videos used.
  --seed-file <file>      Seed string (for example from apply-randomness). Hashed to a number.
  --seed <int>            Numeric seed, to reproduce an earlier roll.
  --no-broll              Exclude footage options.
  --lock <axis=option>    Force a pick (repeatable), e.g. --lock camera=locked when the card bans moves.
  --avoid <path>          direction.json file, or a folder to search for them (repeatable).
                          Picks used by the two most recent are skipped where possible.
  --out <file>            Also write the direction to this file.`;

const args = process.argv.slice(2);
const opts = { locks: {}, avoid: [], broll: true };
for (let i = 0; i < args.length; i++) {
  const flag = args[i];
  const value = () => {
    const next = args[++i];
    if (next === undefined) fail(`Missing value for ${flag}`);
    return next;
  };
  if (flag === '--format') opts.format = value();
  else if (flag === '--styles') opts.styles = value().split(',').map(s => s.trim()).filter(Boolean);
  else if (flag === '--seed') opts.seed = Number(value());
  else if (flag === '--seed-file') opts.seedFile = value();
  else if (flag === '--no-broll') opts.broll = false;
  else if (flag === '--lock') {
    const [axis, option] = value().split('=');
    opts.locks[axis] = option;
  } else if (flag === '--avoid') opts.avoid.push(value());
  else if (flag === '--out') opts.out = value();
  else if (flag === '--help' || flag === '-h') { console.log(usage); process.exit(0); }
  else fail(`Unknown argument: ${flag}`);
}

function fail(message) {
  console.error(`${message}\n\n${usage}`);
  process.exit(1);
}

if (!deck.formats.includes(opts.format)) fail(`--format must be one of: ${deck.formats.join(', ')}`);
if (!opts.styles?.length) fail('--styles needs at least one motion-style slug');
if (fs.existsSync(stylesDir)) {
  const known = fs.readdirSync(stylesDir).filter(f => f.endsWith('.md')).map(f => f.slice(0, -3));
  for (const style of opts.styles) {
    if (!known.includes(style)) fail(`Unknown style: ${style}. Choose from: ${known.join(', ')}`);
  }
}

let seed = opts.seed;
if (opts.seedFile) {
  const text = fs.readFileSync(opts.seedFile, 'utf8').trim();
  if (!text) fail(`Seed file is empty: ${opts.seedFile}`);
  seed = crypto.createHash('sha256').update(text).digest().readUInt32BE(0) || 1;
}
if (seed !== undefined && !(Number.isInteger(seed) && seed > 0 && seed < 2 ** 32)) {
  fail('--seed must be an integer from 1 to 4294967295');
}
seed ??= crypto.randomInt(1, 2 ** 32 - 1);

for (const [axis, option] of Object.entries(opts.locks)) {
  const found = deck.axes.find(a => a.id === axis);
  if (!found) fail(`Unknown axis in --lock: ${axis}. Axes: ${deck.axes.map(a => a.id).join(', ')}`);
  const locked = found.options.find(o => o.id === option);
  if (!locked) fail(`Unknown option for ${axis}: ${option}. Choose from: ${found.options.map(o => o.id).join(', ')}`);
  if (locked.needs === 'broll' && !opts.broll) fail(`--lock ${axis}=${option} needs footage; drop --no-broll`);
}

// mulberry32. Use the same function in the page for seeded texture and scatter.
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = mulberry32(seed);
const choose = list => list[Math.floor(random() * list.length)];

function findDirections(target, depth = 0, found = []) {
  if (!fs.existsSync(target) || depth > 6) return found;
  if (fs.statSync(target).isFile()) {
    if (path.basename(target) === 'direction.json') found.push(target);
    return found;
  }
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    if (entry.isDirectory() || entry.name === 'direction.json') findDirections(path.join(target, entry.name), depth + 1, found);
  }
  return found;
}
const outPath = opts.out && path.resolve(opts.out);
const history = opts.avoid.flatMap(target => findDirections(path.resolve(target)))
  .filter(file => file !== outPath)
  .map(file => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } })
  .filter(direction => direction?.picks)
  .sort((a, b) => String(b.rolled_on).localeCompare(String(a.rolled_on)))
  .slice(0, 2);
const recent = axis => new Set(history.map(direction => direction.picks[axis]?.id ?? direction.picks[axis]).filter(Boolean));

// 1. Style: from the fit shortlist, preferring ones the recent videos did not use.
const freshStyles = opts.styles.filter(style => !recent('style').has(style));
const style = choose(freshStyles.length ? freshStyles : opts.styles);

// 2. Everything the format and style leave open.
function pick(axis, pool) {
  if (opts.locks[axis.id]) return axis.options.find(o => o.id === opts.locks[axis.id]);
  const fresh = pool.filter(option => !recent(axis.id).has(option.id));
  return choose(fresh.length ? fresh : pool);
}
const picks = {};
for (const axis of deck.axes) {
  const pool = axis.options.filter(option => !(option.needs === 'broll' && !opts.broll)
    && !(option.avoid || []).includes(opts.format));
  picks[axis.id] = pick(axis, pool);
}

const direction = {
  seed,
  seed_file: opts.seedFile ? path.resolve(opts.seedFile) : null,
  format: opts.format,
  rolled_on: new Date().toISOString(),
  shortlist: opts.styles,
  flags: { broll: opts.broll, locks: opts.locks, avoided: history.length },
  picks: {
    style: { id: style, card: `skills/design/motion-styles/references/styles/${style}.md` },
    ...Object.fromEntries(Object.entries(picks).map(([axis, option]) => [
      axis, { id: option.id, label: option.label, brief: option.brief },
    ])),
  },
};

const text = `${JSON.stringify(direction, null, 2)}\n`;
if (outPath) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, text);
}
process.stdout.write(text);
