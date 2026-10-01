import fs from 'fs';
import path from 'path';
import { isInside, toRootRelative } from './paths.js';

/**
 * Turns a page on disk into one self-contained HTML string for the MCP App view, which runs in
 * a sandbox that can't load files next to the page.
 *
 * It inlines, as long as the file is inside the project root and the running total stays under
 * the size cap:
 * - `src`/`href` of img, audio, video, source, script and link[rel=stylesheet] (scripts become
 *   inline scripts, stylesheets become <style>, media becomes data: URIs);
 * - quoted string literals in scripts that look like a relative file path with a known
 *   extension; those are served by a small fetch() wrapper injected at the top of <head>.
 *
 * Limits, on purpose (it is regex-based, not a parser):
 * - url(...) inside CSS, srcset, poster, <link rel=icon|preload> and inline style attributes are
 *   left alone;
 * - an inlined module script's own relative imports don't resolve; an inlined classic script
 *   with defer/async runs where it stands instead;
 * - only fetch() sees the literal files: XMLHttpRequest, new Image().src = 'x.png' and
 *   CSS loaded at runtime don't;
 * - markup inside comments and <style> is left alone; markup inside a script string is not
 *   rewritten (only its quoted file paths are served to fetch());
 * - a literal that merely looks like a path but isn't a file is reported as skipped.
 */

export const DEFAULT_MAX_INLINE_BYTES = 8 * 1024 * 1024;

export interface PageBundle {
  html: string;
  /** Root-relative paths of the files that were inlined. */
  inlined: string[];
  /** References that were not inlined, each with the reason. */
  skipped: string[];
}

export interface BundleOptions {
  maxBytes?: number;
}

const MIME_TYPES: Record<string, string> = {
  json: 'application/json',
  csv: 'text/csv',
  txt: 'text/plain',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  ico: 'image/x-icon',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  otf: 'font/otf',
  glb: 'model/gltf-binary',
  gltf: 'model/gltf+json',
  css: 'text/css',
  js: 'text/javascript',
  mjs: 'text/javascript',
};

const LITERAL_EXTENSIONS = [
  'json', 'csv', 'txt', 'svg', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'mp3', 'wav', 'ogg', 'm4a',
  'mp4', 'webm', 'woff', 'woff2', 'ttf', 'otf', 'glb', 'gltf',
];

/** A quoted relative path ending in a known extension: 'data/points.json', "./a b.png" is not. */
const LITERAL_RE = new RegExp(
  String.raw`(["'\x60])((?!\/)(?![a-z][a-z\d+.-]*:)[^"'\x60\s<>{}$\\?#]+\.(?:${LITERAL_EXTENSIONS.join('|')}))\1`,
  'gi',
);

