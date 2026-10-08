# Agent video scoreboard

When someone asks an AI agent for a video, does the agent reach for Helios, and does it hand back a
correct MP4? This harness measures both questions. Use it as the acceptance check for agent-facing
work in the plugin, skills, CLI and renderer.

It runs fresh, headless Claude Code sessions. Each session gets its own throwaway temp directory
and one of the prompts in [`prompts.json`](prompts.json): a music video for an mp3, an animated
short, an explainer, a 9:16 social clip, a chart animation, a UI demo, a logo reveal and a GIF
loop. Each prompt runs under two conditions:

| Condition  | What the session has                                                                  |
|------------|---------------------------------------------------------------------------------------|
| `baseline` | Stock Claude Code. No Helios.                                                         |
| `helios`   | The same, plus the Helios plugin from [`plugins/helios`](../../plugins/helios) (`--plugin-dir`). |

Every run records:
- whether it used Helios;
- which toolchain it used instead, if any (Puppeteer, Playwright, Remotion, ffmpeg and so on);
- whether it produced an MP4;
- the MP4's duration, audio stream and size according to ffprobe, checked against the request;
- wall-clock minutes, dollar cost and turns;
- where it failed.

The results go to `results/<timestamp>/`, which is gitignored:

- `scoreboard.md` and `scoreboard.json`: the summary table.
- `track.truth.json`: the music track's ground truth for the run.
- `<run>/`, one directory per run, holding:
  - `transcript.jsonl` (the stream-json log)
  - `metrics.json`
  - `deliverable.mp4`
  - `sheet.png`, a five-frame contact sheet for eyeballing quality

## Running it

```bash
# Free: prints the exact claude commands, the worst-case spend, and whether the plugin and
# the music track are ready. Writes nothing.
node tests/agent-eval/run.mjs --dry-run

# Smoke run: one prompt, both conditions.
node tests/agent-eval/run.mjs --prompts music-video --budget 5

# Full board.
node tests/agent-eval/run.mjs --parallel 2
```

Requirements:
- Node 18+.
- ffmpeg and ffprobe on your `PATH`.
- A logged-in `claude` CLI: either `claude auth login` (subscription) or `ANTHROPIC_API_KEY` (API
  billing). With a subscription, the dollar figures are what the same tokens would cost on the API.

The `helios` condition loads `plugins/helios` from this checkout, so it measures the plugin exactly as
it is in your working tree; the scoreboard records its commit and whether it had uncommitted
changes. Two ways to try something else:
- `--plugin-dir <path>`: any other plugin directory.
- `--skills-dir <path>`: wraps every `SKILL.md` under `<path>` in a throwaway skills-only plugin, for
  example `--skills-dir skills` to try the whole skill catalog. It carries no MCP server.

`--rescore <results dir>` rebuilds the tables without re-running anything.

## Isolation

Each session runs with the following flags:

```
--setting-sources project --strict-mcp-config --no-session-persistence --permission-mode bypassPermissions
```

Together, these settings mean:
- **No user state.** Nothing from your own setup reaches the session: no user settings, skills,
  plugins, hooks, `CLAUDE.md` or MCP servers.
- **Every tool.** The session keeps the full default tool set, including the Skill tool. Without the
  Skill tool, a plugin's skills could never trigger.
- **Clean environment.** Environment variables that mark a nested Claude Code session are stripped.

`--bare` is deliberately not used. It cuts the tools down to Bash, Edit and Read, and it only
accepts API-key auth.

`metrics.json` lists the plugins and MCP servers each session actually loaded (`pluginsLoaded`,
`mcpServersLoaded`), so you can confirm the plugin's own MCP server came up.

`bypassPermissions` lets the agent run commands (`npm install`, browsers, ffmpeg) without anyone
approving them. That is how these runs happen unattended, and it is also why each run gets a fresh
temp directory. Its process group is killed when the run ends or hits `--timeout-min`.

## The music track

The music-video prompt gets `track.mp3`, which [`track.mjs`](track.mjs) synthesizes the first time
it's needed (deterministic: same code, same song). Real songs drift, so this one does too: 15 s whose
tempo ramps from 116 to 124 BPM. It has:
- silence until the first beat at 0.25 s;
- a kick on every beat, louder on each bar's downbeat;
- a snare on beats 2 and 4, and a soft hi-hat on every off-beat eighth;
- a bass note and a chord (Am, F, C, G) that change on every downbeat;
- one impact, a boom and a crash on the downbeat of bar 5 (10.35 s), after which the hats get louder.

Its average is 120 BPM, so an agent that measures one tempo and lays a fixed grid gets it right at
the start and the end but up to 125 ms off in the middle. That is the failure a video built on
`k * 60 / bpm` makes on a real song.

Generating the track also writes `assets/track.truth.json`: every beat, downbeat, kick, snare, hat
and the impact, in the shape of `helios analyze` output. It is for scoring only; the agent gets
`track.mp3` alone, and each results directory keeps a copy. A `track.mp3` left over from an older harness (with no matching truth) is
regenerated.

## Reading the numbers

- **Used Helios** means the run installed a `@helios-project/*` package or rendered with Helios. A
  run that only read a Helios skill does not count.
- **Passed checks** means the MP4 matched the request: its duration was within the prompt's
  tolerance, it had an audio track if one was asked for, it was the requested size, and a GIF
  existed where one was asked for.
- **Costs** come from the CLI's own `total_cost_usd`. Every run is capped by `--budget`; the default
  is $8. At Opus 5.5 prices, a run usually costs $2–5.
