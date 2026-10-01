# Helios for Claude Desktop

A Claude Desktop extension (`.mcpb`) that runs `helios mcp`. Install it, and Claude can preview videos in the chat, check their frames and render MP4s on your computer.

## Build

Build after the CLI version in `packages/cli/package.json` is published to npm. The extension runs that exact version.

```bash
node integrations/claude-desktop/build.mjs
```

This writes `integrations/claude-desktop/dist/helios.mcpb`. Opening the file installs it in Claude Desktop.

## How it runs

- Claude starts `server/index.js` in its built-in Node runtime.
- That runtime can't run the CLI itself, because rendering starts child processes with the running Node. So the launcher finds Node.js 20+ on the system: PATH first, then Homebrew, the nodejs.org installer, nvm, fnm and Volta.
- The launcher runs `npx -y @helios-project/cli@<version> mcp --root <video folder>`.
- It pipes stdio explicitly. The built-in runtime gives child processes no real stdio, so `stdio: 'inherit'` hangs.
- Set `HELIOS_CLI` to a checkout's `packages/cli/bin/helios.js` to run local code instead. `HELIOS_NODE` picks a specific Node binary.

## Notes from testing (1 October 2026)

- **Startup time.** Code and Cowork sessions drop a server that hasn't answered `initialize` within about 2 seconds, which is why `helios mcp` loads only its own command. The first run after an install downloads the CLI through npx and can miss that window; Chat sessions retry, and later starts are fast.
- **Config file.** Claude Desktop rewrites `claude_desktop_config.json` from memory while it runs, so `mcpServers` edits made then can be lost. The extension avoids the config file entirely.
- **Logs.** Server output appears in `~/Library/Logs/Claude/main.log` under `[UtilityProcess stderr]`.