/** One pass over the markup: comments and <style> stay opaque, scripts and media tags are rewritten. */
const MARKUP_RE = /<!--[\s\S]*?-->|<style\b[^>]*>[\s\S]*?<\/style\s*>|<script\b([^>]*)>([\s\S]*?)<\/script\s*>|<(img|audio|video|source|link)\b((?:[^>"']|"[^"]*"|'[^']*')*)>/gi;

function mimeOf(file: string): string {
  return MIME_TYPES[path.extname(file).slice(1).toLowerCase()] ?? 'application/octet-stream';
}

interface Attr {
  value: string;
  start: number;
  end: number;
}

function findAttr(attrs: string, name: string): Attr | undefined {
  const re = new RegExp(String.raw`(^|\s)${name}\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))`, 'i');
  const match = re.exec(attrs);
  if (!match) return undefined;
  const raw = match[2] ?? match[3] ?? match[4] ?? '';
  return {
    value: raw.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'"),
    start: match.index + match[1].length,
    end: match.index + match[0].length,
  };
}

/** Why a reference isn't a local relative file, or undefined when it is one. */
function nonLocalReason(ref: string): string | null | undefined {
  const value = ref.trim();
  if (value === '' || value.startsWith('#')) return null; // nothing to load
  if (/^(data|blob|javascript|about|mailto):/i.test(value)) return null;
  if (/^https?:/i.test(value) || value.startsWith('//')) return 'remote URL; it loads from the network only if the host allows its origin';
  if (/^[a-z][a-z\d+.-]*:/i.test(value)) return 'unsupported URL scheme';
  if (value.startsWith('/') || value.startsWith('\\')) return 'absolute path; use a path relative to the page';
  return undefined;
}

function formatLimit(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${Number((bytes / 1024 / 1024).toFixed(1))} MB`;
  if (bytes >= 1024) return `${Number((bytes / 1024).toFixed(1))} KB`;
  return `${bytes} B`;
}

function escapeScriptText(text: string): string {
  return text.replace(/<\/(script)/gi, '<\\/$1');
}

function escapeStyleText(text: string): string {
  return text.replace(/<\/(style)/gi, '<\\/$1');
}

export async function bundlePage(pagePath: string, root: string, options: BundleOptions = {}): Promise<PageBundle> {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_INLINE_BYTES;
  const html = await fs.promises.readFile(pagePath, 'utf8');
  const pageDir = path.dirname(pagePath);

  const inlined = new Set<string>();
  const skipped = new Set<string>();
  const cache = new Map<string, Buffer | string>();
  let total = 0;

  /** The file's bytes if it may be inlined, else records why not and returns undefined. */
  async function load(ref: string): Promise<{ data: Buffer; file: string } | undefined> {
    const reason = nonLocalReason(ref);
    if (reason === null) return undefined;
    if (reason !== undefined) {
      skipped.add(`${ref} (${reason})`);
      return undefined;
    }
    let decoded = ref.trim().replace(/[?#].*$/, '');
    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      // keep it as written
    }
    const lexical = path.resolve(pageDir, decoded);
    if (!isInside(root, lexical)) {
      skipped.add(`${ref} (outside the project root)`);
      return undefined;
    }
    const known = cache.get(lexical);
    if (typeof known === 'string') {
      skipped.add(`${ref} (${known})`);
      return undefined;
    }
    if (known) return { data: known, file: lexical };

    const fail = (why: string) => {
      cache.set(lexical, why);
      skipped.add(`${ref} (${why})`);
      return undefined;
    };
    let real: string;
    try {
      real = await fs.promises.realpath(lexical);
    } catch {
      return fail('not found');
    }
    if (!isInside(root, real)) return fail('outside the project root');
    const stat = await fs.promises.stat(real);
    if (!stat.isFile()) return fail('not a file');
    if (total + stat.size > maxBytes) {
      return fail(`over the ${formatLimit(maxBytes)} inline limit`);
    }
    const data = await fs.promises.readFile(real);
    total += data.length;
    cache.set(lexical, data);
    inlined.add(toRootRelative(root, real));
    return { data, file: real };
  }

  // Literal file references found in scripts, keyed as written.
  const files: Record<string, { mime: string; base64: string }> = {};
  async function collectLiterals(code: string): Promise<void> {
    for (const match of code.matchAll(LITERAL_RE)) {
      const literal = match[2];
      if (literal in files) continue;
      const loaded = await load(literal);
      if (loaded) files[literal] = { mime: mimeOf(loaded.file), base64: loaded.data.toString('base64') };
    }
  }

  async function rewrite(match: string, scriptAttrs: string | undefined, scriptBody: string | undefined, tag: string | undefined, tagAttrs: string | undefined): Promise<string> {
    if (scriptAttrs !== undefined) {
      const src = findAttr(scriptAttrs, 'src');
      if (!src) {
        await collectLiterals(scriptBody ?? '');
        return match;
      }
      const loaded = await load(src.value);
      if (!loaded) return match;
      const text = loaded.data.toString('utf8');
      await collectLiterals(text);
      const type = findAttr(scriptAttrs, 'type');
      const isModule = type?.value.trim().toLowerCase() === 'module';
      return `<script${isModule ? ' type="module"' : ''}>${escapeScriptText(text)}</script>`;
    }

    if (tag === undefined || tagAttrs === undefined) return match;
    const name = tag.toLowerCase();
    if (name === 'link') {
      const rel = findAttr(tagAttrs, 'rel');
      if (!rel || !rel.value.toLowerCase().split(/\s+/).includes('stylesheet')) return match;
      const href = findAttr(tagAttrs, 'href');
      if (!href) return match;
      const loaded = await load(href.value);
      if (!loaded) return match;
      const media = findAttr(tagAttrs, 'media');
      const mediaAttr = media ? ` media="${media.value.replace(/"/g, '&quot;')}"` : '';
      return `<style${mediaAttr}>${escapeStyleText(loaded.data.toString('utf8'))}</style>`;
    }

    const src = findAttr(tagAttrs, 'src');
    if (!src) return match;
    const loaded = await load(src.value);
    if (!loaded) return match;
    const dataUri = `data:${mimeOf(loaded.file)};base64,${loaded.data.toString('base64')}`;
    const attrs = `${tagAttrs.slice(0, src.start)}src="${dataUri}"${tagAttrs.slice(src.end)}`;
    return `<${tag}${attrs}>`;
  }

  // String.replace can't await, so rewrite matches in order and splice them back together.
  let out = '';
  let last = 0;
  for (const match of html.matchAll(MARKUP_RE)) {
    out += html.slice(last, match.index);
    out += await rewrite(match[0], match[1], match[2], match[3], match[4]);
    last = match.index! + match[0].length;
  }
  out += html.slice(last);

  if (Object.keys(files).length > 0) out = injectAtHeadStart(out, fetchShim(files));
  return { html: out, inlined: [...inlined], skipped: [...skipped] };
}

