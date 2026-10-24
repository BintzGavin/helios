# RFC: Three npm packages, one version

**Status: Slices 1–2 implemented on `claude/wonderful-newton-rspy2w` · 24 October 2026**

**Decision:** Publish three packages instead of six, all at one version, released by one script.

| Package | Contents | Runs in |
| --- | --- | --- |
| `@helios-project/cli` | The `helios` command, the renderer, Studio, the MCP server. Programmatic API at `@helios-project/cli/renderer`. | Node |
| `@helios-project/core` | The `Helios` class, signals, framework adapters, and the player at `@helios-project/core/player`. | Browser |
| `@helios-project/infrastructure` | Cloud execution adapters. Optional; only `helios job` and `helios deploy` load it. | Node |

`@helios-project/renderer`, `@helios-project/studio` and `@helios-project/player` get one last release that re-exports from the new home, then npm deprecation. The source stays in `packages/renderer`, `packages/studio` and `packages/player`: those directories become private workspaces, and the domain postures in [`AGENTS.md`](../../AGENTS.md) keep applying to them.

This RFC backs the PACKAGING delta in `AGENTS.md`. Its deliverables are tracked under "Packaging" in [`docs/BACKLOG.md`](../BACKLOG.md).

## Why

People and agents use one thing: `npx @helios-project/cli render video.html`. The `make-video` skill, the plugin and the guided skills all start there, and a `window.renderAt(t)` page imports no Helios package. The split costs that path:

- **Install weight.** `npx @helios-project/cli@0.46.0` installs 257 MB in 265 packages. About 69 MB is never used by a local render: the AWS, Google Cloud and Kubernetes clients (through `infrastructure`) and React, React DOM, Vue, Svelte and Solid (through `studio`, whose UI is prebuilt). The CLI also imports `infrastructure` at startup, because `job.ts` is loaded with every other command.
- **Release order and drift.** The CLI on `main` imports `readFrameText`, which published renderer 1.79.0 doesn't export. Because the CLI loads every command in one `Promise.all`, publishing the CLI first would break every command except `mcp`. And because the CLI depends on `^1.79.0`, every existing CLI install picks up each new renderer the moment it is published.
- **Hand-kept version matrix.** `tests/release-contract.test.mjs` exists to keep six unrelated version numbers in line, and a release touches six files.
- **Version numbers carry no meaning.** Studio is at 0.107 after 4 publishes and core at 5.13 after 5.
- **The root build was incomplete.** `npm run build` skipped `infrastructure`, which the CLI imports, so a fresh checkout couldn't build or publish the CLI.

Monthly npm downloads on 22 October 2026: renderer 1,188, core 1,134, cli 310, player 218, studio 126, infrastructure 56. Core's count matches renderer's because renderer depends on it; renderer doesn't actually use it.

## What stays separate, and why

- **Core stays browser-only.** A composition that imports the `Helios` class must not pull Playwright and a 66 MB ffmpeg binary into a web project. Player joins core because both are browser code that ships together in compositions and embeds.
- **Infrastructure stays separate.** Its users are distinct (cloud rendering), its dependencies are the heaviest, and the CLI only needs it for two commands.

## Versioning

- All three packages share one version. The first combined release is **6.0.0**: it is above every current version and merging is a breaking change.
- Internal dependencies are exact pins (`"@helios-project/core": "6.0.0"`), never ranges. A published package then always runs with the sibling it was tested with.
- `scripts/release.mjs` is the only writer of package versions, internal pins and the release matrix.
- The release that is already prepared (renderer 1.80.0 and CLI 0.47.0, which ship `analyze`, `check`, `verify --cues` and the cursor component) can go out first with the same script: `node scripts/release.mjs --set renderer@1.80.0,cli@0.47.0`.

## Slices

Each slice is a thin path that works end to end and is verified on its own before the next one starts. Publishing to npm is always a human step.

