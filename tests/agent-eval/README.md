# Agent video scoreboard

When someone asks an AI agent for a video, does the agent reach for Helios, and does it hand back a
correct MP4? This harness measures both questions. Use it as the acceptance check for agent-facing
work in the skills, CLI and renderer.

It runs fresh, headless Claude Code sessions. Each session gets its own throwaway temp directory
and one of the prompts in [`prompts.json`](prompts.json): a music video for an mp3, an animated
short, an explainer, a 9:16 social clip, a chart animation, a UI demo, a logo reveal and a GIF
loop. Each prompt runs under two conditions:

| Condition  | What the session has                                                                  |
|------------|---------------------------------------------------------------------------------------|
| `baseline` | Stock Claude Code. No Helios.                                                         |
| `helios`   | The same, plus the Helios skills loaded as a plugin (`--plugin-dir`).                 |

Every run records:
- whether it used Helios;
- which toolchain it used instead, if any (Puppeteer, Playwright, Remotion, ffmpeg and so on);
- whether it produced an MP4;
- the MP4's duration, audio stream and size according to ffprobe, checked against the request;
- wall-clock minutes, dollar cost and turns;
- where it failed.

The results go to `results/<timestamp>/`, which is gitignored:

- `scoreboard.md` and `scoreboard.json`: the summary table.
- `<run>/`, one directory per run, holding:
  - `transcript.jsonl` (the stream-json log)
  - `metrics.json`
  - `deliverable.mp4`
  - `sheet.png`, a five-frame contact sheet for eyeballing quality

## Running it

```bash
# Free: prints the exact claude commands and the worst-case spend.
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
- For the `helios` condition, a checkout of
  [helios-skills](https://github.com/BintzGavin/helios-skills) at `~/Developer/helios-skills`.
  Otherwise, pass `--skills-dir` or `--plugin-dir`.

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

`bypassPermissions` lets the agent run commands (`npm install`, browsers, ffmpeg) without anyone
approving them. That is how these runs happen unattended, and it is also why each run gets a fresh
temp directory. Its process group is killed when the run ends or hits `--timeout-min`.

## Reading the numbers

- **Used Helios** means the run installed a `@helios-project/*` package or rendered with Helios. A
  run that only read a Helios skill does not count.
- **Passed checks** means the MP4 matched the request: its duration was within the prompt's
  tolerance, it had an audio track if one was asked for, it was the requested size, and a GIF
  existed where one was asked for.
- **Costs** come from the CLI's own `total_cost_usd`. Every run is capped by `--budget`; the default
  is $8. At Opus 5.5 prices, a run usually costs $2–5.
