import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { CallToolResult, ServerNotification, ServerRequest } from '@modelcontextprotocol/sdk/types.js';
import { createCliRunner, errorFromStderr, runCli, stripAnsi, type CliRunner } from './cli-runner.js';
import { JobLimitError, RenderJobs, type RenderJob } from './jobs.js';
import { bundlePage } from './page-bundle.js';
import { PathError, resolveInRoot, toRootRelative } from './paths.js';

export const PLAYER_URI = 'ui://helios/player';
export const PLAYER_MIME_TYPE = 'text/html;profile=mcp-app';
export const SHIM_TOKEN = '"__HELIOS_PAGE_SHIM__"';

/** Origins the view may load fonts and libraries from (the skill tells the model to stay within them). */
export const VIEW_RESOURCE_DOMAINS = [
  'https://cdnjs.cloudflare.com',
  'https://cdn.jsdelivr.net',
  'https://unpkg.com',
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
];

const VIEW_META = { ui: { csp: { resourceDomains: VIEW_RESOURCE_DOMAINS }, prefersBorder: false } };
const OPENS_VIEW_META = { ui: { resourceUri: PLAYER_URI }, 'openai/outputTemplate': PLAYER_URI };
const APP_ONLY_META = { ui: { visibility: ['app'] }, 'openai/visibility': 'private', 'openai/widgetAccessible': true };
/** Model tools the view also calls (render, follow, cancel). ChatGPT's Apps SDK keys alongside MCP Apps. */
const VIEW_CALLABLE_META = { 'openai/widgetAccessible': true };

/** The encoder presets `helios render --preset` accepts (X264_PRESETS in commands/render.ts). */
const X264_PRESETS = ['ultrafast', 'superfast', 'veryfast', 'faster', 'fast', 'medium', 'slow', 'slower', 'veryslow', 'placebo'] as const;

const DEFAULT_WIDTH = 1920;
const DEFAULT_HEIGHT = 1080;
const DEFAULT_FPS = 30;

/** Files reveal_file will show or open: renders, stills and pages. */
const REVEALABLE = /\.(mp4|mov|webm|gif|png|jpe?g|html?)$/i;

/** Shows a file in Finder / Explorer / the Linux file manager, or opens it in its default app. */
function revealWithSystem(absPath: string, open: boolean): Promise<void> {
  const [command, args] =
    process.platform === 'darwin' ? ['open', open ? [absPath] : ['-R', absPath]] :
    process.platform === 'win32' ? (open ? ['cmd', ['/c', 'start', '""', absPath]] : ['explorer.exe', [`/select,${absPath}`]]) :
    ['xdg-open', [open ? absPath : path.dirname(absPath)]];
  return new Promise((resolve, reject) => {
    const child = spawn(command as string, args as string[], { stdio: 'ignore', detached: true, windowsHide: true });
    child.once('error', (err) => reject(new Error(`Could not run ${command}: ${err.message}`)));
    child.once('spawn', () => { child.unref(); resolve(); });
  });
}

/** Largest page preview_video will save, in characters. */
const MAX_PAGE_CHARS = 4_000_000;

const LIST_MAX_DEPTH = 3;
const LIST_MAX_ITEMS = 200;
const LIST_SKIP_DIRS = new Set(['node_modules', '.git', 'dist']);

export interface HeliosMcpOptions {
  /** Project root; every path argument must stay inside it. */
  root: string;
  /** Server version reported to hosts (default: the CLI package version). */
  version?: string;
  /** Starts `helios <args>` (default: this package's bin, run with the current node). */
  runner?: CliRunner;
  /** The player view HTML (default: view/player.html next to this module). */
  viewPath?: string;
  /** Builds the renderer's seek shim for the view (default: buildPageShim from the renderer). */
  buildShim?: () => string | Promise<string>;
  /** Shows a file in the system file manager, or opens it (default: open, explorer or xdg-open). */
  reveal?: (absPath: string, open: boolean) => Promise<void>;
  /** Grace period between SIGTERM and SIGKILL when a render is cancelled. */
  killGraceMs?: number;
}

export interface HeliosMcp {
  server: McpServer;
  jobs: RenderJobs;
  root: string;
}

