# Helios privacy policy

**Last updated: 5 October 2026**

This policy covers two ways to use Helios:

- **Helios on your computer**: the Helios agent plugin, the Helios MCP server (`helios mcp`), the Claude Desktop extension and the Helios CLI.
- **Helios Cloud**: the hosted Helios service that ChatGPT, Claude and other assistants connect to when they can't run Helios on your computer.

## Helios on your computer

Helios collects nothing. It runs on your computer. It has no accounts and no analytics, and it sends no telemetry. It doesn't send your pages, videos or prompts to the Helios project or to anyone else.

- **Your video folder.** Helios saves video pages, stills and rendered videos in the folder you choose, for example `~/Movies/Helios`. They stay there until you delete them.
- **Your AI assistant.** When Claude, ChatGPT, Codex or another assistant uses Helios, the assistant receives what Helios returns: file paths, frames, render progress, and the moments or elements you select in the player. That assistant's own privacy policy covers what it does with them.
- **Network access.** Helios connects to the internet only to:
  - download the Helios CLI from npm;
  - download a matching build of Chromium the first time you render;
  - load the fonts, scripts or images that a video page itself references;
  - fetch the component registry when you run `helios add`.

  None of these requests include your content.

## Helios Cloud

Helios Cloud plays your video in the conversation and renders it to MP4 on Helios's servers, which run on Cloudflare. Previewing a video doesn't require an account. Rendering in the cloud requires signing in, so that each person gets their own free renders.

### What Helios Cloud stores

- **Video pages your assistant sends.** The HTML of each page, deleted 90 days after it was last saved.
- **Rendered videos.** The MP4, its poster image, and its title, size and timestamps. Deleted 90 days after rendering, or sooner if you delete them.
- **Your account, if you sign in.**
  - An account ID.
  - The email address your sign-in provider gives us.
  - Which assistants you connected.

  Kept until you delete your account.
- **Assistant identifiers.**
  - ChatGPT sends an anonymized user ID (`openai/subject`). Helios Cloud stores only a one-way hash of it.
  - The hash is used to count free renders and to show you your own pages and renders.
  - Helios can't reverse the hash, and ChatGPT doesn't send your name.
- **Usage records.** For each account: how many renders, render-seconds and tool calls it used. They're used to apply limits, prevent abuse and, if you buy a plan, bill it. Kept for 13 months.
- **Aggregate counts.** Totals of previews, exports and renders across all users, with no record of who did what.
- **Request logs.** Times, request paths and errors, kept for a few days for debugging and abuse prevention.

### Share links

Helios Cloud creates a share link only when you ask for one. Share links are long and random. They aren't listed anywhere, search engines are asked not to index them, and they expire. Anyone you give a link to can watch and download the video and pass the link on, so don't share anything you need to keep private.

### Payments

If you buy a paid plan, you pay on heliosrender.com through our payment processor. Helios receives your email address, your plan and whether your payment succeeded. It never receives your card number.

### Who processes your data

- **Cloudflare** hosts, stores and renders for Helios Cloud.
- **The sign-in provider** you use to sign in.
- **Our payment processor**, if you buy a plan.

They act as Helios's service providers. Helios Cloud doesn't sell or share your data, doesn't use it for advertising and doesn't use it to train AI models.

### Deleting your data

You can delete your renders and pages from the Helios player. To delete your account and everything stored with it, open an issue (below) asking for deletion. Don't post anything private there; we'll confirm it's you through your account. We delete within 30 days.

### Age

Helios Cloud isn't directed at children. You must be at least 13 years old to use it.

## Changes

Changes to this policy will be published here, with a new date. If a change affects how Helios Cloud uses data it already holds, we'll say so in the Helios player before it takes effect.

## Contact

Open an issue at https://github.com/BintzGavin/helios/issues.