/** A script that serves the literal files to fetch() and passes every other request through. */
function fetchShim(files: Record<string, { mime: string; base64: string }>): string {
  const data = JSON.stringify(files).replace(/</g, '\\u003c');
  return `<script>(function(){
var files = window.__HELIOS_FILES__ = ${data};
var realFetch = window.fetch;
function norm(u){ u = String(u).split('#')[0].split('?')[0]; try { u = decodeURIComponent(u); } catch (e) {} while (u.indexOf('./') === 0) u = u.slice(2); return u; }
var byPath = {};
Object.keys(files).forEach(function(k){ byPath[norm(k)] = files[k]; });
function lookup(u){
  if (Object.prototype.hasOwnProperty.call(files, u)) return files[u];
  var n = norm(u);
  if (Object.prototype.hasOwnProperty.call(byPath, n)) return byPath[n];
  if (/^[a-z][a-z0-9+.-]*:/i.test(n) || n.charAt(0) === '/') {
    for (var k in byPath) { if (n.slice(-(k.length + 1)) === '/' + k) return byPath[k]; }
  }
  return null;
}
window.fetch = function(input, init){
  try {
    var url = typeof input === 'string' ? input : (input && (input.url || input.href)) || String(input);
    var hit = lookup(url);
    if (hit) {
      var bin = atob(hit.base64), bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return Promise.resolve(new Response(bytes, { status: 200, headers: { 'Content-Type': hit.mime } }));
    }
  } catch (e) {}
  return realFetch.apply(this, arguments);
};
})();</script>`;
}

function injectAtHeadStart(html: string, snippet: string): string {
  const head = /<head\b[^>]*>/i.exec(html);
  if (head) return html.slice(0, head.index + head[0].length) + snippet + html.slice(head.index + head[0].length);
  const doc = /<html\b[^>]*>/i.exec(html) ?? /<!doctype[^>]*>/i.exec(html);
  if (doc) return html.slice(0, doc.index + doc[0].length) + snippet + html.slice(doc.index + doc[0].length);
  return snippet + html;
}
