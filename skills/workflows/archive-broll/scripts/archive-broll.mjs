#!/usr/bin/env node
// Find, preview and cut B-roll from the Internet Archive (archive.org).
// Node 18+. `clip` and `inspect --large` need ffmpeg on PATH. No API key needed.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const API = 'https://archive.org';
const HEADERS = { 'User-Agent': 'helios-archive-broll/1 (+https://github.com/BintzGavin/helios)' };
const USABLE = new Set(['public-domain', 'cc-by', 'cc-by-sa', 'collection-policy']);
const POLICY_COLLECTIONS = {
  prelinger: 'Prelinger Archives rights statement: https://www.panix.com/~footage/prelarch.html',
};

const usage = `Usage:
  node archive-broll.mjs search "<terms>" [--rows 12] [--collection <id>] [--years 1940-1970]
                         [--sort downloads] [--include-unknown] [--json]
  node archive-broll.mjs inspect <identifier> [--out <dir>] [--thumbs 12] [--large]
  node archive-broll.mjs clip <identifier> --start <sec> --duration <sec> [--out <dir>]
                         [--name <file.mp4>] [--width <px>] [--audio] [--include-unknown]

search   Lists movie items whose rights allow reuse (public domain, CC BY, CC BY-SA,
         or a collection with a public rights policy). NC, ND and unknown are excluded.
inspect  Picks the best MP4, downloads evenly spaced thumbnails named by second offset,
         and writes item.json. Look at the thumbnails to choose start times.
         --large grabs 640px frames with ffmpeg instead of the small archive thumbnails.
clip     Cuts a short H.264 clip over HTTP (no full download), with a silent
         audio track unless --audio, and appends CREDITS.md
         and credits.json in the output directory.`;

const [command, subject, ...rest] = process.argv.slice(2);
const flags = {};
for (let i = 0; i < rest.length; i++) {
  const key = rest[i].replace(/^--/, '');
  if (['include-unknown', 'json', 'audio', 'large'].includes(key)) flags[key] = true;
  else if (rest[i].startsWith('--') && rest[i + 1] !== undefined) flags[key] = rest[++i];
  else fail(`Unexpected argument: ${rest[i]}`);
}

function fail(message) {
  console.error(`${message}\n\n${usage}`);
  process.exit(1);
}

async function getJson(url) {
  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return response.json();
}

const list = value => (Array.isArray(value) ? value : value ? [value] : []);

function classifyRights(licenseurl, collections) {
  const url = String(licenseurl || '').toLowerCase();
  if (url.includes('publicdomain')) return 'public-domain';
  if (url.includes('creativecommons.org/licenses/')) {
    if (url.includes('-nd')) return 'cc-nd';
    if (url.includes('-nc')) return 'cc-nc';
    if (url.includes('/by-sa/')) return 'cc-by-sa';
    if (url.includes('/by/')) return 'cc-by';
  }
  if (!url && list(collections).some(c => POLICY_COLLECTIONS[c])) return 'collection-policy';
  return 'unknown';
}

function rightsNote(rights, licenseurl, collections) {
  if (rights === 'collection-policy') {
    return list(collections).map(c => POLICY_COLLECTIONS[c]).filter(Boolean).join('; ');
  }
  return licenseurl || 'No license stated on the item.';
}

