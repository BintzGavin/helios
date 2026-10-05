# Agent video scoreboard

When someone asks an AI agent for a video, does the agent reach for Helios, and does it hand back a
correct MP4? This harness measures both questions. Use it as the acceptance check for agent-facing
work in the skills, CLI and renderer.

It runs fresh, headless Claude Code sessions. Each session gets its own throwaway temp directory
and one of the prompts in [`prompts.json`](prompts.json): a music video for an mp3, an animated
short, an explainer, a 9:16 social clip, a chart animation, a UI demo, a logo reveal and a GIF
loop. Each prompt runs under any of four conditions (`baseline` and `helios` by default):

| Condition     | What the session has                                                                   |
|---------------|----------------------------------------------------------------------------------------|
| `baseline`    | Stock Claude Code. No video framework.                                                 |
| `helios`      | The same, plus the Helios skills loaded as a plugin (`--plugin-dir`).                  |
| `hyperframes` | The same, plus HeyGen's HyperFrames plugin (`--plugin-dir`), pinned.                   |
| `remotion`    | The same, plus Remotion's agent skills copied into the project's `.claude/skills`, pinned. |

The framework conditions use each project's own published setup, pinned to a commit in
[`conditions.json`](conditions.json):

| Condition                | Pinned source                                     | Maintainers' install                                              |
|--------------------------|---------------------------------------------------|-------------------------------------------------------------------|
| `helios` with `--pinned` | `BintzGavin/helios-skills`, `plugins/helios`      | `claude plugin marketplace add BintzGavin/helios-skills`, then `claude plugin install helios@helios` |
| `hyperframes`            | `heygen-com/hyperframes` at tag `v0.8.133`        | `claude plugin marketplace add heygen-com/hyperframes`, then `claude plugin install hyperframes@hyperframes` |
| `remotion`               | `remotion-dev/skills` (Remotion 4.0.533)          | `npx skills add remotion-dev/skills`                              |

The harness fetches each pin once, as a shallow sparse checkout, into `results/.cache/`. A plugin
loads through `--plugin-dir`, which is what the marketplace install amounts to for one session. A
plugin that ships its own MCP server (Helios does) also gets that server's `.mcp.json` through
`--mcp-config`, because `--strict-mcp-config` would otherwise drop it. Remotion publishes skills
rather than a plugin, so each run's directory gets a copy under `.claude/skills`, which is where
`npx skills add` puts them for Claude Code.

Without `--pinned`, `helios` is the day-to-day setup: a wrapper over your local helios-skills
checkout that exposes every `SKILL.md` under `skills/`. The benchmark always passes `--pinned`.

Every run records:
- whether it used Helios, and whether it used its own condition's framework;
- which toolchain it used instead, if any (Puppeteer, Playwright, Remotion, ffmpeg and so on);
- whether it produced an MP4;
- the MP4's duration, audio stream and size according to ffprobe, checked against the request;
- first-try success: a readable MP4 within ±5% of the asked duration, with audio if asked;
- with `--determinism`: whether its render, re-run twice, gives the same 5 sampled frames;
- minutes until it first looked at a frame (a preview, still, contact sheet, frame grab or image);
- wall-clock minutes, dollar cost and turns;
- where it failed.

The results go to `results/<timestamp>/`, which is gitignored:

- `scoreboard.md` and `scoreboard.json`: the summary table.
- `<run>/`, one directory per run, holding:
  - `transcript.jsonl` (the stream-json log) and `transcript-times.json` (when each line arrived)
  - `metrics.json`
  - `deliverable.mp4`
  - `sheet.png`, a five-frame contact sheet for eyeballing quality
  - `rerender.log`, with `--determinism`

## Running it

```bash
# Free: prints the exact claude commands and the worst-case spend.
node tests/agent-eval/run.mjs --dry-run

# Smoke run: one prompt, both conditions.
node tests/agent-eval/run.mjs --prompts music-video --budget 5

# Full board.
node tests/agent-eval/run.mjs --parallel 2

# All four conditions, the way the benchmark runs them.
node tests/agent-eval/run.mjs --conditions baseline,helios,hyperframes,remotion --pinned \
  --determinism --reps 3 --model claude-sonnet-5-5 --budget 6 --stop-at-usd 150 --parallel 2
```

The pre-registered cross-framework benchmark, with its exact commands, is in
[docs/benchmarks/2026-10-agent-video-benchmark.md](../../docs/benchmarks/2026-10-agent-video-benchmark.md).

Requirements:
- Node 18+ (HyperFrames itself needs Node 22+).
- git, to fetch the pinned framework setups.
- ffmpeg and ffprobe on your `PATH`.
- A logged-in `claude` CLI: either `claude auth login` (subscription) or `ANTHROPIC_API_KEY` (API
  billing). With a subscription, the dollar figures are what the same tokens would cost on the API.
- For the `helios` condition, a checkout of
  [helios-skills](https://github.com/BintzGavin/helios-skills) at `~/Developer/helios-skills`.
  Otherwise, pass `--skills-dir` or `--plugin-dir`.

`--rescore <results dir>` rebuilds the tables without re-running anything.

`--stop-at-usd <n>` starts no new run once the runs so far have cost `n`. Runs go repetition by
repetition, so a stopped board still has whole repetitions.

The harness's own unit checks cost nothing: `node --test tests/agent-eval/run.test.mjs`.

## Blind rating

`--blind <results dir>[,<results dir>...]` builds a rating packet in `--out`. Every delivered MP4,
its contact sheet and its prompt go under a shuffled `clips/clip-NNN/`, with container metadata
stripped. The
packet also holds an empty `ratings.csv` (`rater,clip,score`) and `key.json`. Give raters `clips/`
and `ratings.csv` only. Once they have filled in the scores, `--rescore <results dir> --ratings
<packet dir>` adds a mean rating per condition, in which a run with no MP4 counts as 1.

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

- **Used own framework** applies one rule to every framework. The run counts if it installed the
  framework (any `package.json` in the project declares it, or it is in `node_modules`) or
  rendered with it (a CLI render, an MCP render tool, or code importing its renderer). Reading a
  skill does not count.
- **First-try success** is stricter than **Passed checks** on duration (±5% for every prompt), and
  it ignores size and GIF.
- **Deterministic** re-runs the run's own last render command in its directory, twice, after the
  session ends. If that command encodes frames already on disk, the script that wrote them runs
  first. A Helios MCP render is re-run as the equivalent CLI render. The 5 sampled frames of the
  two re-renders must match by hash or reach 50 dB PSNR. These commands run unattended, as the
  session did.
- **Used Helios** means the run installed a `@helios-project/*` package or rendered with Helios. A
  run that only read a Helios skill does not count.
- **Passed checks** means the MP4 matched the request: its duration was within the prompt's
  tolerance, it had an audio track if one was asked for, it was the requested size, and a GIF
  existed where one was asked for.
- **Costs** come from the CLI's own `total_cost_usd`. Every run is capped by `--budget`; the default
  is $8. At Opus 5.5 prices, a run usually costs $2–5.
