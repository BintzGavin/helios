# Goal: complete the Helios Studio product description

You are working in the `product-description/` directory of the Helios repository at `/home/user/helios`. Read `README.md`, `glossary.md`, `foundations/input-model.md`, and `stage/the-stage-view.md` first. The README defines the purpose, the document template, the method, the structure, and the coverage table. The other three are the exemplars: match their depth, tone, and structure exactly. Your job is to write every document in the README's structure until the coverage table has no `not started` rows, then run a consistency pass.

These documents describe Studio as it behaves at the cited commit. They are not a specification of work to do. Do not change Helios to match them, and do not treat an open question or a suspected bug as a task; a person decides those.

## Source of truth

The Helios repository is checked out at `/home/user/helios`; everything outside `product-description/` is read-only. Describe the experience in Helios Studio as served by `helios studio` (`packages/cli/src/commands/studio.ts`) from a project folder, in the default configuration with nothing customized, in a desktop Chromium-based browser with a fresh profile, used with a mouse and keyboard. The verification project is the repository's `examples/` folder with `simple-canvas-animation` open, plus a composition created from the "Title explainer" template where input props are needed. Other CLI subcommands, the standalone `helios-studio` binary, Studio's development mode, the library APIs, distributed rendering beyond the job spec download, infrastructure, Studio's MCP endpoints, and the AI-host plugin are out of scope (README, "Scope decisions").

The source commit is pinned: `c2bfddb`, the result of `git log -1 --format=%h -- . ':!product-description'` run from `/home/user/helios`. Do not use `git rev-parse HEAD`; commits to this directory move it.

For each document, read in this order before writing:

1. The component that draws the feature in `packages/studio/src/components/` and the state it uses in `packages/studio/src/context/StudioContext.tsx` (every request to the server, the active composition, the playback range and loop, the timeline state record, render jobs, exports, snapshots).
2. The shared pipeline where relevant: `packages/studio/src/App.tsx` (what is mounted where), `packages/studio/src/hooks/useKeyboardShortcut.ts` and `components/GlobalShortcuts.tsx` (who receives a key), `hooks/usePersistentState.ts` (what is remembered), the Studio server in `packages/studio/src/server/` (`plugin.ts` routes, `discovery.ts` files on disk, `render-manager.ts` render jobs, `templates/`), the player in `packages/player/src/index.ts` and `controllers.ts`, and the composition's clock in `packages/core/src/Helios.ts`.
3. The tests beside each component (`*.test.tsx`, `*.test.ts`). They are close to executable specifications of edge cases. Key files: `components/Stage/Stage.test.tsx`, `components/GlobalShortcuts.test.tsx`, `hooks/useKeyboardShortcut.test.ts`, `components/Timeline.test.tsx`, `components/Controls/PlaybackControls.test.tsx`, `components/Controls/TimecodeDisplay.test.tsx`, `context/StudioContext.test.tsx`, `components/PropsEditor.test.tsx`, `components/Omnibar.test.tsx`, `server/discovery.test.ts`, `server/render-manager.test.ts`, and in the player `src/index.test.ts` and `src/controllers.test.ts`.
4. UI behavior: `packages/studio/src/components/` (the panels under `AssetsPanel/`, `CompositionsPanel/`, `RendersPanel/`, `CaptionsPanel/`, `AudioMixerPanel/`, `ComponentsPanel/`; the dialogs; `Stage/`, `Controls/`, `Timeline.tsx`, `PropsEditor.tsx`, `SchemaInputs.tsx`) and their CSS files for sizes and colors.
5. Defaults and thresholds: the constants at the top of `Timeline.tsx` and `Layout/StudioLayout.tsx`, the default state in `StudioContext.tsx`, the presets in `Stage/StageToolbar.tsx`, and `server/templates/`.

Do not describe code. Describe what the user sees and does. Technical detail goes only in `> Technical note:` block quotes, and only when the mechanism changes what the user would expect.

