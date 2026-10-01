# Helios privacy policy

**Draft for review · Last updated: 1 October 2026**

This policy covers the Helios agent plugin, the Helios MCP server (`helios mcp`), the Claude Desktop extension, and the Helios CLI.

## What Helios collects

Nothing. Helios runs on your computer. It has no accounts and no analytics, and it sends no telemetry. It doesn't send your pages, videos or prompts to the Helios project or to anyone else.

## Where your work goes

- **Your video folder.** Helios saves video pages, stills and rendered videos in the folder you choose, for example `~/Movies/Helios`. They stay there until you delete them.
- **Your AI assistant.** When Claude, ChatGPT, Codex or another assistant uses Helios, the assistant receives what Helios returns: file paths, frames, render progress, and the moments or elements you select in the player. That assistant's own privacy policy covers what it does with them.

## Network access

Helios connects to the internet only to:

- download the Helios CLI from npm, when your assistant or extension starts it with `npx`;
- download a matching build of Chromium the first time you render;
- load the fonts, scripts or images that a video page itself references, for example from a CDN;
- fetch the component registry, when you run `helios add` or browse components.

None of these requests include your content.

## Changes

Changes to this policy will be published here, with a new date.

## Contact

Open an issue at https://github.com/BintzGavin/helios/issues.