type Extra = RequestHandlerExtra<ServerRequest, ServerNotification>;

export function packageVersion(): string {
  const pkgPath = fileURLToPath(new URL('../../package.json', import.meta.url));
  return JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version;
}

function defaultViewPath(): string {
  return fileURLToPath(new URL('./view/player.html', import.meta.url));
}

async function defaultBuildShim(): Promise<string> {
  const { buildPageShim } = await import('@helios-project/renderer');
  return buildPageShim();
}

/** The view with the seek shim written in as a JS string literal that is safe inside <script>. */
export function injectShim(viewHtml: string, shim: string): string {
  const literal = JSON.stringify(shim).replace(/</g, '\\u003c');
  if (!viewHtml.includes(SHIM_TOKEN)) {
    console.error(`helios mcp: the player view has no ${SHIM_TOKEN} placeholder; serving it without the seek shim`);
    return viewHtml;
  }
  return viewHtml.split(SHIM_TOKEN).join(literal);
}

function toolError(message: string): CallToolResult {
  return { content: [{ type: 'text', text: message }], isError: true };
}

/** Turns path and job errors into tool errors the model can read and act on. */
function guard<A>(fn: (args: A, extra: Extra) => Promise<CallToolResult>) {
  return async (args: A, extra: Extra): Promise<CallToolResult> => {
    try {
      return await fn(args, extra);
    } catch (err: any) {
      return toolError(err instanceof Error ? err.message : String(err));
    }
  };
}