async function search(terms) {
  if (!terms) fail('search needs terms');
  const rows = Number(flags.rows || 12);
  const parts = [`(${terms})`, 'mediatype:(movies)'];
  if (flags.collection) parts.push(`collection:(${flags.collection})`);
  if (flags.years) {
    const [from, to] = flags.years.split('-');
    parts.push(`year:[${from} TO ${to || from}]`);
  }
  // Ask the server for reusable rights first; the client check below is the authority.
  if (!flags['include-unknown']) {
    const policy = Object.keys(POLICY_COLLECTIONS).join(' OR ');
    parts.push(`(licenseurl:*publicdomain* OR licenseurl:*\\/by\\/* OR licenseurl:*\\/by-sa\\/* OR collection:(${policy}))`);
  }
  const params = new URLSearchParams({ q: parts.join(' AND '), rows: String(rows * 3), output: 'json' });
  for (const field of ['identifier', 'title', 'year', 'creator', 'licenseurl', 'collection', 'downloads']) {
    params.append('fl[]', field);
  }
  // Default is relevance; popularity sort surfaces famous films that only mention the terms.
  if (flags.sort === 'downloads') params.append('sort[]', 'downloads desc');
  const data = await getJson(`${API}/advancedsearch.php?${params}`);
  const items = data.response.docs.map(doc => {
    const rights = classifyRights(doc.licenseurl, doc.collection);
    return {
      identifier: doc.identifier,
      title: doc.title,
      year: doc.year || null,
      creator: list(doc.creator).join(', ') || null,
      rights,
      license: rightsNote(rights, doc.licenseurl, doc.collection),
      url: `${API}/details/${doc.identifier}`,
    };
  }).filter(item => USABLE.has(item.rights) || (flags['include-unknown'] && item.rights === 'unknown'))
    .slice(0, rows);
  if (flags.json) return console.log(JSON.stringify(items, null, 2));
  console.log(`${data.response.numFound} matches; ${items.length} with reusable rights shown.`);
  for (const item of items) {
    console.log(`\n[${item.rights}] ${item.identifier}\n  ${item.title}${item.year ? ` (${item.year})` : ''}` +
      `${item.creator ? ` — ${item.creator}` : ''}\n  ${item.url}`);
  }
}

async function loadItem(identifier) {
  if (!identifier) fail('Missing identifier');
  const data = await getJson(`${API}/metadata/${encodeURIComponent(identifier)}`);
  if (!data.metadata) throw new Error(`No such item: ${identifier}`);
  const meta = data.metadata;
  const files = data.files || [];
  const videos = files.filter(f => /\.(mp4|m4v)$/i.test(f.name) && f.length)
    .map(f => ({ ...f, height: Number(f.height || 0), seconds: Number(f.length) }));
  // Prefer browser-friendly H.264 derivatives, then the tallest remaining MP4.
  videos.sort((a, b) =>
    (/h\.264/i.test(b.format) - /h\.264/i.test(a.format)) || (b.height - a.height));
  const video = videos[0];
  const rights = classifyRights(meta.licenseurl, meta.collection);
  return {
    identifier,
    title: list(meta.title).join(' ') || identifier,
    creator: list(meta.creator).join(', ') || null,
    year: meta.year || meta.date || null,
    rights,
    license: rightsNote(rights, meta.licenseurl, meta.collection),
    page: `${API}/details/${identifier}`,
    video: video ? {
      name: video.name,
      format: video.format,
      seconds: video.seconds,
      width: Number(video.width || 0) || null,
      height: video.height || null,
      url: `${API}/download/${identifier}/${encodeURIComponent(video.name).replace(/%2F/g, '/')}`,
    } : null,
    thumbs: files.filter(f => f.format === 'Thumbnail' && /_(\d+)\.jpg$/.test(f.name))
      .map(f => ({ name: f.name, second: Number(f.name.match(/_(\d+)\.jpg$/)[1]) }))
      .sort((a, b) => a.second - b.second),
  };
}

function requireFfmpeg() {
  const probe = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
  if (probe.error || probe.status !== 0) throw new Error('ffmpeg is required on PATH for this step');
}

function hasAudio(url) {
  const probe = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=index',
    '-of', 'csv=p=0', url], { encoding: 'utf8' });
  return probe.status === 0 && probe.stdout.trim() !== '';
}

function ffmpeg(args) {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`ffmpeg failed (${result.status})`);
}