## Writing rules

- Follow the eight-section template in the README for every feature document. Foundation and cross-cutting documents may drop sections that do not apply but must still cover cancel and interrupt behavior wherever an interaction exists.
- The five subsections of "The interaction, event by event" are always titled `### Starting`, `### Ending at once`, `### Becoming ongoing`, `### While ongoing`, `### Finishing`, in that order. Map them onto the feature with the table in the README's document template.
- Modifiers and cancel/interrupt go in tables. The Modifiers table's columns are "Set at the start" and "Changed while ongoing", and its rows are Shift, Ctrl/Cmd, Alt/Option, Keyboard focus, Playback, Player connection, in that order. The Cancel and interrupt table's columns are "Before it is ongoing" and "While ongoing", and its rows are Escape; Another shortcut, click, or command; Composition switched; Window loses focus; Pointer leaves the window; Server request fails or server stops; Reload or tab closed; Hot reload; Project changed on disk, in that order. Do not add, drop, rename, or reorder rows in a single document. Every cell is filled, even if the answer is "No effect."
- "Interactions with other systems" walks these concerns in this order, one bold-led paragraph each: Files on disk; Browser storage; Undo; Playback range and loop; Input props; Rendering and export; Notifications; Other tabs and agents; Keyboard and accessibility.
- Use the glossary's words. If you need a term the glossary lacks, add it to `glossary.md` in the right section with a one-paragraph definition, then use it. Do not coin a synonym ("project folder" and "project root" are both fine because the glossary defines them as one thing; "workspace folder" is not).
- Write Ctrl/Cmd for the key Studio treats as either Control or Command. Write key names as the keyboard shows them (Space, Escape, Home, Shift, ←, →).
- Sentence case for all headings. Direct, concrete language. No hedging, no marketing.
- State surprising behavior plainly and say why if the reason is in the code or a comment. If it looks like a bug, say so in "Open questions" rather than smoothing it over.
- Cross-reference other documents with relative links rather than repeating their content. The [input model](foundations/input-model.md) owns keyboard focus, the shortcut map, drag mechanics, drag-and-drop payloads, and the general meaning of each interrupt row. The [workspace](foundations/the-workspace.md) owns the layout, dialogs, toasts, and the list of remembered state. The [project and compositions](foundations/project-and-compositions.md) document owns everything on disk. The [preview player](foundations/the-preview-player.md) owns connecting, clock-bound compositions, hot reload, and switching compositions. Do not restate them; link.
- Link only to documents that exist. Refer to a document that is still `not started` by its path in code format (`output/server-renders.md`), not as a link, so the link checker stays clean; when you write a document, search the set for its path in code format and turn each mention into a relative link.
- Every document ends with "## Open questions and verification" listing what was read from code but not confirmed by hand, followed by `Verified against helios commit \`c2bfddb\``.
- Mermaid `stateDiagram-v2` for each interaction's states. Keep it to the states the user passes through; omit internal bookkeeping states.

## Things already established (do not re-derive, do not contradict)

Each bullet names the document that owns the fact. Link to the owner instead of restating it at length.

Input and focus ([input model](foundations/input-model.md)):

