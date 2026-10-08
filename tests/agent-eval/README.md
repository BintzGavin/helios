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
- **flash**: whether the MP4 passes the WCAG 2.3.1 flash check (`helios check`);
- **sync**, for the music video: whether the picture changes on the song's real beats;
- **verdict**: pass or fail, computed in code from everything above;
- wall-clock minutes, dollar cost and turns;
- where it failed.

The results go to `results/<timestamp>/`, which is gitignored:

- `scoreboard.md` and `scoreboard.json`: the summary tables.
- `track.truth.json`: the music track's ground truth the run was scored against.
- `<run>/`, one directory per run, holding:
  - `transcript.jsonl` (the stream-json log)
  - `metrics.json` (everything in the tables, and more)
  - `deliverable.mp4`
  - `sheet.png`, a five-frame contact sheet for eyeballing quality
  - `check.json`, the raw `helios check --json` report
  - `sync.json` (music video only): per-frame motion, the picked peaks and their distance to the
    nearest beat, for plotting

## Running it

```bash
# Free: prints the exact claude commands, the worst-case spend, and whether the plugin,
# the music track and the flash check are ready. Writes nothing.
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
- This repo's CLI, built, for the flash check: `npm run build -w packages/infrastructure && npm run build`
  at the repo root. The harness runs `node packages/cli/bin/helios.js check --json` on every MP4.
  Without a build the check can't run, and every run with an MP4 fails its verdict (the scoreboard
  says why). Build it and `--rescore` to fill the gap without re-running anything.

The `helios` condition loads `plugins/helios` from this checkout, so it measures the plugin exactly as
it is in your working tree; the scoreboard records its commit and whether it had uncommitted
changes. Two ways to try something else:
- `--plugin-dir <path>`: any other plugin directory.
- `--skills-dir <path>`: wraps every `SKILL.md` under `<path>` in a throwaway skills-only plugin, for
  example `--skills-dir skills` to try the whole skill catalog. It carries no MCP server.

`--helios-cli <path>` points the flash check at another CLI entry.

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
and the impact, in the shape of `helios analyze` output. Only the scorer reads it; the agent gets
`track.mp3` alone, and each results directory keeps a copy. A `track.mp3` left over from an older harness (with no matching truth) is
regenerated.

## Reading the numbers

- **Used Helios** means the run installed a `@helios-project/*` package or rendered with Helios. A
  run that only read a Helios skill does not count.
- **Passed checks** means the MP4 matched the request: its duration was within the prompt's
  tolerance, it had an audio track if one was asked for, it was the requested size, and a GIF
  existed where one was asked for.
- **Flash** is `helios check --json` from this repo's CLI: it fails when any one-second window holds
  more than three general or red flashes (WCAG 2.3.1). The cell shows the worst flashes per second.
- **Sync** (music video only) is described below.
- **Verdict** is computed in code, never taken from the agent's own account. A run passes only when
  all of these hold:
  1. the session finished: it wasn't killed at the time limit, didn't hit the budget cap and didn't end in an error;
  2. it produced an MP4;
  3. it used Helios, in the `helios` condition;
  4. the MP4 passed its checks (duration, size, audio, GIF);
  5. the flash check ran and passed;
  6. for the music video, sync was measured and passed.

  Missing data is a failure, never a pass. A metric that could not run shows as `n/a` with its
  reason in the last column, and fails the verdict. `–` means a metric doesn't apply (no MP4, or a
  prompt without music).
- **Verdict pass** in the first table is each condition's pass rate; **Verdict by prompt** breaks it
  down per prompt.
- **Costs** come from the CLI's own `total_cost_usd`. Every run is capped by `--budget`; the default
  is $8. At Opus 5.5 prices, a run usually costs $2–5.

### Sync

Sync asks one question: does the picture change on the song's real beats?

1. **Picture motion.** ffmpeg decodes the MP4 at 160 × 90 grey. Each frame's motion is the mean
   absolute difference from the previous frame, in grey levels (0–255). Frame times come from the
   decoder, so variable-frame-rate files are timed correctly. Only the first 15 s (the song) count.
2. **Change peaks.** A frame is a peak when its motion is the largest within ±2 frames (at 30 fps)
   and clears three floors:
   - **0.5 grey levels** averaged over the picture. Below that it's encoder noise.
   - **The video's median motion + 3 robust deviations** (1.4826 × MAD). A peak has to stand out from
     the video's own steady motion: a slow drift in the background is not a beat.
   - **30% of the video's strong changes** (the 90th percentile of the candidate peaks). This keeps faint
     flicker between the big hits from counting as beats.
3. **Score**: the share of peaks within **±40 ms** of a true beat. When a frame lasts longer than
   40 ms (below 25 fps) the window is ±1 frame. A beat at 0.517 s therefore accepts a change on the
   0.500 s or the 0.533 s frame. A picture with no peaks scores 0.
4. **Coverage**: the share of true beats that have a peak.
5. **r**: the Pearson correlation between per-frame motion (minus the 0.5-level noise floor) and a
   kick train: 1 on the frame nearest each kick, 0 elsewhere. It takes the best lag within the
   tolerance.

Sync **passes** when score ≥ 0.4, coverage ≥ 0.2 and r ≥ 0.1. Why these numbers:
- At about two beats a second, a ±40 ms window covers 15–20% of the timeline, so picture changes at
  random times score about 0.15. A score of 0.4 is well clear of chance.
- Pulsing in double time (every eighth note) puts half the peaks on the off-beats and scores about
  0.5. That still follows the music, so it passes.
- Coverage ≥ 0.2 lets a video that only moves on downbeats (8 of 30 beats) pass. It stops a
  video with a couple of lucky changes from passing.
- r ≥ 0.1 is a sanity floor: motion must lean towards the kicks, not away from them.

Calibration on synthetic 30 fps videos (a box that flashes and decays, unless noted):

| Video | Score | Coverage | r | Sync |
|---|---|---|---|---|
| flashes on every true beat | 1.00 | 1.00 | 0.49 | pass |
| brightness follows the audio envelope (kick, snare, faint hats) | 1.00 | 1.00 | 0.47 | pass |
| a 15% scale pulse on each beat over a moving background | 1.00 | 1.00 | 0.48 | pass |
| hard cuts on each beat | 1.00 | 0.57 | 0.51 | pass |
| double time (beats and off-beats) | 0.51 | 1.00 | 0.31 | pass |
| downbeats only | 1.00 | 0.27 | 0.29 | pass |
| a fixed 120 BPM grid from the first beat | 0.30 | 0.30 | 0.19 | fail |
| a fixed 120 BPM grid from t = 0 | 0.00 | 0.00 | −0.12 | fail |
| flashes at random times (8 seeds) | 0.05–0.32 | 0.03–0.23 | −0.03–0.10 | fail |
| flashes on the off-beat eighths | 0.00 | 0.00 | −0.08 | fail |
| a still image | 0 (no peaks) | 0 | 0 | fail |
| fresh random noise every frame | 0 | 0 | 0.09 | fail |

At 24 and 60 fps every video gets the same pass or fail.

**Known limit:** sync measures when the picture *changes*. A smooth sine "breathing" pulse that peaks
on the beat changes fastest between beats and has no sharp peaks, so it fails. A pulse that jumps on
the beat and decays, which is what "pulse with the beat" usually means, passes.

## Rescoring

`--rescore <results dir>` re-measures and rebuilds the tables without re-running any session:

- **Flash and sync** are measured again from each run's `deliverable.mp4`. If the copy is gone, the
  earlier measurement is kept. If there never was one, the cell shows `n/a`. If a measurement can't run
  now (for example, no CLI build), the earlier result is kept.
- **The verdict** is always recomputed.
- **Results from before this scoring existed** have no recorded truth. They were made with the old fixed
  120 BPM track (a kick every 0.5 s from t = 0), so rescoring scores their sync against that grid and
  labels it `legacy-120bpm (assumed)` on the board.

## Self-test

```bash
node --test tests/agent-eval/selftest.mjs
```

The self-test needs no network and no `claude`, and spends nothing: just Node and ffmpeg. It takes
about 10 seconds and covers:
- **The track:** it's deterministic, its truth has the expected shape, and the encoded mp3 lines up
  with the synthesized audio to within 1 ms. An encoder delay would shift every beat.
- **Sync:** it renders tiny videos with a box that flashes on the true beats, on the off-beats, at
  random, on a fixed 120 BPM grid, or never. On-beat must pass and the others must fail, in that order.
- **The verdict rules:** fixture results, including every kind of missing data.
- **The flash plumbing:** a stand-in `helios check` that follows the CLI's JSON contract, plus
  missing, unbuilt and old CLIs.
- **`--dry-run`:** the plugin loads only for `helios` runs, and nothing is written.
- **`--rescore`:** fixture result directories in the new format and in the format from before these
  metrics existed.
- **A full run** with a stand-in `claude` that writes a transcript and an MP4: the live scoring path
  end to end.

Set `HELIOS_EVAL_SELFTEST_KEEP=1` to keep its videos and fixture scoreboards for a look.
