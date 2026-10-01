# RFC: Helios in AI hosts

**Status: Proposed · 1 October 2026**

**Decision proposed:** Make AI assistants a primary distribution channel for Helios. Ship one plugin to the Claude directory, the ChatGPT plugin directory and the Codex marketplace. It contains skills, one Helios MCP server and one MCP App view. Render on the person's machine whenever the host can run the server there. Where it can't, play the video inside the conversation, and leave cloud rendering to a later paid tier.

This RFC backs the AI HOST DISTRIBUTION delta in [`AGENTS.md`](../../AGENTS.md). Its deliverables are tracked under "AI Host Distribution" in [`docs/BACKLOG.md`](../BACKLOG.md).

## Why now

| Date | What shipped |
| --- | --- |
| 26 Jan 2026 | **MCP Apps.** Anthropic, OpenAI and the MCP-UI maintainers wrote it together. A tool points at a `ui://` HTML resource, and the host renders it in a sandboxed iframe in the conversation. |
| 6 Aug 2026 | **Agent Plugins 1.0.** A vendor-neutral package format: a root `plugin.json`, a `skills/` folder and an `mcp.json`. Vercel published it with AWS, Anysphere, GitHub, Microsoft and OpenAI. |
| 25 Sep 2026 | **Claude directory submission portal** (`claude.ai/directory/manage`). Plugins bundle an MCP connector, skills and an MCP App. After review, the portal shows installs by product surface and version, and which searches lead to a listing. |
| 29 Sep 2026 | **ChatGPT plugin extensions** (DevDay). An MCP App can live in the ChatGPT sidebar, in a panel beside a conversation, or as the viewer for a file type. OpenAI also launched a Plugin Creator and a redesigned directory. |

Why it matters for Helios:

