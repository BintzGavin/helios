# Helios Studio product description

A written description of the user experience of Helios Studio: what the user sees, what they can do, and exactly what happens when they do it.

## Purpose

Helios Studio is, from the user's point of view, a large state chart. The user is a developer making programmatic videos, and moves through Studio with mouse presses and drags, the mouse wheel, keyboard shortcuts, typing into fields and dialogs, and files dropped from the desktop. Most of that behavior is defined implicitly, spread across a React context that holds most of Studio's state, a few dozen components, the `<helios-player>` element that hosts the composition, the composition's own Helios clock, and the Studio server that reads and writes the project on disk. There is no single place that says, in plain language, "when the user does X, this is what happens, and this is what happens if they do Y halfway through."

This project is that place. It describes the full experience a user has in Helios Studio as launched by `helios studio` from a project folder, in the default configuration, with nothing customized and an example composition open.

The documents are for people who need to understand or change Studio: designers, engineers, writers, testers, and anyone evaluating whether a behavior is intentional. They are written from the outside in. They describe the experience, not the implementation.

These documents describe Studio's current behavior at the cited commit, as read from the code and tests. They are not a roadmap and not a specification of planned work. The Helios repository's root `AGENTS.md` tells autonomous agents to treat documentation as "gravity" and to change code to match it; that rule does not apply here. Nothing in this directory asks for a code change. The open questions in each document and the entries in `bug-triage.md` are observations, and none of them is a work item until a person has decided it.

### What this is not

- Not API documentation. The library APIs live in `docs/site/api/` and in each package's `README.md`; the user guide is `docs/site/guides/using-studio.md`.
- Not organized by package. `@helios-project/studio`, `@helios-project/player`, `@helios-project/core`, and `@helios-project/cli` are not described separately. A single behavior is described once, wherever the user meets it.
- Not a technical design document. Where a technical detail is critical to understanding the experience, it appears in a block quote labeled `Technical note:` and nowhere else.

## Conventions

- Describe the experience, not the code. "The playhead does not move until the composition has answered" rather than "`seek()` posts `HELIOS_SEEK` and the state subscription updates `currentFrame`".
- Technical detail goes in block quotes, prefixed with `Technical note:`. Use it only when the mechanism changes what the user would expect.
- Use sentence case for headings.
- Name the vocabulary consistently. The [glossary](glossary.md) is the source of truth for terms like composition, connected, playback range, ongoing, remembered, saved, and hot reload.
- Every document ends with the Helios commit it was verified against and a list of open questions.
- When a behavior is surprising, say so and say why it is that way if the reason is known. Do not smooth it over.

## The work to be done

Each document describes one feature. Features are large things (the timeline, with scrubbing, snapping, and zoom) or small things (the timecode field above it), but each is described in full, including its edge cases and its interactions with other features.

### Document template

Every feature document follows the same skeleton so that documents are comparable and nothing is skipped.

1. **Summary.** One paragraph describing the feature abstractly. For example: "The stage view is how the composition is framed in the stage: how large it is drawn and where it sits."
2. **The simple case.** The common path in prose.
3. **The interaction, event by event.** The five phases of an *interaction*, named in every document as: **Starting**, **Ending at once**, **Becoming ongoing**, **While ongoing**, **Finishing**. What starts it and what is captured, what happens if it ends at once, what is decided the moment it becomes ongoing, what updates live, and what is committed at the end. Include a small state diagram (Mermaid `stateDiagram-v2`) of the states the user passes through. Studio mixes pointer drags, keyboard shortcuts, dialogs, inline fields, and long-running states, so the phases map onto each kind like this:

   | Kind of interaction | Starting | Ending at once | Becoming ongoing | While ongoing | Finishing |
   | --- | --- | --- | --- | --- | --- |
   | A mouse drag (pan, scrub, marker, divider) | A button goes down | Released without moving | The first move with the button held; Studio has no distance threshold | The thing follows the pointer | The button is released |
   | A keyboard shortcut | The key goes down | Always: one keydown, one effect | The key is held long enough to auto-repeat | Each repeat acts again | The key is released |
   | A dialog | The dialog opens | Closed without a change | The first edit | Editing | Submitted and answered |
   | An inline field (timecode, rename) | The field opens for editing | Escape, or leaving it unchanged | The first keystroke | Typing | Enter or leaving the field commits |
   | A long-running state (playing, a render, an export) | The start command | Refused, or over on its first step | The first frame advances, or the server accepts the job | Progress | It stops, completes, fails, or is cancelled |

