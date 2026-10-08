import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { GetPromptResult } from '@modelcontextprotocol/sdk/types.js';

/**
 * The prompts `helios mcp` offers: a host lists them as starting points (Claude shows them in
 * the + menu), and each returns one user message that walks the model through this server's
 * tools. They say the same as the make-video skill, in tool calls instead of CLI commands.
 *
 * Prompt arguments always arrive as strings, and hosts send "" for a field left blank, so an
 * empty optional argument counts as not given.
 */

export interface MakeVideoPromptArgs {
  brief: string;
  duration?: string;
  size?: string;
}

export interface MusicVideoPromptArgs {
  audio: string;
  brief: string;
}

export const MAKE_VIDEO_PROMPT = {
  name: 'make_video',
  title: 'Make a video',
  description:
    'Make a video from a brief: motion graphics, an explainer, an animated chart, a logo reveal or a social clip, ' +
    'drawn in code and rendered to MP4 on this computer.',
} as const;

export const MUSIC_VIDEO_PROMPT = {
  name: 'music_video',
  title: 'Make a music video',
  description:
    'Make a video timed to a song in the project: find its beats, bars and hits, cut on them, check timed lyrics, ' +
    'then render the MP4 with the song.',
} as const;

const WHAT_HELIOS_IS =
  'Helios renders a web page frame by frame into an MP4 on this computer. It draws only what the page\'s code draws ' +
  'and calls no generative model';

function given(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function makeVideoPromptText(args: MakeVideoPromptArgs): string {
  const duration = given(args.duration);
  const size = given(args.size);
  return [
    'Make a video with Helios.',
    '',
    `Brief: ${args.brief.trim()}`,
    ...(duration ? [`Length in seconds: ${duration}`] : []),
    ...(size ? [`Size or aspect: ${size}`] : []),
    '',
    `${WHAT_HELIOS_IS}, so build the picture from type, shapes, SVG, canvas or WebGL and any images the person provides. ` +
      'If the brief needs live-action or AI-generated footage, say so: Helios can\'t make it.',
    '',
    '1. Write one HTML page in the project that defines window.renderAt(t), which draws the frame at t seconds.',
    '   - Every frame is a pure function of t: compute positions, opacity and the current scene from t. No counters, timers, x += speed or frame-by-frame physics.',
    '   - Seed any randomness from a number (rand(i)); never call Math.random() inside renderAt.',
    '   - Load fonts and images into a ready promise and await it in renderAt.',
    '   - Size the page to the video: 1920×1080 unless the brief asks otherwise (1080×1920 for 9:16, 1080×1080 for 1:1), with html,body{margin:0;overflow:hidden}.',
    '   - Load fonts and libraries only from cdnjs.cloudflare.com, cdn.jsdelivr.net, unpkg.com or Google Fonts: the player in the conversation blocks other sites.',
    '   If you can\'t write files, pass the page to preview_video as html and it is saved for you.',
    '2. Run verify_video on the page. If it fails, find what isn\'t computed from t and fix it.',
    '3. Look at your own work with get_frames: the key moments (at) or the whole video (every). Check that text is legible and inside the frame, transitions happen, no frame is blank and the pacing fits the brief. Fix the page and look again.',
    '4. Show it to the person with preview_video. They can scrub it and select a moment or an element to change; revise from their notes.',
    '5. When they\'re happy, render_video with preset medium. If it returns a jobId, follow it with get_render_status. Tell them where the MP4 is, and fix the page if the render\'s checks report a problem.',
    '',
    'Pass the same duration, width and height to every tool.',
  ].join('\n');
}

export function musicVideoPromptText(args: MusicVideoPromptArgs): string {
  const audio = args.audio.trim();
  return [
    `Make a music video with Helios for ${audio}.`,
    '',
    `Brief: ${args.brief.trim()}`,
    '',
    `${WHAT_HELIOS_IS}: the picture is type, shapes, canvas or WebGL and any images the person provides, timed to the song.`,
    '',
    `1. Run analyze_audio on ${audio}. It writes a beats file next to the song (every beat, downbeat, section and hit, in seconds of song time) and summarises it. Plan scenes on its sections and bars.`,
    '2. Write one HTML page in the project that defines window.renderAt(t), with t in seconds of song time.',
    '   - Load the beats file with fetch(), its path relative to the page written out as a string (the player in the conversation serves only literal paths), and await it in renderAt.',
    '   - Every frame is a pure function of t: look up the current beat, bar and section from t. No counters, timers or unseeded randomness.',
    '   - The tempo can drift, so use the beats and downbeats arrays, not one BPM.',
    '   - Cut on downbeats and kicks, and land key moves on the hits.',
    '   - For lyrics or captions, take the times from the person\'s timed-text file (.srt, .vtt or JSON words; Helios doesn\'t transcribe) and show each word from its own start to its end. Don\'t snap words to the beat.',
    '   - Flash only where the idea calls for it, and never more than three times in any one second (WCAG 2.3.1).',
    '3. Run verify_video on the page. With lyrics or captions, pass their timed-text file as cues: each cue must be on screen during its time. Canvas pages report the text they draw with window.heliosDrawnText?.add(text).',
    '4. Look at your work with get_frames at the hits and section changes, and fix anything that lands late or reads badly.',
    `5. Show it with preview_video, then render_video with audio ${audio} and the song's duration. Follow a long render with get_render_status. If the render's checks report flashing, fix the page and render again.`,
  ].join('\n');
}

function userMessage(text: string): GetPromptResult {
  return { messages: [{ role: 'user', content: { type: 'text', text } }] };
}

export function registerHeliosPrompts(server: McpServer): void {
  server.registerPrompt(
    MAKE_VIDEO_PROMPT.name,
    {
      title: MAKE_VIDEO_PROMPT.title,
      description: MAKE_VIDEO_PROMPT.description,
      argsSchema: {
        brief: z.string().describe('What the video shows and says, and who it is for'),
        duration: z.string().optional().describe('Length in seconds, e.g. 15'),
        size: z.string().optional().describe('Frame size or aspect, e.g. 1920x1080, 1080x1920 or 9:16 (default 1920x1080)'),
      },
    },
    (args) => userMessage(makeVideoPromptText(args)),
  );

  server.registerPrompt(
    MUSIC_VIDEO_PROMPT.name,
    {
      title: MUSIC_VIDEO_PROMPT.title,
      description: MUSIC_VIDEO_PROMPT.description,
      argsSchema: {
        audio: z.string().describe('The song: an audio file in the project, relative to the project root'),
        brief: z.string().describe('What the video shows, and its look and mood'),
      },
    },
    (args) => userMessage(musicVideoPromptText(args)),
  );
}
