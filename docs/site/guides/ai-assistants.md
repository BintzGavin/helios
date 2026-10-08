---
title: "Use Helios from Claude, ChatGPT and Codex"
description: "Install the Helios plugin and MCP server so an AI assistant can make, preview and render videos for you"
---

# Use Helios from Claude, ChatGPT and Codex

Ask an assistant for a video, and it writes one HTML page that draws each frame from its time `t`. Helios previews that page in the conversation and renders it frame-exact to MP4 on your machine.

There are two pieces, and you can use either one or both:

| Piece | What it gives the assistant | Where it works |
| --- | --- | --- |
| **Plugin** (`make-video` skill) | How to write a Helios page, check its frames and render it with the CLI | Claude Code, Codex, and any agent that can run shell commands |
| **MCP server** (`helios mcp`) | Tools to preview, inspect, verify and render pages, plus a player inside the conversation | Claude Desktop, ChatGPT desktop, Claude Code, Codex, and other MCP hosts |

## Install the plugin

**Claude Code**

```text
/plugin marketplace add BintzGavin/helios
/plugin install helios@helios
```

**Codex**

```bash
codex plugin marketplace add BintzGavin/helios
codex plugin add helios@helios
```

Then ask for a video, for example "Make a 15-second launch video for this project".

**Other agents.** Install the skill with the [skills CLI](https://skills.sh). `npx skills add BintzGavin/helios` lists `make-video` and the rest of the Helios skill catalog, so you can pick the ones you want.

The plugin lives in [`plugins/helios`](https://github.com/BintzGavin/helios/tree/main/plugins/helios) and the catalog in [`skills/`](https://github.com/BintzGavin/helios/tree/main/skills) of the Helios repository.

## Connect the MCP server

`helios mcp` runs on your machine over stdio. It renders with the same CLI and headless Chromium as `helios render`. Videos and pages stay in the folder you give it with `--root`, which defaults to the folder it starts in.

**Claude Desktop.** Install the Helios extension: download `helios.mcpb` from the [latest release](https://github.com/BintzGavin/helios/releases/latest) and open it. Claude asks where to keep your videos; the default is `~/Movies/Helios`. The extension needs [Node.js](https://nodejs.org) 20 or newer.

**Claude Code**

```bash
claude mcp add helios -- npx -y @helios-project/cli@latest mcp
```

**Codex and ChatGPT desktop**

```bash
codex mcp add helios -- npx -y @helios-project/cli@latest mcp
```

The first render downloads a matching Chromium build. Later renders start immediately.

## What the assistant can do

| Tool | What it does |
| --- | --- |
| `preview_video` | Shows the page playing in the conversation. In chat apps that can't write files, it saves the page the assistant wrote first. |
| `get_frames` | Returns a contact sheet of chosen times, so the assistant can look at its own frames |
| `verify_video` | Checks that every frame depends only on `t`, and with `cues` (an `.srt`, `.vtt` or `.json` file) that each lyric or caption is on screen at its time (`helios verify`) |
| `render_video` | Renders the MP4 (`helios render`), then checks it for flashing and colour tags (`helios check`). Long renders return a job ID. |
| `get_render_status`, `cancel_render` | Follow or stop a render |
| `analyze_audio` | Finds a song's beats, bars, sections and hits and writes them to a JSON file the page loads (`helios analyze`) |
| `helios_library` | Opens a list of the project's pages and renders |

The server also offers two prompts, which hosts such as Claude Desktop list as starting points:

- `make_video` makes a video from a brief, with an optional length and size.
- `music_video` makes a video timed to a song in the project: it starts with `analyze_audio`, cuts on the beats and hits, and checks timed lyrics with `verify_video`.

## The player in the conversation

In hosts that support MCP Apps (Claude, ChatGPT, VS Code and others), `preview_video` opens a player beside the reply:

- **Scrub and step.** Drag the scrubber, or use ← and → to move one frame. Space plays and pauses.
- **Point at what to change.** Click an element, or press **Use this moment**. The player tells the assistant the time, the element and its position, so "make this slower" or "move this up" needs no further description.
- **Render.** **Render MP4** writes the video next to the page and shows progress.

The preview uses the renderer's own seek code, so the frame you select is the frame that ends up in the MP4.

In ChatGPT, Helios also appears in the sidebar and as a panel next to a conversation. Both open the library.

## Limits

- Pages can load scripts, styles and fonts from cdnjs, jsDelivr, unpkg and Google Fonts. Other origins are blocked inside the conversation, though `helios render` still loads them.
- The preview embeds local files the page references (images, audio, JSON, CSV, fonts) up to 8 MB in total. Larger pages still render normally; only the in-conversation preview is affected.
- Claude and ChatGPT on the web and on phones can't start local programs, so they can't use `helios mcp`. Use a desktop app or a coding agent.