function seconds(n: number): string {
  return `${Number(n.toFixed(3))} s`;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

export function createHeliosMcpServer(options: HeliosMcpOptions): HeliosMcp {
  const root = fs.realpathSync(path.resolve(options.root));
  if (!fs.statSync(root).isDirectory()) throw new Error(`--root ${options.root} is not a directory`);
  const runner = options.runner ?? createCliRunner();
  const jobs = new RenderJobs(runner, root, { killGraceMs: options.killGraceMs });
  const viewPath = options.viewPath ?? defaultViewPath();
  const buildShim = options.buildShim ?? defaultBuildShim;
  const reveal = options.reveal ?? revealWithSystem;

  const server = new McpServer({ name: 'helios', version: options.version ?? packageVersion() });

  // ---- The view -------------------------------------------------------------------------

  let viewHtml: Promise<string> | undefined;
  function loadView(): Promise<string> {
    if (!viewHtml) {
      viewHtml = (async () => injectShim(await fs.promises.readFile(viewPath, 'utf8'), await buildShim()))();
      // Don't cache a failure: the view may be built after the server starts.
      viewHtml.catch(() => { viewHtml = undefined; });
    }
    return viewHtml;
  }

  server.registerResource(
    'helios-player',
    PLAYER_URI,
    {
      title: 'Helios player',
      description: 'Plays a Helios video page frame-exactly, and lists the project\'s videos.',
      mimeType: PLAYER_MIME_TYPE,
      _meta: VIEW_META,
    },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: PLAYER_MIME_TYPE, text: await loadView(), _meta: VIEW_META }],
    }),
  );

  // ---- Shared argument shapes ---------------------------------------------------------------

  const pagePath = z.string().min(1).describe('The video page: an HTML file, relative to the project root');
  const duration = z.number().positive().describe('Length in seconds (default: what the page declares)');
  const width = z.number().int().positive().max(7680).describe('Width in pixels (default: the page\'s, else 1920)');
  const height = z.number().int().positive().max(4320).describe('Height in pixels (default: the page\'s, else 1080)');
  const fps = z.number().positive().max(240).describe('Frames per second (default: the page\'s, else 30)');

  const renderStatusShape = {
    jobId: z.string(),
    status: z.enum(['running', 'completed', 'failed', 'cancelled']),
    output: z.string(),
    absoluteOutput: z.string(),
    progress: z.number().nullable(),
    elapsedSeconds: z.number(),
    bytes: z.number().optional(),
    error: z.string().optional(),
    logTail: z.array(z.string()).optional(),
  };

  // ---- Model tools that open the view ------------------------------------------------------

  server.registerTool(
    'preview_video',
    {
      title: 'Preview video',
      description:
        'Shows a Helios video page (an HTML file in the project) in an interactive player in the conversation. ' +
        'Helios videos are drawn with code: motion graphics, launch and explainer videos, animated charts and data, logo reveals, social clips, music visualizers, UI demos and GIF loops. ' +
        'Not for live-action or AI-generated realistic footage or editing camera video. ' +
        'Use it after writing or changing a page so the person can watch, scrub, and select a moment or element to discuss; it renders nothing and opens no browser. ' +
        'Pass duration, width, height and fps when the page does not declare them. ' +
        'If you cannot write files yourself, pass the page as html: it is saved to path first (replacing that file), then previewed.',
      inputSchema: {
        path: pagePath,
        html: z.string().min(1).max(MAX_PAGE_CHARS).optional()
          .describe('The complete page. When given, it is saved to path (an .html file in the project; folders are created) before previewing'),
        duration: duration.optional(), width: width.optional(), height: height.optional(), fps: fps.optional(),
      },
      outputSchema: {
        mode: z.literal('player'),
        path: z.string(),
        absolutePath: z.string(),
        duration: z.number().nullable(),
        width: z.number(),
        height: z.number(),
        fps: z.number(),
      },
      annotations: { title: 'Preview video', readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      _meta: OPENS_VIEW_META,
    },
    guard(async (args) => {
      let saved = false;
      if (args.html !== undefined) {
        if (!/\.html?$/i.test(args.path)) throw new PathError(`path "${args.path}" must end in .html to save a page there`);
        const target = await resolveInRoot(root, args.path, { kind: 'new' });
        await fs.promises.mkdir(path.dirname(target.abs), { recursive: true });
        await fs.promises.writeFile(target.abs, args.html, 'utf8');
        saved = true;
      }
      const page = await resolveInRoot(root, args.path, { kind: 'file' });
      const structured = {
        mode: 'player' as const,
        path: page.rel,
        absolutePath: page.abs,
        duration: args.duration ?? null,
        width: args.width ?? DEFAULT_WIDTH,
        height: args.height ?? DEFAULT_HEIGHT,
        fps: args.fps ?? DEFAULT_FPS,
      };
      const length = structured.duration !== null ? seconds(structured.duration) : 'its declared length';
      return {
        content: [{
          type: 'text',
          text: `${saved ? `Saved ${page.rel}. ` : ''}Previewing ${page.rel} (${length}, ${structured.width}×${structured.height}) in the conversation. ` +
            `The page is at ${page.abs}. ` +
            'The person can scrub it and select a moment or an element; their selection reaches you as context.',
        }],
        structuredContent: structured,
      };
    }),
  );

  server.registerTool(
    'helios_library',
    {
      title: 'Helios',
      description:
        'Opens the Helios library: the video pages and rendered MP4s in this project. ' +
        'Use it when the person wants to browse, reopen or continue one of their videos.',
      inputSchema: {},
      outputSchema: { mode: z.literal('library') },
      annotations: { title: 'Helios', readOnlyHint: true, openWorldHint: false },
      _meta: {
        ...OPENS_VIEW_META,
        'openai/ui': { entrypoints: [{ type: 'global' }, { type: 'thread' }] },
      },
    },
    guard(async () => ({
      content: [{ type: 'text', text: 'Opened the Helios library.' }],
      structuredContent: { mode: 'library' as const },
    })),
  );

  // ---- App-only tools ---------------------------------------------------------------------

  server.registerTool(
    'read_page',
    {
      title: 'Read page',
      description: 'Returns a video page\'s HTML with its local files inlined, so the Helios player can run it.',
      inputSchema: { path: pagePath },
      outputSchema: { path: z.string(), html: z.string(), inlined: z.array(z.string()), skipped: z.array(z.string()) },
      annotations: { title: 'Read page', readOnlyHint: true, openWorldHint: false },
      _meta: APP_ONLY_META,
    },
    guard(async (args) => {
      const page = await resolveInRoot(root, args.path, { kind: 'file' });
      const bundle = await bundlePage(page.abs, root);
      return {
        content: [{
          type: 'text',
          text: `Read ${page.rel} (${formatBytes(Buffer.byteLength(bundle.html))}, ${bundle.inlined.length} files inlined, ${bundle.skipped.length} skipped).`,
        }],
        structuredContent: { path: page.rel, ...bundle },
      };
    }),
  );

  server.registerTool(
    'list_videos',
    {
      title: 'List videos',
      description: 'Lists the video pages (.html) and renders (.mp4) in the project, newest first.',
      inputSchema: {},
      outputSchema: {
        root: z.string(),
        pages: z.array(z.object({ path: z.string(), modifiedMs: z.number() })),
        renders: z.array(z.object({ path: z.string(), bytes: z.number(), modifiedMs: z.number() })),
      },
      annotations: { title: 'List videos', readOnlyHint: true, openWorldHint: false },
      _meta: APP_ONLY_META,
    },
    guard(async () => {
      const { pages, renders } = await listVideos(root);
      return {
        content: [{ type: 'text', text: `Found ${pages.length} pages and ${renders.length} renders.` }],
        structuredContent: { root, pages, renders },
      };
    }),
  );

  server.registerTool(
    'reveal_file',
    {
      title: 'Show file',
      description: 'Shows a rendered video or page in Finder (or the system file manager), or opens it in its default app.',
      inputSchema: {
        path: z.string().min(1).describe('A file in the project, relative to the project root'),
        open: z.boolean().optional().describe('Open the file in its default app instead of showing it in its folder'),
      },
      annotations: { title: 'Show file', readOnlyHint: true, openWorldHint: false },
      _meta: APP_ONLY_META,
    },
    guard(async (args) => {
      const file = await resolveInRoot(root, args.path, { kind: 'file' });
      if (!REVEALABLE.test(file.abs)) throw new PathError(`Only videos, images and pages can be shown (got "${args.path}")`);
      await reveal(file.abs, args.open === true);
      return { content: [{ type: 'text', text: `${args.open ? 'Opened' : 'Showed'} ${file.rel}.` }] };
    }),
  );

  // ---- Rendering ------------------------------------------------------------------------------

  /** Waits for the job, sending progress notifications when the request asked for them. */
  async function waitForJob(job: RenderJob, waitSeconds: number, extra: Extra): Promise<void> {
    const token = extra._meta?.progressToken;
    let lastPercent = -1;
    const report = (j: RenderJob) => {
      if (token === undefined || j.progress === null) return;
      const percent = Math.round(j.progress * 100);
      if (percent <= lastPercent) return;
      lastPercent = percent;
      extra.sendNotification({
        method: 'notifications/progress',
        params: { progressToken: token, progress: percent, total: 100, message: `Rendering ${j.outputRel}: ${percent}%` },
      }).catch(() => {});
    };
    report(job);
    const off = jobs.subscribe(job, report);
    try {
      await jobs.wait(job, waitSeconds * 1000, extra.signal);
    } finally {
      off();
    }
  }

  function renderResult(job: RenderJob): CallToolResult {
    const snapshot = jobs.snapshot(job);
    let text: string;
    switch (job.status) {
      case 'completed':
        text = `Rendered ${job.outputRel} (${job.duration !== undefined ? `${job.duration.toFixed(1)} s requested, ` : ''}` +
          `${formatBytes(job.bytes ?? 0)}) in ${Math.round(snapshot.elapsedSeconds)} s. It is at ${job.output}`;
        break;
      case 'failed':
        text = `Render of ${job.outputRel} failed: ${job.error ?? 'unknown error'}`;
        break;
      case 'cancelled':
        text = `Cancelled the render of ${job.outputRel}.`;
        break;
      default:
        text = `Still rendering ${job.outputRel}${job.progress !== null ? ` (${Math.round(job.progress * 100)}%)` : ''}. ` +
          `Call get_render_status with jobId "${job.id}" to wait for it.`;
    }
    return { content: [{ type: 'text', text }], structuredContent: snapshot };
  }

  const waitSeconds = z.number().min(0).max(100);

  server.registerTool(
    'render_video',
    {
      title: 'Render video',
      description:
        'Renders a Helios video page, a video drawn with code, to an MP4 on this machine with Chromium and FFmpeg. It does not generate realistic footage or edit camera video. ' +
        'If it is not done within waitSeconds it keeps rendering in the background and returns a jobId for get_render_status. ' +
        'Run verify_video first on a new or changed page: a page whose frames are not a function of time alone renders wrong.',
      inputSchema: {
        path: pagePath,
        output: z.string().min(1).optional().describe('Output file, relative to the project root (default: the page name with .mp4, next to the page)'),
        duration: duration.optional(),
        width: width.optional(),
        height: height.optional(),
        fps: fps.optional(),
        audio: z.string().min(1).optional().describe('Soundtrack file inside the project'),
        preset: z.enum(X264_PRESETS).optional().describe('Encoder preset: ultrafast (default) renders fastest; medium or slow make much smaller files'),
        mode: z.enum(['dom', 'canvas']).optional().describe('dom (default) screenshots the page and works for any page; canvas captures the first <canvas>, faster'),
        waitSeconds: waitSeconds.default(45).describe('How long to wait for the render before returning a jobId (0-100, default 45)'),
      },
      outputSchema: renderStatusShape,
      annotations: { title: 'Render video', readOnlyHint: false, idempotentHint: false, openWorldHint: false },
      _meta: VIEW_CALLABLE_META,
    },
    guard(async (args, extra) => {
      const page = await resolveInRoot(root, args.path, { kind: 'file' });
      const outputInput = args.output ?? path.join(path.dirname(page.abs), `${path.parse(page.abs).name}.mp4`);
      const output = await resolveInRoot(root, outputInput, { kind: 'new', label: 'output' });
      if (output.abs === page.abs) throw new PathError('output would overwrite the page itself');
      if (fs.existsSync(output.abs) && fs.statSync(output.abs).isDirectory()) {
        throw new PathError(`output "${output.rel}" is a directory`);
      }
      const audio = args.audio !== undefined ? await resolveInRoot(root, args.audio, { kind: 'file', label: 'audio' }) : undefined;
      await fs.promises.mkdir(path.dirname(output.abs), { recursive: true });

      const cli = ['render', page.abs, '-o', output.abs];
      if (args.duration !== undefined) cli.push('--duration', String(args.duration));
      if (args.width !== undefined) cli.push('--width', String(args.width));
      if (args.height !== undefined) cli.push('--height', String(args.height));
      if (args.fps !== undefined) cli.push('--fps', String(args.fps));
      if (audio) cli.push('--audio', audio.abs);
      if (args.preset !== undefined) cli.push('--preset', args.preset);
      if (args.mode !== undefined) cli.push('--mode', args.mode);

      let job: RenderJob;
      try {
        job = jobs.start(cli, output, args.duration);
      } catch (err) {
        if (err instanceof JobLimitError) return toolError(err.message);
        throw err;
      }
      await waitForJob(job, args.waitSeconds, extra);
      return renderResult(job);
    }),
  );

  server.registerTool(
    'get_render_status',
    {
      title: 'Render status',
      description:
        'Reports on a render started by render_video, waiting up to waitSeconds for it to finish. ' +
        'Call it again with the same jobId until the status is completed, failed or cancelled.',
      inputSchema: {
        jobId: z.string().min(1),
        waitSeconds: waitSeconds.default(30).describe('How long to wait for the render to finish (0-100, default 30)'),
      },
      outputSchema: renderStatusShape,
      annotations: { title: 'Render status', readOnlyHint: true, openWorldHint: false },
      _meta: VIEW_CALLABLE_META,
    },
    guard(async (args, extra) => {
      const job = jobs.get(args.jobId);
      if (!job) return toolError(`No render with jobId "${args.jobId}". Start one with render_video.`);
      await waitForJob(job, args.waitSeconds, extra);
      return renderResult(job);
    }),
  );

  server.registerTool(
    'cancel_render',
    {
      title: 'Cancel render',
      description: 'Stops a render started by render_video.',
      inputSchema: { jobId: z.string().min(1) },
      outputSchema: renderStatusShape,
      annotations: { title: 'Cancel render', readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      _meta: VIEW_CALLABLE_META,
    },
    guard(async (args) => {
      const job = jobs.cancel(args.jobId);
      if (!job) return toolError(`No render with jobId "${args.jobId}".`);
      return renderResult(job);
    }),
  );

  // ---- Looking at frames ------------------------------------------------------------------------

  server.registerTool(
    'get_frames',
    {
      title: 'Get frames',
      description:
        'Renders chosen frames of a video page into one labelled contact-sheet PNG that you can look at. ' +
        'Use it to check your own work at specific moments (at: times in seconds) or across the video (every: seconds between frames). ' +
        'It encodes no video, so it is much faster than render_video.',
      inputSchema: {
        path: pagePath,
        at: z.array(z.number().min(0)).min(1).max(24).optional().describe('Times to show, in seconds (1-24 of them)'),
        every: z.number().positive().optional().describe('One frame every N seconds across the duration (when at is not given)'),
        duration: duration.optional(),
        width: width.optional(),
        height: height.optional(),
        crop: z.string().regex(/^\s*\d+(\.\d+)?\s*(,\s*\d+(\.\d+)?\s*){3}$/, 'crop is "x,y,w,h" in pixels').optional()
          .describe('Cut each frame to this region: "x,y,w,h" in pixels'),
        cellWidth: z.number().int().positive().max(1920).default(640).describe('Width of each frame on the sheet, in pixels (default 640)'),
      },
      annotations: { title: 'Get frames', readOnlyHint: true, openWorldHint: false },
    },
    guard(async (args, extra) => {
      const page = await resolveInRoot(root, args.path, { kind: 'file' });
      const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'helios-mcp-'));
      try {
        const sheetPath = path.join(tmp, 'sheet.png');
        const cli = ['sheet', page.abs, '-o', sheetPath];
        if (args.at) {
          cli.push('--at', args.at.join(','));
        } else {
          if (args.every !== undefined) cli.push('--every', String(args.every));
          if (args.duration !== undefined) cli.push('--duration', String(args.duration));
        }
        cli.push('--cell-width', String(args.cellWidth));
        if (args.width !== undefined) cli.push('--width', String(args.width));
        if (args.height !== undefined) cli.push('--height', String(args.height));
        if (args.crop !== undefined) cli.push('--crop', args.crop.replace(/\s+/g, ''));

        const result = await runCli(runner, cli, root, extra.signal);
        if (result.code !== 0) {
          return toolError(`Could not render frames of ${page.rel}: ${result.error?.message || errorFromStderr(result.stderr, 'Sheet failed:') || `exit ${result.signal ?? result.code}`}`);
        }
        const png = await fs.promises.readFile(sheetPath).catch(() => undefined);
        if (!png) return toolError(`helios sheet finished but wrote no image for ${page.rel}`);

        let text: string;
        if (args.at) {
          text = `Contact sheet of ${page.rel} at ${args.at.join(', ')} s; each frame is labelled with its time.`;
        } else {
          const wrote = /\((\d+) frames: ([^)]*)\)/.exec(stripAnsi(result.stdout));
          text = wrote
            ? `Contact sheet of ${page.rel}: ${wrote[1]} frames at ${wrote[2]}; each frame is labelled with its time.`
            : `Contact sheet of ${page.rel}; each frame is labelled with its time.`;
        }
        return {
          content: [
            { type: 'text', text },
            { type: 'image', data: png.toString('base64'), mimeType: 'image/png' },
          ],
        };
      } finally {
        await fs.promises.rm(tmp, { recursive: true, force: true });
      }
    }),
  );

  server.registerTool(
    'verify_video',
    {
      title: 'Verify video',
      description:
        'Checks that every frame of a video page depends only on its time, by rendering sample frames in order and in reverse and comparing them. ' +
        'Run it on a new or changed page before render_video. ' +
        'A failure names the times whose frames depend on what came before: the page uses counters, timers or per-frame randomness instead of values computed from t.',
      inputSchema: {
        path: pagePath,
        duration: duration.optional(),
        samples: z.number().int().min(2).max(24).optional().describe('Frames to compare (default 6)'),
      },
      outputSchema: { ok: z.boolean(), message: z.string() },
      annotations: { title: 'Verify video', readOnlyHint: true, openWorldHint: false },
    },
    guard(async (args, extra) => {
      const page = await resolveInRoot(root, args.path, { kind: 'file' });
      const cli = ['verify', page.abs];
      if (args.duration !== undefined) cli.push('--duration', String(args.duration));
      if (args.samples !== undefined) cli.push('--samples', String(args.samples));

      const result = await runCli(runner, cli, root, extra.signal);
      if (result.code === 0) {
        const lines = stripAnsi(result.stdout).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
        const message = [...lines].reverse().find((line) => line.includes('sampled frames')) ?? lines[lines.length - 1] ?? 'Verified.';
        return { content: [{ type: 'text', text: message }], structuredContent: { ok: true, message } };
      }
      const message = result.error?.message || errorFromStderr(result.stderr, 'Verify failed:') || `exit ${result.signal ?? result.code}`;
      // A page that fails the check is an answer, not a tool failure.
      if (/^Frames at .* differ depending on what was rendered before them/.test(message)) {
        return { content: [{ type: 'text', text: message }], structuredContent: { ok: false, message } };
      }
      return toolError(`Could not verify ${page.rel}: ${message}`);
    }),
  );

  listSchemasWithoutDialect(server);
  return { server, jobs, root };
}