4. **Modifiers.** A table with these rows, in this order, in every document: **Shift**; **Ctrl/Cmd**; **Alt/Option**; **Keyboard focus** (in a text field, on the player, or elsewhere); **Playback** (playing or paused); **Player connection** (connected or not). Columns: "Set at the start" and "Changed while ongoing".
5. **Cancel and interrupt.** A table with these rows, in this order, in every document. Columns: "Before it is ongoing" and "While ongoing".
   - **Escape**: the user's explicit abort.
   - **Another shortcut, click, or command**: the user doing something else mid-way (a keyboard shortcut, a click on another control, an Omnibar command, a dialog opening).
   - **Composition switched**: the active composition changes (the Compositions panel, the Omnibar, creating, duplicating, renaming, or deleting a composition).
   - **Window loses focus**: another window or app takes focus, or the tab is hidden.
   - **Pointer leaves the window**: the pointer leaves the element or the browser window, or the button is released outside it.
   - **Server request fails or server stops**: a request to the Studio server fails or times out, or the `helios studio` process is stopped.
   - **Reload or tab closed**: the Studio page is reloaded, closed, or navigated away.
   - **Hot reload**: the composition's code changes on disk and the player reloads it.
   - **Project changed on disk**: files in the project are added, renamed, or deleted by something other than this Studio page (an editor, the file system, another Studio tab, an agent through Studio's MCP server).
6. **Interactions with other systems.** One bold-led paragraph per concern, in this order: **Files on disk.** **Browser storage.** **Undo.** **Playback range and loop.** **Input props.** **Rendering and export.** **Notifications.** **Other tabs and agents.** **Keyboard and accessibility.**
7. **Edge cases.** Anything a user could notice that is not covered above.
8. **Open questions and verification.** The Helios commit the document was verified against, and any behavior that could not be confirmed.

Item 5 matters most. Asking the same interrupt questions of every feature is how gaps and inconsistencies are found.

### Method

For each document:

1. Read the component that draws the feature in `packages/studio/src/components/` and the state it uses in `packages/studio/src/context/StudioContext.tsx`.
2. Read the matching tests, which sit beside each component (`*.test.tsx`). Files like `Stage.test.tsx`, `GlobalShortcuts.test.tsx`, `Timeline.test.tsx`, `PlaybackControls.test.tsx`, `StudioContext.test.tsx`, and `PropsEditor.test.tsx` are close to executable specifications of the edge cases.
3. Follow anything written to disk into the Studio server (`packages/studio/src/server/`), and anything that passes through the preview into the player (`packages/player/src/index.ts`, `controllers.ts`) and the composition's clock (`packages/core/src/Helios.ts`).
4. Draft the document.
5. Try anything ambiguous in Studio running on a project (see [Verification](#verification)). Tests settle "what happens"; the running product settles how it feels, what is visible while the interaction is in progress, and what the timing is like.
6. Record the commit verified against.

### Verification

Drafting reads the code; verification watches the product. The `verification/` directory will hold one checklist per cluster of documents, each item a single observable claim with setup, steps, expected result, a priority, and the device it needs. A tester runs them in Studio launched with `helios studio` on the verification project, records `pass`, `fail`, or `blocked` in the Result column, and files every failure in `bug-triage.md` with the item's ID. A document moves from `drafted` to `verified` in the coverage table only when every P1 and P2 item for it has passed or been filed.

`bug-triage.md` is the other half: every behavior the documents flagged as a likely defect, deduplicated, with reproduction steps, the reason in the code, a severity, and the decision the product team needs to make. Entries confirmed in the running product carry a Status line.

### Order of work

1. **Pilot: [the stage view](stage/the-stage-view.md).** Small and self-contained, with a real drag in it. Used to settle the template, tone, and depth.
2. **Foundations: the [input model](foundations/input-model.md), the [project and compositions](foundations/project-and-compositions.md), the [workspace](foundations/the-workspace.md), and the [preview player](foundations/the-preview-player.md).** Everything else refers to them.
3. **Playback.** The transport controls, the timeline, the playback range, and the timeline tracks: the bulk of the experience and the hardest part, because their states hand off to each other. Written third so the template is already proven.
4. **Everything else.** Once the template and the exemplars exist, the remaining documents can be drafted in parallel, followed by a consistency pass and a verification pass across the whole set.

Progress is tracked in the [coverage table](#coverage) below.

### Scope decisions

These were decided without the user (who was not available), from the code and the repository's own documentation. Each says why.

- **Where this description lives.** It is the top-level `product-description/` directory inside the Helios repository, on the branch `claude/global-skill-repos-wcchad`, rather than a separate repository, because a new repository could not be created. Everything outside `product-description/` is the read-only source of truth and is never modified by this project.
- **The source commit.** Commits to this directory move the repository's `HEAD`, so the source is pinned once: `git log -1 --format=%h -- . ':!product-description'`, which is `c2bfddb`. Every document's footer cites it. A later session that finds a newer source commit decides explicitly whether to re-verify; it does not mix commits silently.
- **The surface.** Helios Studio as served by `helios studio` (`packages/cli/src/commands/studio.ts`): the built Studio UI on `http://127.0.0.1:5173/` (the next free port if 5173 is taken), with the folder the command was started in as the project root, no `helios.config.json` registry override, no remote MCP flags, in a desktop Chromium-based browser with a fresh profile (empty local storage), used with a mouse and keyboard. Studio is the surface because the root `AGENTS.md` names it the primary product surface and it is by far the richest interactive one; reconnaissance found about forty components and a server with a dozen routes.
- **The verification project.** The repository's `examples/` folder, started with `helios studio`, with `simple-canvas-animation` open. Where a document needs input props, it uses a composition created in Studio from the "Title explainer" template, which is the only Studio template whose compositions connect to the player (see [the preview player](foundations/the-preview-player.md#connecting)). A freshly scaffolded `helios init` project is not used because its templates contain no `composition.html`, so Studio would open on its empty state.
- **Clock-bound compositions.** Every example in `examples/` and every Studio template binds itself to the browser's document clock. The code says such a composition takes its frame from that clock rather than from Studio's transport. The [preview player](foundations/the-preview-player.md#clock-bound-compositions) owns this behavior and flags it for verification first. The playback documents describe what Studio does when the player can drive the composition, and link there for the difference.
- **Out of scope: other CLI subcommands.** `init`, `render`, `build`, `preview`, `add`, `remove`, `components`, `diff`, `deploy`, `job`, `merge`, `frames`, `list`, `skills`, `update`, and `mcp` are separate surfaces. They may get their own description later.
- **Out of scope: other ways to start Studio.** The standalone `helios-studio` binary (which resolves the project root differently) and Studio's development mode (`npm run dev` inside `packages/studio`, which shows a "Composition reloaded" toast that the built Studio does not) are mentioned only where they differ.
- **Out of scope: the libraries and the platform.** The core, renderer, and player library APIs, distributed rendering beyond downloading a job spec, the infrastructure and cloud adapters, Studio's `/mcp` endpoint and authenticated remote MCP listener, the `helios mcp` plugin server, and the AI-host plugin. What an agent connected through Studio's MCP server does to the files under the user is described in `cross-cutting/changes-from-outside-studio.md`.
- **The player inside Studio.** The `<helios-player>` element's own controls bar, settings menu, and export menu are hidden in Studio and are not described. Its behaviors that do reach the Studio user (the click layer over the composition, its status overlay, its keys when it has keyboard focus, fullscreen) are described in [the preview player](foundations/the-preview-player.md) and [the input model](foundations/input-model.md).
- **What a composition draws.** Out of scope. Documents say what Studio shows around the composition and what it asks of it, not what an example animates.
- **Touch and pen.** Studio listens only for mouse events. Touch and pen are not described beyond saying so where it matters.
- **Keyboard shortcuts are owned once.** The [input model](foundations/input-model.md) owns the full shortcut map and the rules for who receives a key. Feature documents say what their own keys do and link there for focus rules.
- **Remembered state is listed once.** The [workspace](foundations/the-workspace.md#what-studio-remembers) owns the list of everything Studio keeps in browser storage. Feature documents say what they remember and link there.
- **Files on disk are described once.** The [project and compositions](foundations/project-and-compositions.md) owns what Studio reads and writes in the project folder. Feature documents say what they write and link there.
- **Interaction shape.** The unit of interaction is an *interaction* and its phases are Starting, Ending at once, Becoming ongoing, While ongoing, and Finishing. The variant rows, the interrupt rows, and the order of the cross-cutting concerns are fixed as written in the document template above, because Studio mixes pointer drags, shortcuts, dialogs, inline fields, and long-running states and one vocabulary has to fit all of them.
- **Size.** The structure below has 27 documents, grouped by how the user meets each feature rather than by package, and keeps fewer, complete documents over many thin ones.
- **Numbered rules.** These are prose documents, not numbered specifications. Stable heading anchors are enough for cross-references.
- **Commits.** Each document or coherent group is committed as `docs: add {path}` or `docs: revise {path}`, staging only `product-description/`, with the session's `Co-Authored-By` and `Claude-Session` trailers. Nothing is pushed, no pull request is opened, and no issue is filed.

## Structure

```
README.md                        this file
goal.md                          the standing instructions for whoever drafts
AGENTS.md, CLAUDE.md             entry points for agents: read README.md, then goal.md
glossary.md                      shared vocabulary
bug-triage.md                    suspected defects collected from every document, with repro steps and decisions needed

verification/
  README.md                      how to run a hand-verification pass and record results
  {cluster}.md                   checklists, one per cluster of documents
  ...

foundations/
  input-model.md                 mouse presses and drags, the wheel, keyboard focus and who receives
                                 each key, the full shortcut map, drag and drop, the interrupt rows
  project-and-compositions.md    the project folder, what a composition is, IDs and names,
                                 composition.json, thumbnails, assets, renders, what is saved where
  the-workspace.md               the layout and its dividers, sidebar tabs, empty states, dialogs,
                                 toasts, and everything Studio remembers in the browser
  the-preview-player.md          loading a composition into the player, connecting, clock-bound
                                 compositions, hot reload, switching compositions

stage/
  the-stage-view.md              pan and zoom of the composition in the stage (the pilot)
  the-stage-toolbar.md           canvas size presets and fields, transparency grid, safe-area guides,
                                 the snapshot and settings buttons

playback/
  the-transport-controls.md      play, pause, frame step, rewind, loop, J/K/L shuttle, speed, volume
  the-timeline.md                the ruler and playhead, scrubbing, snapping, hover guide, zoom,
                                 and the timecode field
  the-playback-range.md          in and out points: I and O, dragging the markers, how the range
                                 shapes playback, renders, and exports, and how it is remembered
  timeline-tracks.md             captions, composition markers, time-prop markers, audio waveforms,
                                 and dropping an asset onto the timeline

compositions/
  the-compositions-panel.md      browsing, folders, search, selecting, opening in an editor, deleting
  the-omnibar.md                 the Ctrl/Cmd+K palette: commands, switching compositions, asset paths
  creating-and-duplicating.md    the New Composition and Duplicate dialogs and the templates
  composition-settings.md        renaming, size, frame rate, duration, and the thumbnail

props/
  the-props-editor.md            the Properties panel: rows, groups, Copy JSON, Reset, and auto-save
  prop-fields.md                 each kind of field, schema-driven or inferred, and its validation

assets/
  the-assets-panel.md            listing, folders, type filter, search, uploading, new folders
  asset-actions.md               previewing, renaming, deleting, moving, opening in an editor,
                                 and dragging assets out to props and the timeline

output/
  server-renders.md              the Renders panel's server-side render: settings, jobs, progress,
                                 cancel, delete, preview, and download
  client-side-export.md          exporting MP4 or WebM in the browser
  snapshots-and-job-specs.md     saving the current frame as PNG and downloading a distributed job spec

panels/
  the-captions-panel.md          viewing and editing caption cues, importing and exporting SRT
  the-audio-mixer.md             per-track volume, mute, solo, and level meters
  the-components-panel.md        browsing the component registry and installing, updating, removing

help/
  shortcuts-and-diagnostics.md   the Keyboard Shortcuts dialog and the System Diagnostics dialog
  the-assistant.md               the Helios Assistant dialog: prompt building and documentation search

cross-cutting/
  changes-from-outside-studio.md files changed on disk, a second Studio tab, and an agent working
                                 through Studio's MCP server while the user has Studio open
```

## Coverage

Status is one of `not started`, `drafted`, or `verified`.

| Document | Status |
| --- | --- |
| glossary.md | drafted |
| bug-triage.md | not started |
| verification/ (checklists) | not started |
| foundations/input-model.md | drafted |
| foundations/project-and-compositions.md | drafted |
| foundations/the-workspace.md | drafted |
| foundations/the-preview-player.md | drafted |
| stage/the-stage-view.md | drafted |
| stage/the-stage-toolbar.md | drafted |
| playback/the-transport-controls.md | drafted |
| playback/the-timeline.md | drafted |
| playback/the-playback-range.md | drafted |
| playback/timeline-tracks.md | drafted |
| compositions/the-compositions-panel.md | not started |
| compositions/the-omnibar.md | not started |
| compositions/creating-and-duplicating.md | not started |
| compositions/composition-settings.md | not started |
| props/the-props-editor.md | not started |
| props/prop-fields.md | not started |
| assets/the-assets-panel.md | drafted |
| assets/asset-actions.md | drafted |
| output/server-renders.md | drafted |
| output/client-side-export.md | drafted |
| output/snapshots-and-job-specs.md | drafted |
| panels/the-captions-panel.md | drafted |
| panels/the-audio-mixer.md | drafted |
| panels/the-components-panel.md | drafted |
| help/shortcuts-and-diagnostics.md | not started |
| help/the-assistant.md | not started |
| cross-cutting/changes-from-outside-studio.md | not started |

## Reference

The source of truth is the Helios repository at `/home/user/helios`, commit `c2bfddb`. The relevant locations are:

- `packages/cli/src/commands/studio.ts`: the `helios studio` command, which starts the surface this project describes.
- `packages/studio/src/App.tsx`: the workspace, assembled from the layout, the panels, and every dialog.
- `packages/studio/src/context/StudioContext.tsx`: most interaction state: the active composition, the playback range and loop, the timeline state record, render jobs, client-side export, snapshots, and every request to the server.
- `packages/studio/src/components/`: the UI (`Stage/`, `Timeline.tsx`, `Controls/`, `PropsEditor.tsx`, `SchemaInputs.tsx`, the sidebar panels, and the dialogs).
- `packages/studio/src/hooks/`: the keyboard shortcut hook and the hook that remembers state in browser storage.
- `packages/studio/src/server/`: the Studio server: `plugin.ts` (every route), `discovery.ts` (compositions and assets on disk), `render-manager.ts` (render jobs), `templates/` (what New Composition writes).
- `packages/player/src/index.ts`, `controllers.ts`, `bridge.ts`, `features/exporter.ts`: the `<helios-player>` element that hosts the composition, how it connects, its click layer and keys, and client-side export.
- `packages/core/src/Helios.ts`, `timecode.ts`, `schema.ts`: the composition's clock (play, pause, seek, loop, playback range, document timeline binding), timecodes, and input prop validation.
- `packages/studio/src/**/*.test.ts(x)`, `packages/player/src/*.test.ts`, `packages/core/src/*.test.ts`: behavioral tests.
- `docs/site/guides/using-studio.md`: the existing user guide, which differs from the code in several places (port, shortcuts, commands).
- `examples/`: the compositions used as the verification project.
