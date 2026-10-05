# Pre-registration: agent video benchmark, October 2026

**Status: Draft, 5 October 2026.** This document freezes in the commit that changes this line to
"Frozen", and it freezes before any run beyond the smoke test. After the freeze, every change goes
in the [deviation log](#deviation-log) with its date and reason. The only planned change is the
maintainer review, which may update framework pins.

**Harness:** [`tests/agent-eval/`](../../tests/agent-eval/). The final runs use the harness at the
commit named in the freeze, and that commit is recorded in every `scoreboard.json`.

**Conflict of interest:** the Helios project wrote this benchmark and maintains one of the
frameworks it compares. To limit that, the benchmark is designed and published as follows:

- The method is published before the results.
- The other frameworks run under their maintainers' own published setups. Their maintainers can
  correct those setups before the final runs.
- Every result is published, including the raw transcripts.
- Helios's own setup is frozen under the same rules as everyone else's.

## 1. Question

When someone asks an AI coding agent for a video, which framework helps the agent deliver a
correct, good-looking MP4 most reliably?

The benchmark compares no framework at all, Helios, HyperFrames and Remotion. The prompt never
names a framework, so the agent decides which one to reach for after reading the skills its
condition installs.

## 2. Conditions

Each condition gets the setup its own maintainers publish for Claude Code, pinned to one commit.
We do not hand-tune any condition. The pins live in
[`tests/agent-eval/conditions.json`](../../tests/agent-eval/conditions.json). The harness fetches
each pin as a shallow, sparse git checkout, checks that the commit and the plugin manifest's
version match the pin, and caches the checkout under `tests/agent-eval/results/.cache/`.

| Condition | Source, pinned | Maintainers' install | How the harness loads it |
|---|---|---|---|
| `baseline` | None | None | Stock Claude Code. No video skills, plugins or MCP servers. |
| `helios` | [`BintzGavin/helios-skills`](https://github.com/BintzGavin/helios-skills) at `c52a1faedd4ab1d91420dcc7b19b30caeab55265`, plugin `plugins/helios`, version 0.1.0 | `claude plugin marketplace add BintzGavin/helios-skills`, then `claude plugin install helios@helios` | `--plugin-dir <checkout>/plugins/helios` loads the `make-video` skill. `--mcp-config <checkout>/plugins/helios/.mcp.json` adds the plugin's MCP server, `npx -y @helios-project/cli@0.46.0 mcp`. |
| `hyperframes` | [`heygen-com/hyperframes`](https://github.com/heygen-com/hyperframes) at tag `v0.8.133`, commit `9c7ff590fe9e1f3fa7bf06cb3bf67ae78c2a993b`, plugin `hyperframes` 0.8.133 | `claude plugin marketplace add heygen-com/hyperframes`, then `claude plugin install hyperframes@hyperframes` | `--plugin-dir <checkout>`: the repository root, which the marketplace entry names as the plugin source. It holds 21 skills. The plugin's launcher pins the HyperFrames CLI to 0.8.133. |
| `remotion` | [`remotion-dev/skills`](https://github.com/remotion-dev/skills) at `473352613039e718e46655a26df224851e84c4aa` (Remotion 4.0.533) | `npx skills add remotion-dev/skills` | All 12 skills are copied into each run's `.claude/skills/`, where `npx skills add` installs project skills for Claude Code. Remotion publishes no Claude Code plugin. |

Notes on the setups:

- **Why `--plugin-dir` instead of the marketplace.** A marketplace install changes the user's
  global Claude Code state, which would leak between runs and conditions. `--plugin-dir` loads the
  same plugin directory for one session only. The setups were checked in each condition's
  session `init` event: `helios:make-video` and an MCP server named `helios` for Helios, 21
  `hyperframes:*` skills for HyperFrames, and 12 `remotion-*` skills for Remotion.
- **Why Helios gets `--mcp-config`.** The harness isolates sessions with `--strict-mcp-config`,
  which also drops MCP servers that come from a plugin. The Helios plugin ships an MCP server, so
  the harness passes that plugin's own `.mcp.json`, unchanged. If the HyperFrames or Remotion setup
  ships an MCP server after the maintainer review, it gets the same treatment.
- **Versions resolved at run time.** Some packages are resolved when the agent runs, not when the
  plugin is pinned. Helios's skill uses `@helios-project/cli@latest`, and Remotion projects
  install `remotion` from npm. The harness records npm's `latest` for `@helios-project/cli`,
  `@helios-project/renderer`, `hyperframes`, `remotion` and `@remotion/cli` at the start of every
  sweep. A release during the final runs goes in the deviation log.
- **The day-to-day `helios` setup is not used.** Without `--pinned`, the harness's `helios`
  condition wraps a local helios-skills checkout. The benchmark always passes `--pinned`.

All conditions share the same isolation, unchanged from the existing harness:

```
claude -p "<prompt>" --model <model> --output-format stream-json --verbose --max-budget-usd <cap> \
  --permission-mode bypassPermissions --setting-sources project --strict-mcp-config --no-session-persistence
```

Every run starts in a fresh, empty temp directory that holds only the prompt's assets (and, for
`remotion`, its skills). No user settings, skills, plugins, hooks, `CLAUDE.md` or MCP servers reach
the session.

## 3. Agents

| Agent | Model | Status |
|---|---|---|
| Claude Code (CLI 2.1.220 or the version at freeze) | Sonnet 5.5, `claude-sonnet-5-5` | Supported. |
| Claude Code | Opus 5.5, `claude-opus-5-5` | Supported. |
| Codex CLI (0.144.4 or the version at freeze) | `gpt-5.6-sol` | **Not yet supported by the harness.** It will be added before the final runs. If it isn't ready at the freeze, the Codex arm is dropped from this round, and the publication says so. |

The Codex driver must meet the same rules as Claude Code:

- Headless runs via `codex exec --json -m gpt-5.6-sol --dangerously-bypass-approvals-and-sandbox --skip-git-repo-check`.
- A fresh `CODEX_HOME` per run, so no user configuration reaches the session.
- Each framework installed the way its maintainers publish it for Codex. Helios and HyperFrames
  both ship a `.codex-plugin`. Remotion's skills go in `.agents/skills`.
- Cost computed from the token counts the CLI reports, at OpenAI's published API prices on the
  freeze date.

## 4. Prompts

The 8 prompts in [`tests/agent-eval/prompts.json`](../../tests/agent-eval/prompts.json) are used
unchanged, so that none are picked to suit one framework:

| Prompt | Asks for | Duration asked |
|---|---|---|
| `music-video` | A music video for a supplied `track.mp3`, pulsing with the beat, with the song as audio | 15 s |
| `animated-short` | A short film about a paper boat in a storm | about 20 s |
| `explainer` | An HTTPS explainer: title card, three diagram steps, closing card | 30 s |
| `social-vertical` | A 1080×1920 coffee shop clip with three text beats | 10 s |
| `chart` | An animated bar chart from a supplied `sales.csv` | around 12 s |
| `ui-demo` | A todo app demo with a cursor, at 1920×1080 | 15 s |
| `logo-reveal` | A "NOVA LABS" logo reveal | 5 s |
| `gif-loop` | A seamless loop of gradient blobs, as both MP4 and GIF | 8 s |

The synthetic `track.mp3` is generated deterministically by the harness. `sales.csv` is committed.

## 5. Design

- **Cells:** 8 prompts × 4 conditions × 3 repetitions = **96 runs per agent**. That makes 192 runs
  for the two Claude models, plus 96 for Codex.
- **Order:** the harness runs repetition 1 of every prompt and condition, then repetition 2, then
  repetition 3. Within a repetition, it runs prompt by prompt, cycling through the four conditions.
  If a sweep is stopped early, every condition therefore has the same number of whole repetitions.
- **Machine:** one machine for every final run, recorded in `scoreboard.json` (`meta.environment`).
  The planned machine is an Apple M3 Pro with 11 cores and 18 GB of memory, running macOS 26.3,
  Node 22.12.0 and FFmpeg 9.0.2. Runs are not pooled across machines.
- **Parallelism:** `--parallel 2` for every sweep. Neighbouring runs therefore come from different
  conditions, so any slowdown from sharing the machine falls on all conditions about equally.
- **Per-run limits:** the same for every condition: `--budget 6` (USD) and `--timeout-min 40`.
- **Command per Claude Code agent** (Sonnet shown; Opus differs only in `--model` and
  `--stop-at-usd`):

```bash
node tests/agent-eval/run.mjs --conditions baseline,helios,hyperframes,remotion --pinned \
  --determinism --reps 3 --model claude-sonnet-5-5 --budget 6 --timeout-min 40 \
  --stop-at-usd 130 --parallel 2 --out tests/agent-eval/results/bench-2026-10-sonnet-5-5
```

## 6. Metrics

All metrics are computed by the harness from the session transcript and the project directory.
The only metric that needs people is the "would you post this?" rating.

**Deliverable.** The deliverable is the MP4 that the agent's final message names. If the message
names none, it is the newest MP4 in the project. Files in the installed skills directory are
ignored.

1. **First-try success: the primary metric.** A run succeeds when all of these hold, with no human
   input during the session:
   - the deliverable is readable by ffprobe and has a video stream;
   - its duration is within ±5% of the duration the prompt asks for;
   - it has an audio stream if the prompt asks for audio (`music-video`).

   Runs are headless, so an agent that stops to ask a question has failed unless an MP4 that
   meets these conditions already exists. For prompts worded "about" or "around", the ±5% rule is
   stricter than the tolerance in `prompts.json`. It is the same for every condition.
2. **Spec checks (secondary).** The existing checks against `prompts.json`: that prompt's duration
   tolerance, audio, the requested frame size, and a GIF where one is asked for.
3. **Framework-used rate.** The share of runs in a condition that used that condition's framework.
   A run used a framework if either:
   - it installed it: any `package.json` in the project declares the framework, or the framework
     is in `node_modules`;
   - it rendered with it: a CLI render command, an MCP render tool, or code that imports the
     framework's renderer.

   Reading a skill does not count. The patterns are `FRAMEWORKS` in
   [`run.mjs`](../../tests/agent-eval/run.mjs), and they are the same shape for all three
   frameworks. The rate is also reported for the frameworks a run did not install, which shows,
   for example, how often `baseline` reaches for Remotion on its own.
4. **Determinism.** After the session, the harness re-runs the run's own render twice in its
   project directory and compares the two outputs at 5 frames, one at the centre of each fifth of
   the video.
   - **Pass:** every frame is identical by SHA-256 of its RGB pixels, or has a PSNR of at least
     50 dB.
   - **What is re-run:** the last successful foreground command that renders with a framework, runs
     an npm render script, encodes a frame sequence or pipe with ffmpeg, or runs a script that
     writes video.
   - **Frames already on disk:** if that command only encodes frames written earlier, the script
     run that wrote them is re-run first.
   - **MCP renders:** a render made through the Helios MCP tool is re-run as the same render through
     the CLI version that the plugin's MCP server uses.
   - **Directory:** each command runs in the directory the agent ran it in, following `cd` the way
     the Bash tool does.
   - **Limits:** 15 minutes per re-render.
   - **Denominator:** runs with a readable MP4. A run whose render can't be found or re-run counts
     as not deterministic, and its reason is reported.
   - **Also reported:** whether the first re-render matches the delivered MP4, for information.
5. **Time to first preview or still.** Minutes from session start until the result of the first
   successful call that let the agent see a frame. That covers:
   - a framework preview, still, snapshot, contact sheet or studio command;
   - an MCP preview or frames tool;
   - an ffmpeg single-frame grab or an inline `.screenshot(` call;
   - reading an image file.

   The metric is reported as a median, together with the share of runs that ever looked at a
   frame.
6. **Wall minutes, dollar cost and turns.** These come from the CLI's `duration_ms`,
   `total_cost_usd` and `num_turns`. With a subscription login, the dollar figure is what the
   same tokens would cost on the API.
7. **"Would you post this?"** Three raters each score every delivered MP4 from 1 to 5. Raters are
   blind to the condition, and none of them is the person who ran the benchmark.
   - **What raters get:** the packet from `run.mjs --blind`. It pools every model and condition,
     shuffles the clips, strips container metadata, and gives each clip a contact sheet and its
     MP4. Raters see the prompt text for each clip, but not its condition or model.
   - **Scale:**
     - 1: broken, or wrong for the prompt.
     - 2: clearly flawed; I would not post it.
     - 3: usable after edits.
     - 4: I would post it after a small tweak.
     - 5: I would post it as it is.
   - **Order:** rater *k* starts at clip `1 + (k − 1) × N/3` and wraps around, so that fatigue
     falls on different clips.
   - **Score per run:** the mean of the three raters. A run with no MP4 scores 1.
   - **Agreement:** reported as Krippendorff's α (ordinal).
   - **Recognised frameworks:** a rater who thinks they recognise a framework from the video notes
     it, and these notes are reported.

## 7. Analysis plan

- **Report everything.** Every run appears in the published tables, with its transcript, metrics,
  contact sheet and MP4.
- **Primary analysis:** first-try success per condition, separately for each agent. Each rate is
  reported as *k*/*n* with a Wilson 95% confidence interval.
- **Comparisons:** the difference in first-try success for every pair of conditions within each
  agent (6 pairs). Each comparison gets a 95% confidence interval from a cluster bootstrap over
  prompts: 10,000 resamples of the 8 prompts, with seed `20261016`.
  - **Claims:** we only say one condition did better than another when that interval excludes
    zero after a Holm correction across the 6 pairs.
  - **Power:** with 24 runs per cell, only large differences, roughly 30 percentage points or
    more, can clear this bar. We say so in the write-up.
- **Secondary metrics** are reported descriptively per condition and agent: the spec-check rate,
  framework-used rate, determinism rate, median time to first preview, median wall minutes, mean
  and total cost, median turns, and mean rating. No secondary metric replaces the primary one in
  any headline.
- **Per-prompt tables** for every metric, so readers can see where each framework is strong or
  weak.
- **Exclusions:** none after the fact, except harness crashes, which are re-run.
  - **What counts as a harness crash:**
    - the CLI did not start;
    - the CLI exited without a result event and without hitting the timeout;
    - the result was an API or authentication failure (`Failed to authenticate`, `API Error`,
      `overloaded`, `Internal server error`);
    - the machine failed, for example a full disk or a network outage, as logged at the time.
  - **Re-runs:** a crashed run is re-run at most twice. The re-run replaces it in the analysis,
    and both are listed.
  - **What is not a crash:** hitting the budget cap or the time limit, an agent error, a wrong or
    missing MP4, or an agent that stops to ask a question. These are failures and stay in.
- **Incomplete sweeps:** if a sweep reaches its spend stop, the analysis uses complete repetitions
  only. The partial repetition is still published.
- **Analysis code:** a script that reads only the `scoreboard.json` files will be committed before
  the final runs, and it produces every published number.

## 8. Maintainer review

The HyperFrames and Remotion maintainers get **7 days** to correct their own condition before the
final runs.

- **How:** a pull request to this repository that changes only their entry in
  `tests/agent-eval/conditions.json`. A PR can:
  - move the pin to a new commit, tag or published version;
  - switch between the install methods the harness supports (`plugin-dir`, `project-skills`);
  - add the plugin's own MCP config.

  Changes to their own published skills and plugin happen upstream, in their repository, and the
  PR then re-pins to the new commit.
- **What a PR may not change:** the prompts, metrics, caps, isolation flags or other conditions.
  A maintainer who needs a harness capability that is missing can propose it. We accept it if it
  applies the same way to every condition.
- **Helios is under the same rules.** Its pin can change only through a public PR in the same
  window, and that PR is linked from both invitation issues.
- **Pilot data:** each maintainer gets the pilot results for their own condition: transcripts,
  metrics and contact sheets. That way, a private pilot gives Helios no information the others
  lack.
- **Freeze:** after the window, the pins freeze. Late fixes wait for the next round.

### Draft invitation issue: not opened

> **DRAFT. Do not post until the go/no-go decision.** One copy for `heygen-com/hyperframes`, one
> for `remotion-dev/remotion`, with the bracketed parts filled in.
>
> **Title:** Invitation: review your setup in an open agent video benchmark (closes [date + 7 days])
>
> Hi [HyperFrames / Remotion] maintainers,
>
> We maintain Helios, an HTML-to-MP4 renderer. We're running an open, pre-registered benchmark of
> how reliably AI coding agents produce a correct MP4 when asked for a video. It compares stock
> agents with agents that have the Helios, HyperFrames or Remotion skills installed. Before the
> final runs, we'd like you to check that [HyperFrames / Remotion] is set up the way you'd
> recommend.
>
> - **Pre-registration** (question, metrics, analysis plan, all fixed before the final runs):
>   [link to this document at the frozen commit]
> - **Harness:** [link to `tests/agent-eval/`]. Your setup is one entry in
>   [link to `conditions.json`].
> - **Your current setup:** [`claude plugin install hyperframes@hyperframes` at `v0.8.133` /
>   `npx skills add remotion-dev/skills` at `4733526`]. It is loaded for one session at a time, as
>   described in section 2.
> - **Pilot results for your condition:** [link], with transcripts, metrics and contact sheets.
>
> If anything about your setup is wrong or out of date, please open a PR against your entry in
> `conditions.json` by **[date + 7 days]**. You can re-pin to a new release or change how your
> skills are installed. A PR can't change the prompts, metrics or other conditions. That applies
> to Helios too: our own pin only changes through a public PR in the same window. After that date
> the setups freeze, and we run 8 prompts × 3 repetitions × [agents].
>
> We'll publish every result, including raw transcripts, whatever the outcome, on or before
> [publication date]. We'll link this issue from the write-up. If you'd rather not take part,
> that's fine: we'll run your published setup as it stands and say so.
>
> Thanks, [name]

## 9. Budget, stop rules and schedule

**Money: about $500 of API-equivalent spend in total.**

| Item | Stop (`--stop-at-usd`) |
|---|---|
| Smoke run (4 runs, $5 cap each) | $20 |
| Private pilot: 1 repetition, Sonnet 5.5, 32 runs | $40 |
| Final: Claude Code + Sonnet 5.5, 96 runs | $130 |
| Final: Claude Code + Opus 5.5, 96 runs | $250 |
| Final: Codex + gpt-5.6-sol, 96 runs (API-equivalent) | $60 |
| **Total** | **$500** |

Re-runs of harness crashes count against their sweep's stop. Opus runs have usually cost $2–5
each, so the Opus stop may land before the third repetition ends. In that case, the incomplete
sweep rule in section 7 applies. We will not raise a stop after seeing results.

**Time: about 5 founder-days.**

1. Pre-registration, harness and smoke run.
2. Pilot and go/no-go.
3. Maintainer liaison, freeze and starting the final runs.
4. Rating coordination and analysis.
5. Write-up and publication.

**Schedule (2026):**

| Date | Step |
|---|---|
| Mon 5 Oct | Draft pre-registration, harness, smoke run |
| by Fri 9 Oct | Smoke run complete; Codex driver added, or the Codex arm dropped; analysis script committed; **freeze** |
| Mon 12 – Thu 15 Oct | Private pilot (1 repetition, Sonnet 5.5) |
| **Fri 16 Oct** | **Private go/no-go** (criteria below) |
| Mon 19 Oct | Invitation issues opened on both repositories |
| Mon 19 – Mon 26 Oct | Maintainer review window (7 days) |
| Tue 27 Oct | Pins frozen. Final runs start. |
| by Tue 3 Nov | Final runs complete |
| Wed 4 – Mon 9 Nov | Blind rating |
| **by Mon 16 Nov** | **Publication** (target: Fri 13 Nov) |

**The go/no-go is about operations, not results.** We have committed to publish whatever the
result. The go/no-go only asks whether the method works:

- every condition installs and loads without human input;
- harness crashes are under 5% of pilot runs;
- the pilot's cost projects within the stops above;
- the determinism check, time to first preview and blind packet produce values for at least 90% of
  the pilot runs that produced an MP4.

A "no-go" means fixing the harness and running the pilot again. It does not mean shelving the
benchmark. Any slip in the schedule goes in the deviation log.

## Deviation log

| Date | Change | Reason |
|---|---|---|
| — | — | — |

## Appendix: Smoke run, not part of the benchmark

The smoke run checks that every condition installs and runs end to end. Its results are not
benchmark data, and the analysis never uses them.

**Planned:** `chart` prompt × 4 conditions × 1 repetition, Sonnet 5.5, `--budget 5`, `--pinned
--determinism`.

**Run on 5 October 2026: blocked before any model call.** Every session ended at once with
`Failed to authenticate: OAuth session expired and could not be refreshed`. The same error happens
when `claude -p` is run directly, outside the harness. The machine's Claude Code CLI login has
expired. It needs `claude auth login`, or an `ANTHROPIC_API_KEY`, before the smoke run can go
ahead. Nothing was spent.

| Condition | Result |
|---|---|
| `baseline` | Not run: CLI authentication expired. |
| `helios` | Not run: CLI authentication expired. Setup verified: the pin was fetched and `helios:make-video` loaded. The `helios` MCP server registered once its `.mcp.json` was passed explicitly; `--strict-mcp-config` had dropped it. |
| `hyperframes` | Not run: CLI authentication expired. Setup verified: tag `v0.8.133` was fetched without prompts, and 21 `hyperframes:*` skills loaded. |
| `remotion` | Not run: CLI authentication expired. Setup verified: commit `4733526` was fetched without prompts, and 12 `remotion-*` skills loaded from the project's `.claude/skills`. |

**What was verified without spending anything:**

- The four-condition `--dry-run` prints the plan.
- All three pins install without anyone at the keyboard.
- Each condition's session `init` event lists the expected skills, plugins and MCP servers.
- A run through a stand-in `claude` executable exercised the rest of the pipeline: scoring, the
  determinism re-render, time to first preview, the blind packet and the ratings merge.

**What to watch in the real smoke run:**

- **The HyperFrames intent interview.** HyperFrames' entry skill runs an intent interview for every
  fresh request. In a headless session, an agent that stops to ask questions produces no MP4.
  Under this protocol that is a failure. If the smoke run shows it, the HyperFrames maintainers
  should hear about it in the invitation.
- **Codex** is not covered by the smoke run.

To re-run the smoke run once the CLI is logged in:

```bash
node tests/agent-eval/run.mjs --conditions baseline,helios,hyperframes,remotion --pinned \
  --determinism --prompts chart --model claude-sonnet-5-5 --budget 5 --parallel 2
```