interface PageEntry { path: string; modifiedMs: number }
interface RenderEntry { path: string; bytes: number; modifiedMs: number }

/** *.html and *.mp4 under root, at most LIST_MAX_DEPTH folders deep, skipping dependencies and dot-dirs. */
/**
 * The SDK writes `"$schema": "http://json-schema.org/draft-07/schema#"` into every tool schema it
 * converts from zod 4, but MCP 2025-11-25 schemas are JSON Schema 2020-12, and Claude refuses to
 * call a tool whose outputSchema declares another dialect. Our schemas use only keywords that mean
 * the same in both, so dropping the declaration makes them valid 2020-12 schemas.
 */
function listSchemasWithoutDialect(server: McpServer): void {
  const handlers: Map<string, (request: any, extra: any) => Promise<any>> | undefined =
    (server.server as any)._requestHandlers;
  const listTools = handlers?.get('tools/list');
  if (!handlers || !listTools) throw new Error('helios mcp: the MCP SDK no longer exposes its tools/list handler');
  handlers.set('tools/list', async (request, extra) => {
    const result = await listTools(request, extra);
    for (const tool of result.tools ?? []) {
      delete tool.inputSchema?.$schema;
      delete tool.outputSchema?.$schema;
    }
    return result;
  });
}

export async function listVideos(root: string): Promise<{ pages: PageEntry[]; renders: RenderEntry[] }> {
  const pages: PageEntry[] = [];
  const renders: RenderEntry[] = [];

  async function walk(dir: string, depth: number): Promise<void> {
    let entries: fs.Dirent[];
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      // Dirent.isDirectory()/isFile() are false for symlinks, so links can't lead out of the root.
      if (entry.isDirectory()) {
        if (depth < LIST_MAX_DEPTH && !entry.name.startsWith('.') && !LIST_SKIP_DIRS.has(entry.name)) {
          await walk(full, depth + 1);
        }
        continue;
      }
      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (ext !== '.html' && ext !== '.mp4') continue;
      const stat = await fs.promises.stat(full).catch(() => undefined);
      if (!stat) continue;
      const rel = toRootRelative(root, full);
      if (ext === '.html') pages.push({ path: rel, modifiedMs: Math.round(stat.mtimeMs) });
      else renders.push({ path: rel, bytes: stat.size, modifiedMs: Math.round(stat.mtimeMs) });
    }
  }

  await walk(root, 0);
  const newestFirst = (a: { modifiedMs: number; path: string }, b: { modifiedMs: number; path: string }) =>
    b.modifiedMs - a.modifiedMs || a.path.localeCompare(b.path);
  return {
    pages: pages.sort(newestFirst).slice(0, LIST_MAX_ITEMS),
    renders: renders.sort(newestFirst).slice(0, LIST_MAX_ITEMS),
  };
}