1. **Release tooling.** *Done on this branch.*
   - Root `build` includes `infrastructure`, in dependency order.
   - The CLI reads its version from its own `package.json`, so a release no longer edits `src/index.ts` and its test.
   - `scripts/release.mjs` sets versions, writes exact internal pins and the release matrix, refreshes the lock file, does a clean build, and checks each tarball contains every `bin`, `main` and `exports` target. It publishes only with `--publish`, in dependency order.
   - `tests/release-contract.test.mjs` checks that every internal dependency names the sibling's exact workspace version.
   - Proves: one command produces a release that builds from a fresh checkout and can't ship a package missing its entry point.
   - Verification: `node scripts/release.mjs --set renderer@1.80.0,cli@0.47.0` on a fresh clone, then the packed CLI renders, verifies, makes a sheet, checks and analyzes in an empty folder.
2. **Slim install.** *Done on this branch.*
   - `helios job` imports `@helios-project/infrastructure` when it runs, and prints the install command if it's missing. `infrastructure` becomes an optional peer dependency of the CLI.
   - Studio lists only what its server bundle imports at runtime (`@ffmpeg-installer/ffmpeg`, `@modelcontextprotocol/sdk`, `playwright`, `zod`). React, React DOM, Vue, Svelte, Solid, core, player and renderer move to `devDependencies`; the UI is prebuilt into `dist/`.
   - Proves: a local render needs none of the cloud or UI framework packages.
   - Verification: installed size of the packed CLI before and after, and the same smoke test as slice 1, plus `helios studio` serving its UI and `helios job` naming the missing package.
3. **Renderer inside the CLI.** *Tracer bullet; not started.*
   - The CLI build bundles `@helios-project/renderer` into its own `dist` and exports it at `@helios-project/cli/renderer`, with types. The CLI no longer depends on the renderer package. Studio's server bundle already inlines the renderer the same way.
   - Proves: the renderer works from inside another package: browser download, ffmpeg path, Playwright resolution.
   - Verification: the packed CLI has no `@helios-project/renderer` dependency and passes the slice 1 smoke test; a TypeScript file importing `Renderer` from `@helios-project/cli/renderer` type-checks and renders.
4. **Studio inside the CLI.**
   - The CLI build copies Studio's prebuilt UI and server bundle into `dist/studio`, and `helios studio` resolves them relative to itself instead of through `require.resolve('@helios-project/studio/cli')`.
   - Verification: from a clean install, `helios studio` serves the UI and answers one API route.
5. **Player inside core.**
   - `@helios-project/core/player` exports the `<helios-player>` element and controllers; the bundled `player.global.js` build moves with it.
   - Verification: one example builds importing from `@helios-project/core/player`, and a core-only bundle stays the same size.
6. **Retire the old names.**
   - Make `packages/renderer`, `packages/studio` and `packages/player` private workspaces.
   - Final releases: `@helios-project/renderer@6.0.0` re-exports `@helios-project/cli/renderer`; `@helios-project/player@6.0.0` re-exports `@helios-project/core/player`. Studio gets no shim: only the CLI used it.
   - Update the skills, plugin, docs site, examples and README to the new import paths.
   - Verification: `grep -r "@helios-project/\(renderer\|studio\|player\)"` outside `packages/` finds only shims and changelogs.
7. **Release 6.0.0.** A human runs `node scripts/release.mjs --version 6.0.0 --publish`, then deprecates the three old packages with a pointer to the new import path. Never unpublish.

## Risks

- **Old installs pick up new siblings.** Until 6.0.0, released CLIs depend on renderer and studio through `^` ranges, so any renderer release reaches them. Each release before 6.0.0 must rehearse CLI 0.46.0 against the new renderer, as the 1.80.0 rehearsal did.
- **Programmatic renderer users.** About 1,100 monthly renderer downloads may include direct API users. The shim keeps `import { Renderer } from '@helios-project/renderer'` working through 6.x, and the deprecation message names the new path.
- **Agent domains.** Domain agents keep working in `packages/renderer`, `packages/studio` and `packages/player`. They must not add `@helios-project/*` dependencies with ranges or edit versions; `release.mjs` and the release contract test enforce that.
