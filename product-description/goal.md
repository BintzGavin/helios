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

Filled in as the foundations are written. Each bullet names the document that owns the fact.

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