- Videos made with Claude Opus 5.5 went viral in the week after its 22 September launch. Each one used a hand-rolled Puppeteer or Playwright pipeline plus ffmpeg. None used Helios, and renderer npm downloads stayed at roughly 55–130 a week.
- Those projects share one recipe: a page whose frame is a pure function of `t`, captured and encoded. That recipe is now the Helios contract: `window.renderAt(t)` (#4989), plus `helios still`, `sheet` and `verify` (#4992, #4994). What's missing is discovery and first-run reliability, not capability.
- On 1 October 2026 the only video MCP App we could find was a third-party Remotion app (`mcp-use/remotion-mcp-app`). It compiles React on its server and plays a preview, but it can't export. No video engine has claimed this surface yet.

## What a person experiences

Three journeys, one package.

1. **Coding agents: Claude Code, Codex.** Someone asks for a 20-second launch video for their repo.
   - The `make-video` skill loads.
   - The agent writes `video.html`, checks it with `helios verify` and a contact sheet, and renders `video.mp4` locally.
   - This already works from the unmerged plugin in `helios-skills`. What's left is packaging and listings.
2. **Desktop chat: Claude Desktop, ChatGPT desktop.** Same request, but through the local Helios MCP server.
   - The model writes the page, and an inline player appears in the chat.
   - The person scrubs to 3.2 s, clicks the headline and types "slower, and bigger". The view tells the model which time and element they picked.
   - "Render it" writes the MP4 on their machine.
   - In ChatGPT the same view also opens as a panel beside the thread, and the sidebar shows a library of their videos.
3. **Web and mobile chat: claude.ai, ChatGPT web, iOS, Android.** The host can't start a local process, so it connects to a hosted Helios MCP endpoint.
   - The model writes the page, and the inline player plays it in the conversation's own browser.
   - Export happens in that browser if Phase 3 qualifies it. Otherwise the view hands the page off to a local render, and later to hosted rendering.

## One package, many hosts

The plugin lives in `helios-skills` under `plugins/helios/`. Work on it started on the `feat/agent-video-entry-skill` branch. The code lives in this repository and ships in `@helios-project/cli`; the plugin only points at a pinned version. That split keeps the skills repo under Apache-2.0 and the engine under ELv2.

```text
plugins/helios/
├── plugin.json                  Agent Plugins 1.0 manifest (portable)
├── .claude-plugin/plugin.json   Claude Code and the Claude directory
├── .codex-plugin/plugin.json    Codex and ChatGPT: interface metadata, onboarding skill
├── mcp.json, .mcp.json          Local server: npx -y @helios-project/cli@<pinned> mcp
├── skills/make-video/           Entry skill and its references
└── assets/                      Logo, composer icon, screenshots
```

| Host | Reads | MCP server | Where the view appears |
| --- | --- | --- | --- |
| Claude Code, Codex CLI | `.claude-plugin/` or `.codex-plugin/`, `skills/`, `.mcp.json` | Local stdio | Nowhere (terminal). Skill and CLI are enough. |
| Claude Desktop | Claude directory listing | Local stdio | Inline, fullscreen |
| claude.ai web and mobile | Claude directory listing | Hosted HTTP | Inline, fullscreen |
| ChatGPT desktop | `.codex-plugin/`, ChatGPT directory | Local stdio | Inline, fullscreen, thread panel, sidebar, settings |
| ChatGPT web and mobile | ChatGPT directory | Hosted HTTP | Same as desktop, minus desktop-only features |
| VS Code, Cursor and others | `plugin.json` (Agent Plugins) | Local stdio | Inline, where the host supports MCP Apps |

A local stdio MCP App does work in ChatGPT desktop. OpenAI's bundled Code Review plugin ships exactly that: its `.mcp.json` starts a local process, and its tools declare `openai/ui` entrypoints of type `global`, `thread` and `settings`.

Keep the plugin to a few skills. `make-video` is the entry, and deeper material lives in its `references/`. The 30-skill tree in `helios-skills` stays a separate catalog for `npx skills add`. Plugins discover skills at `skills/<name>/SKILL.md`, and a hosted server that serves skills over MCP (`io.modelcontextprotocol/skills`) is limited to 5 skills in ChatGPT.

## Architecture: one server, two transports, three render placements

```text
             Agent host (Claude, ChatGPT, Codex, …)
        model ── tool calls ──┐        ┌── MCP App view (sandboxed iframe)
                              ▼        ▼
                     Helios MCP server  (helios mcp)
                 stdio on the person's machine  |  streamable HTTP when hosted
                              │
          ┌───────────────────┼─────────────────────┐
     Local render        In-view playback        Hosted render
     renderer + Chromium  and export (spike),     infrastructure adapters;
     + FFmpeg on the      in the host's browser   later, the paid tier
     person's machine
```

### Tools

Each tool is a thin wrapper over a CLI function that already exists on `main`. The MCP server, the CLI and the skill then describe one behavior, and a fix in one place reaches all three.

| Tool | Callable by | Wraps | Returns |
| --- | --- | --- | --- |
| `preview_video` | Model | (none) | Opens the view on a page. A short text summary for the model. |
| `render_video` | Model, view | `helios render` (size, fps, duration, `--audio`, `--preset`) | Output path, duration, size. The view calls it from its Render button. |
| `get_frames` | Model | `helios still`, `helios sheet` | PNG image content, so the model can look at its own frames. |
| `verify_video` | Model | `helios verify` | Pass, or the times whose frames depend on render order. |
| `read_page` | View only | File read inside the project root | Page source for the view. |

- **Locally,** pages are files, and tools reject paths outside the server's working directory.
- **When hosted,** pages are HTML strings in the tool arguments.
- **Long renders** return a job ID straight away and report progress, so a host's tool timeout can't kill them. Codex gives plugin tools 120 s by default.

**Relation to Studio's MCP server.** `packages/studio/src/server/mcp.ts` stays project-oriented: templates, composition IDs and the component registry. It renders through a module-level render manager that needs a running Vite server (`render-manager.ts`). The plugin server is page-oriented and renders through the CLI path, which serves local pages itself (#4996). Both call `@helios-project/renderer`, and neither re-implements rendering. A later change can teach Studio's server to accept plain pages; this RFC doesn't need that.

**Stdio hygiene.** In stdio mode, stdout carries only the protocol. The command sends `console.log` to stderr, because the renderer, Vite and the CLI all log to stdout today.

### The view

One resource, `ui://helios/player`, with MIME type `text/html;profile=mcp-app`, bundled to a single HTML file. It:

- plays the page with play/pause, a scrubber, frame stepping and a time readout;
- sends the selection to the model with `ui/update-model-context`: the time, plus the selector and text of a clicked element on DOM pages;
- renders by calling `render_video` locally, or offering a hand-off when hosted.

**Playback must match the render.** `<helios-player>` can't be the playback engine for agent-written pages:

- It drives frames only through `window.helios` or `connectToParent()`, and plain `renderAt(t)` pages define neither.
- It always loads the composition in a nested iframe, which the default MCP Apps CSP blocks (`frame-src 'none'`).

Instead, the view runs the page with the renderer's own seek shim, the init script `SeekTimeDriver` installs. That shim:

- virtualizes `performance.now`, `Date.now` and `requestAnimationFrame`;
- seeks WAAPI and GSAP timelines;
- calls `renderAt(t)`, `__render(t)` or `seek(t)`.

The renderer and the view then share one definition of "the frame at `t`", and the preview can't drift from the MP4. The work is to extract that init script into a module both can import. That's renderer work tied to determinism, which its posture allows.

**How the page enters the view.** Phase 2 tests both options in Claude and ChatGPT and picks one:

- **Nested `srcdoc` frame.** This keeps the page apart from the bridge script, but each host has to allow it.
- **The view becomes the page.** The view writes the page into its own document with the seek shim and a small bridge in front. There's no nested frame; the page and the bridge share a realm.

**Network.** The default MCP Apps CSP allows no network connections (`connect-src 'none'`) and only inline or same-origin scripts. Pages that load fonts or libraries from a CDN need those origins in `_meta.ui.csp.resourceDomains`. The server declares a short allowlist (cdnjs, jsdelivr, unpkg, Google Fonts), and the skill tells the model to stay within it.

### ChatGPT extensions

Everything here is extra `_meta["openai/ui"]` and manifest metadata on the same server and view:

- **`thread` entrypoint:** the player as a panel beside the conversation, with the selection loop above. This is the headline feature.
- **`global` entrypoint:** a sidebar library of the person's videos and renders. Opening one continues the edit.
- **Structured settings (`openai/settings`):** default size, fps, encoder preset and output folder.
- **Composer @-mentions (desktop):** @-mention a video in the project to put it in context.
- **`extensions["com.openai"].onboardingSkill`:** `make-video`.
- **Not now: file entrypoints.** Helios pages are `.html`, which Helios can't claim. Revisit if a `.helios` bundle format appears.

### Claude

Claude renders the same view inline and fullscreen. The Claude directory listing carries the same plugin. Its analytics become the channel's main metric: installs by surface and version, and the searches that lead to the listing.

## Render placements

| Placement | Where it runs | Cost to Helios | Phase |
| --- | --- | --- | --- |
| Local | The person's machine, via `helios mcp` over stdio | None | 1–2 |
| In view | The host's browser, inside the MCP App iframe | None | 3 (spike) |
| Hosted | Helios cloud, via `packages/infrastructure` adapters | Compute per render | 4 (paid tier, separate RFC) |

The in-view export spike must answer three questions:

1. **Is it frame-exact?** `ClientSideExporter` encodes with WebCodecs through mediabunny. It captures canvas pages directly, and DOM pages by serializing an SVG `foreignObject` that `fetch()`es stylesheets and images. That fetch is blocked under the default CSP. Measure stills against `helios still` for the same page.
2. **How does the file leave the sandbox?**
   - The exporter always delivers by clicking an `<a download>`, which a sandbox without `allow-downloads` blocks. It needs an API that returns the bytes.
   - The 26 January 2026 spec has no download method. The `@modelcontextprotocol/ext-apps` SDK (2.0.3) adds `ui/download-file`, which hands the host an embedded resource or a resource link, behind a `downloadFile` host capability. That is the first candidate where a host advertises it.
   - Where hosts don't advertise it: an app-only upload tool on the hosted server that returns a link, or host file APIs such as ChatGPT's desktop-only `openai/resources/write`.
3. **Is it fast enough?** Export runs frame by frame in real time or slower.

## Hosted endpoint

Web and mobile hosts need a public HTTPS endpoint at `/mcp` that speaks streamable HTTP.

- **Phase 3:** the endpoint is stateless. It serves the view and takes pages as tool arguments. No rendering, no accounts and no stored user data.
- **Phase 4:** OAuth 2.1 arrives with hosted rendering, because that's when Helios first holds user data.

A static view and a stateless server fit Cloudflare Workers. The Cloudflare notes in `docs/site/guides/cloudflare-rendering-footguns.md` apply only once rendering moves to the cloud.

Directory review needs a privacy policy, terms, a support contact, a logo and screenshots. Helios publishes none of these today.

## Phases and acceptance gates

### Phase 1: list the skill plugin (days)

- Merge `feat/agent-video-entry-skill` in `helios-skills`.
- Add `plugin.json` (Agent Plugins 1.0), `.codex-plugin/plugin.json` with interface metadata, and `.agents/plugins/marketplace.json` for Codex.
- Fix `helios skills install` and Studio's `skillsRoot`. Both currently ship no skills: `scripts/bundle-skills.js` copies `.agents/skills/helios`, which holds only `dummy.ts`.
- Prepare directory assets: logo, composer icon, three screenshots, and privacy-policy and terms URLs.
- Submit to the Claude directory and the ChatGPT directory.

**Gate.** On `tests/agent-eval`, the `helios` condition:
- uses Helios in at least 7 of 8 prompts;
- produces an MP4 that passes its duration and audio checks in at least as many prompts as `baseline`.

### Phase 2: local MCP server and view (one to two weeks)

- `helios mcp` (stdio) in `@helios-project/cli`, with the tools above.
- The seek shim extracted from `SeekTimeDriver` into a module the view imports.
- The `ui://helios/player` view: inline and fullscreen, with the selection loop.
- ChatGPT `thread`, `global` and `settings` entrypoints.
- The plugin's `mcp.json` pinned to the CLI release that ships `helios mcp`.

**Gate.** In Claude Desktop and in ChatGPT desktop, with no terminal, a person can:
- go from a brief to an inline preview;
- revise once by selecting part of the frame;
- end with an MP4 on disk.

Script it as a manual test in `tests/manual/`, and automate the protocol layer with the MCP Apps `basic-host` example.

### Phase 3: hosted view for web and mobile

- Streamable HTTP for the same server, deployable without state.
- The in-view export spike, with its result written up in `docs/rfcs/`.

**Gate.** claude.ai and ChatGPT web play a model-written page inside the conversation, and the export decision is written down.

### Phase 4: hosted rendering

A separate RFC. This RFC only requires that nothing above rules it out.

## Non-goals

- No monetization logic, accounts or billing in Phases 1–3.
- No new rendering engine, and no change to the renderer's posture beyond extracting the seek shim.
- No per-host fork of the server or the view.
- No file-type entrypoints yet.

## Risks

- **A directory amplifies first-run failures.** A listing sends cold traffic, and the first `npx` run downloads a Chromium shell (#4991).
  - Pin the CLI version in `mcp.json`.
  - Report browser installation as progress.
  - Never let a first render exceed a host's tool timeout.
- **Review requirements.** Helios has no published privacy policy, terms or support contact. Listing is blocked until it does.
- **Host churn.** Extensions are weeks old, and availability varies: Free and Go web users don't have them yet, and file and mention entrypoints are desktop-only. Host metadata stays additive, so one host's changes can't break the others.
- **Security.**
  - The view runs model-written code inside a sandbox the host controls.
  - The local server runs pages in headless Chromium, as `helios render` does today.
  - Tools stay inside the project root and expose no shell.
- **Licensing.** The engine packages are ELv2. ELv2 allows free use and redistribution, and forbids offering the software to third parties as a hosted or managed service. The plugin (Apache-2.0) only points at the published CLI, and the ELv2 terms already protect the Phase 4 hosted tier. Confirm both readings before listing.

## Open decisions for the maintainer

1. **Plugin home.** `helios-skills/plugins/helios` (recommended; already started), or this monorepo.
2. **Public identity for the listings.** Website, privacy policy, terms, support email, and the domain for the hosted endpoint.
3. **Listing name.** "Helios" or "Helios Video".
4. **Phase 1 gate thresholds.**

## References

- [OpenAI: plugin extensions](https://developers.openai.com/plugins/build/extensions), [extension spec](https://github.com/openai/mcp-extensions/blob/main/docs/spec.md), [packaging](https://developers.openai.com/plugins/build/plugins), [MCP server guide](https://developers.openai.com/plugins/build/mcp-server)
- [TechCrunch: ChatGPT plugin extensions, 29 Sep 2026](https://techcrunch.com/2026/09/29/openai-expands-chatgpts-plugins-with-app-like-interfaces-and-automations/)
- [Claude: build plugins for Claude](https://claude.com/blog/build-plugins-for-claude)
- [MCP Apps overview](https://modelcontextprotocol.io/extensions/apps/overview), [specification](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx)
- [Agent Plugins 1.0 specification](https://agent-plugins.org/specification)
- [mcp-use/remotion-mcp-app](https://github.com/mcp-use/remotion-mcp-app)