async function inspect(identifier) {
  const item = await loadItem(identifier);
  const dir = path.resolve(flags.out || 'broll', identifier);
  const thumbDir = path.join(dir, 'thumbs');
  fs.mkdirSync(thumbDir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'item.json'), `${JSON.stringify(item, null, 2)}\n`);
  const count = Number(flags.thumbs || 12);
  const saved = [];
  if (item.thumbs.length && !flags.large) {
    const step = Math.max(1, item.thumbs.length / count);
    for (let i = 0; i < item.thumbs.length && saved.length < count; i += step) {
      const thumb = item.thumbs[Math.floor(i)];
      const response = await fetch(`${API}/download/${identifier}/${thumb.name}`, { headers: HEADERS });
      if (!response.ok) continue;
      const file = path.join(thumbDir, `${String(thumb.second).padStart(5, '0')}s.jpg`);
      fs.writeFileSync(file, Buffer.from(await response.arrayBuffer()));
      saved.push(file);
    }
  } else if (item.video) {
    requireFfmpeg();
    for (let i = 0; i < count; i++) {
      const second = Math.floor(((i + 0.5) / count) * item.video.seconds);
      const file = path.join(thumbDir, `${String(second).padStart(5, '0')}s.jpg`);
      ffmpeg(['-ss', String(second), '-i', item.video.url, '-frames:v', '1', '-vf', 'scale=640:-2', file]);
      saved.push(file);
    }
  }
  console.log(`${item.title}${item.year ? ` (${item.year})` : ''}\nrights: ${item.rights} — ${item.license}`);
  console.log(item.video
    ? `video: ${item.video.name} ${item.video.width}x${item.video.height} ${Math.round(item.video.seconds)}s`
    : 'video: none playable (no MP4 derivative)');
  console.log(`item.json and ${saved.length} thumbnails (named by second offset) in ${dir}`);
  for (const file of saved) console.log(`  ${file}`);
}

async function clip(identifier) {
  const start = Number(flags.start);
  const duration = Number(flags.duration);
  if (!(start >= 0) || !(duration > 0)) fail('clip needs --start and --duration in seconds');
  requireFfmpeg();
  const item = await loadItem(identifier);
  if (!item.video) throw new Error(`${identifier} has no MP4 to cut from`);
  if (!USABLE.has(item.rights) && !(flags['include-unknown'] && item.rights === 'unknown')) {
    throw new Error(`${identifier} rights are ${item.rights}; refusing. Pick another item` +
      (item.rights === 'unknown' ? ' or pass --include-unknown after the user confirms the rights.' : '.'));
  }
  const dir = path.resolve(flags.out || 'broll');
  fs.mkdirSync(dir, { recursive: true });
  const name = flags.name || `${identifier}_${start}s_${duration}s.mp4`;
  const output = path.join(dir, name);
  const filters = ['setsar=1'];
  if (flags.width) filters.unshift(`scale=${Number(flags.width)}:-2:flags=lanczos`);
  // A short GOP keeps seeking cheap: Helios seeks the clip on every frame.
  // Every clip gets an audio track: the renderer mixes each <video> into the soundtrack,
  // even muted ones, and fails on a clip with no audio stream. Without --audio it is silent.
  const keepAudio = flags.audio && hasAudio(item.video.url);
  if (flags.audio && !keepAudio) console.warn(`${identifier} has no audio; writing a silent track.`);
  ffmpeg(['-ss', String(start), '-i', item.video.url,
    ...(keepAudio ? [] : ['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo']),
    '-map', '0:v:0', '-map', keepAudio ? '0:a:0' : '1:a:0', '-t', String(duration), '-vf', filters.join(','),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-g', '12', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', keepAudio ? '160k' : '32k', '-shortest', '-movflags', '+faststart', output]);

  const credit = {
    file: name,
    identifier,
    title: item.title,
    creator: item.creator,
    year: item.year,
    rights: item.rights,
    license: item.license,
    source: item.page,
    range: { start, duration },
    retrieved: new Date().toISOString().slice(0, 10),
  };
  const creditsFile = path.join(dir, 'credits.json');
  const credits = fs.existsSync(creditsFile) ? JSON.parse(fs.readFileSync(creditsFile, 'utf8')) : [];
  credits.push(credit);
  fs.writeFileSync(creditsFile, `${JSON.stringify(credits, null, 2)}\n`);
  fs.appendFileSync(path.join(dir, 'CREDITS.md'),
    `- ${name}: "${item.title}"${item.creator ? ` by ${item.creator}` : ''}${item.year ? ` (${item.year})` : ''}, ` +
    `${start}s–${start + duration}s. ${item.license} Source: ${item.page}\n`);
  console.log(`${output}\ncredited in ${path.join(dir, 'CREDITS.md')}`);
}

const commands = { search, inspect, clip };
if (!commands[command]) {
  console.log(usage);
  process.exit(command ? 1 : 0);
}
commands[command](subject).catch(error => {
  console.error(error.message);
  process.exit(1);
});