- No Studio drag has a distance or time threshold. A drag is ongoing from the first mouse move with the button held. A press on the timeline's track area seeks before any move.
- There are three kinds of drag. Area-bound: the stage pan follows moves only inside the stage and ends when the pointer leaves it. Page-bound: the timeline scrub, the in and out marker drags, the time-prop marker drags, and the panel dividers follow the pointer anywhere on the page and end on a release anywhere on the page. The browser's own drag and drop: dragging assets and dropping desktop files.
- No drag captures the pointer or listens for the window losing focus. A release that happens in another window is never seen; the drag continues when the pointer comes back.
- The stage pans on the left or middle button only. The timeline and the panel dividers act on any button.
- Most presses move keyboard focus as on any web page. A press on the timeline's track area does not move focus.
- Keyboard focus has three receivers. In a text field (text and number inputs, text areas, sliders, drop-down menus, editable text) every shortcut is ignored except Ctrl/Cmd+K and the open Omnibar's Escape, ↑, ↓, and Enter. On the player, the player acts on the key first and then Studio acts on it too. Anywhere else, Studio acts.
- The shortcut map: Space play or pause (never restarts at the end); K pause; J play in reverse, then twice as fast up to 4x; L play forward, then twice as fast up to 4x; Shift+L toggle loop; ← and → one frame, with Shift ten; Home go to the in point; I set the in point; O set the out point; ' toggle the safe-area guides; ? open Keyboard Shortcuts; Ctrl/Cmd+K open the Omnibar (works in text fields, and also pauses unless focus is in a text field). Escape only closes the Omnibar, Keyboard Shortcuts, and confirmation dialogs, and cancels the timecode field and the asset rename fields.
- Studio's letter shortcuts ignore modifiers (Shift+I and Ctrl/Cmd+I both set the in point). Alt/Option is never read. Control and Command are the same key on every platform. Holding a key repeats its shortcut.
- The Keyboard Shortcuts dialog's "/" key cap and the Omnibar's "N", "S", and "L" hints do not match the code.
- A desktop file dropped outside a drop target is left to the browser (suspected: the browser opens it in place of Studio).

The workspace ([the workspace](foundations/the-workspace.md)):

- Layout defaults and limits: sidebar 250 pixels (150 to 600), inspector 300 (200 to 600), timeline panel 300 tall (100 to 800), header 40. The stage takes the rest and can shrink to nothing.
- Sidebar tabs, in order: Compositions (default), Assets, Components, Captions, Audio, Renders. A hidden tab's panel is discarded and forgets its local state.
- Every dialog closes on an overlay click, even mid-request (the request still completes). Only the Omnibar, Keyboard Shortcuts, and confirmation dialogs close on Escape. Dialogs do not trap focus or block shortcuts. Ctrl/Cmd+K can open the Omnibar over another dialog.
- Toasts appear at the bottom right, stack with the newest at the bottom, last 3 seconds (2 for "Composition reloaded"), and close with ×. The "Composition reloaded" toast exists only in Studio's development mode, not in the Studio `helios studio` serves.
- Remembered (browser local storage, per profile and per exact address, shared by every project served there): layout sizes, sidebar tab, stage zoom and pan, transparency grid (on), safe-area guides (off), timeline zoom (Fit), active composition, render settings (canvas mode), and per composition ID the timeline state (in point, out point, loop, playhead position). Written immediately on change, read once on load.
- Not remembered: canvas size, playback rate, volume, mute, audio mix, every search and filter, the Assets panel's folder, the export format, collapsed groups, the timeline's scroll position, dialog contents.
- On page load Studio requests templates, compositions, assets, and render jobs at once, then polls render jobs every second. It opens the remembered composition if it still exists, otherwise the first one the server lists (folder order on disk, not alphabetical). The "Welcome to Helios Studio" empty state shows for a moment before the list arrives.

Files on disk ([project and compositions](foundations/project-and-compositions.md)):

- A composition is a folder containing `composition.html`. The walk skips `node_modules`, `.git`, `dist`, `build`, `.helios`, and does not look inside a composition's folder. It runs on page load and after Studio creates or duplicates a composition or sets a thumbnail; never because files changed on disk.
- A composition's ID is its folder path relative to the project root with forward slashes. Its name is its folder name split at hyphens with each part capitalized; it is never stored. Renaming moves the folder to the top level of the project and changes the ID, which forgets the timeline state. A root-level `composition.html` has an empty ID, which every ID-based request refuses.
- New compositions go at the top level, in a folder named by lowercasing the name and turning every run of characters other than a to z, 0 to 9, and hyphen into one hyphen.
- `composition.json` holds `width`, `height`, `fps`, `duration`, `defaultProps`. Width and height set the canvas size whenever Studio's copy of the composition changes (open, settings save, props auto-save). Default props are applied on a fresh open. `fps` and `duration` are only shown and edited in Composition Settings; playback, renders, and exports use the composition's own frame rate and duration.
- The Props Editor auto-saves the input props into `defaultProps` about a second after they stop changing; with no `composition.json` it writes 1920 by 1080, 30 fps, 10 seconds.
- Only the Title explainer template connects to the player; Vanilla JS (the dialog's default), React, Vue, Svelte, Solid, and Three.js compositions never do (suspected bug).
- Assets come from `public/` if it exists, otherwise from the whole project (including renders and thumbnails). Recognized extensions only; every folder is listed. Uploads go to `public/` or the project root.
- Server-side renders are written to `renders/render-{id}.mp4` with the history in `renders/jobs.json`; a job queued or rendering when the server stopped comes back as failed, "Server restarted during render".
- Request failures behave in three ways (reported with a toast; silent; success reported anyway for upload, delete asset, start render, cancel render, delete render). The table in that document is the reference.
- Studio does not watch the project. Compositions are re-listed only by its own create, duplicate, and thumbnail; assets after any asset change made in Studio; render jobs every second.
- Nothing saved to disk can be undone from Studio; deleting removes files at once.

The preview ([the preview player](foundations/the-preview-player.md)):

- Connected means the player found the composition's Helios instance (once when the page loads, then every 100 ms for 5 seconds) and Studio noticed (it checks every 200 ms). After 5 seconds: "Connection Failed. Ensure window.helios is set or connectToParent() is called." with Retry. While loading: "Loading...".
- Before connection: transport buttons disabled except Loop, Props Editor says "No active controller", the timeline uses 100 total frames as a placeholder and otherwise keeps the previous composition's numbers. I, O, Shift+L, the loop button, and the in and out markers change Studio's state, applied on connection.
- On a fresh open: default props applied, schema read once, remembered playhead position sought, loop and range applied, out point set to total frames if it was 0.
- A click on the composition gives the player focus and toggles playback; within one frame of the end it goes to frame 0 and plays (ignoring the in point). A double-click enters fullscreen. The composition's own buttons cannot be clicked.
- Clock-bound compositions (every example and every template) take their frame from the browser's document clock, per the code, so Studio's seeks, pauses, range, loop, and rate would not hold. This is the first thing to verify. Playback documents describe a composition the player can drive (connected and not clock-bound).
- Hot reload restores the playhead position, the playing state, and the input props, and re-applies loop and range; it does not restore the playback rate, volume, mute, audio mix, or caption edits.
- Switching compositions (suspected bug): the first connection after a switch is treated as a hot reload, carrying the previous composition's input props, playhead position, and playing state into the new one; the auto-save then writes those props into the new one's `composition.json`.

The stage view ([the stage view](stage/the-stage-view.md)):

- Zoom ranges from 10% to 500%. Ctrl/Cmd and the wheel changes it by one thousandth of the wheel's movement (10 points per 100 units); the toolbar's - and + divide or multiply by 1.25; Fit means 100% and centered, not "fit to stage". Zoom scales around the composition's own center.
- The pan is in screen pixels, unbounded, and independent of zoom. Both are remembered globally, written on every change.
- A pan that starts and ends on the composition is also a click on the player and toggles playback (suspected bug).

Units and numbers ([glossary](glossary.md#units)):

- Frames are numbered from 0; total frames is duration times frame rate; the playhead may sit anywhere from 0 to total frames inclusive. The current frame is fractional after playback. The timecode rounds down; the timeline's "Fr:" readout rounds to the nearest frame.

Which document owns which state of the playback area:

- [The preview player](foundations/the-preview-player.md) owns loading, connecting, connection failed, error, hot reload, and switching compositions.
- [The transport controls](playback/the-transport-controls.md) own paused, playing forward, playing in reverse, the playback rate and its changes (the speed menu, J, K, L), reaching the end of the playback range (stopping, or wrapping with loop), the loop toggle, frame steps, rewind (Home and the ⏮ button), volume, and mute.
- [The timeline](playback/the-timeline.md) owns scrubbing (from the press on the track area to the release), the hover guide, snapping, the timeline zoom and scrolling, the ruler, and editing the timecode field.
- [The playback range](playback/the-playback-range.md) owns the in and out points, I and O, dragging the in and out markers (from press to release), the shaded region, how the range limits playback, renders, and exports, and the per-composition timeline state record.
- [Timeline tracks](playback/timeline-tracks.md) owns the caption bars, composition markers (and the seek on pressing one), time-prop markers (and dragging one), audio waveforms, and dropping an asset onto the timeline.
- A press on the timeline goes to exactly one owner, by what is under the pointer: an in or out marker (the playback range), a time-prop marker or a composition marker (timeline tracks), anything else in the track area (the timeline's scrub). Playback continues through all of them; what playing does is owned by the transport controls.

## Order of work

1. `foundations/` first, in this order: `input-model.md`, `project-and-compositions.md`, `the-workspace.md`, `the-preview-player.md`. Everything else links to them.
2. `playback/` next, all four documents. This is the hardest part and the bulk of the experience. Read `StudioContext.tsx`, `GlobalShortcuts.tsx`, `Controls/PlaybackControls.tsx`, `Controls/TimecodeDisplay.tsx`, `Timeline.tsx`, `TimelineAudioTrack.tsx`, the player's `handleKeydown` and `togglePlayPause` in `packages/player/src/index.ts`, and `play`, `pause`, `seek`, `setPlaybackRange`, and `onTick` in `packages/core/src/Helios.ts` before starting any of them, because the states hand off to each other and the documents must agree on where one ends and the next begins.
3. The remaining documents: `stage/the-stage-toolbar.md`, then `compositions/`, `props/`, `assets/`, `output/`, `panels/`, `help/`, and `cross-cutting/`. These are independent of each other and can be drafted in parallel with subagents once the foundations and the playback documents exist to link to. If you parallelize, give each subagent this prompt, the exemplars, and the specific documents to write; then review every result yourself for consistency with the glossary and the established facts above before accepting it.
4. Consistency pass over the whole set: same term for the same thing everywhere, no two documents describing the same behavior differently, every relative link resolves (`python3 /root/.claude/skills/product-description/references/check-links.py /home/user/helios/product-description`), every document has a verification footer, every glossary term used is defined.
5. Update the coverage table in `README.md` as you go: `drafted` when written, never `verified` (verification by hand is a separate pass you are not doing).

## Working rules

- Commit after each document or coherent group of documents with a message of the form `docs: add {path}` or `docs: revise {path}`. Run every `git` command from `/home/user/helios`, stage only paths under `product-description/`, and end every commit message with the session's two trailer lines after a blank line (`Co-Authored-By: ...` and `Claude-Session: ...`). Do not push, open pull requests, or file issues.
- Do not modify anything outside `product-description/`. The rest of the repository is read-only reference material.
- Do not add files outside the README's structure without updating the structure and coverage table to match.
- When a behavior cannot be determined from code and tests, write down what you could determine, put the rest in "Open questions", and move on. Do not guess and do not block.
- Depth bar: `stage/the-stage-view.md` is roughly 200 lines for a small feature. The playback documents are longer; dialog and panel documents will often be shorter. Completeness matters more than length. Every state, every modifier, every cancel/interrupt row must be accounted for, even if the answer is "No effect."
- If you find that the README's structure is wrong for something you discover (a document that should be split, two that should merge), make the change, update the structure and coverage table, and note why in the commit message.

You are done when the coverage table has no `not started` rows, the consistency pass is complete, and everything is committed.
