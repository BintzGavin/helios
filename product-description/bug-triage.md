# Bug triage

A consolidated list of the defects and inconsistencies that the feature documents raised in their "Open questions and verification" sections and in their bodies. Each entry was first read from the Helios repository at commit `c2bfddb` (the source commit every document cites) and its tests. An entry gets a **Status** line when a pass in [`verification/`](README.md#verification) touches it. The first pass, an automated one on 2026-10-07 (see [Results so far](verification/README.md#results-so-far)), ran part of the checklists: the entries it touched say what it confirmed and with which items, and it added B-74 to B-87 from what it observed. B-73, about building Helios, was observed earlier, when the protocol's build was run. Questions the documents could not settle from the code (how Chromium reports focus, what a clock-bound composition draws, how long a check takes) stay in those documents and are not repeated here. The list exists so the product team can decide, item by item, whether to fix, to document as intended, or to leave. Nothing here is a work item until a person has decided it (see the README's [Purpose](README.md#purpose)).

## Summary

The 27 feature and foundation documents raised 147 suspected defects, counting each document once per defect (225 links to the sections that raise them). Merged by root cause they come to 72 entries: 12 high, 40 medium, and 20 low, one of the low ones a list of ten small copy and rendering slips. A seventy-third, [B-73](#b-73-the-repositorys-npm-run-build-fails-because-it-never-builds-packagesinfrastructure) (medium), was added afterwards from the verification protocol rather than from a document: the repository's own build fails at this commit, which is about building Helios, not about Studio's behavior. It sits among the medium entries by its area, `build`; IDs are never renumbered. The automated pass of 2026-10-07 added fourteen more from what it observed in the running product. From the P1 items: three high ([B-74](#b-74-studio-serves-composition-pages-untouched-so-the-title-explainer-template-never-connects-and-nothing-hot-reloads), Studio serves composition pages untouched, so its default template never connects and nothing hot reloads; [B-78](#b-78-cancelling-a-server-side-render-stops-the-helios-studio-process), Cancel stops the server; [B-81](#b-81-server-side-renders-ignore-the-input-props), server-side renders ignore the input props), five medium (B-75, B-76, B-77, B-79, and B-82, the last a suspected defect the documents raised that had not been filed), and one low (B-80). From the P2 items it ran afterwards: one high ([B-85](#b-85-client-side-exports-never-contain-audio), client-side exports never contain audio), two medium ([B-84](#b-84-zooming-the-timeline-in-widens-the-whole-middle-column-instead-of-scrolling-the-track-area), zooming the timeline widens the whole middle column; [B-86](#b-86-snapshots-and-client-side-exports-in-dom-mode-fail-in-chromium), DOM-mode snapshots and exports fail in Chromium), and two low ([B-83](#b-83-a-canvas-wider-than-the-stage-is-drawn-no-wider-than-the-compositions-page), a canvas wider than the stage is drawn no wider than the composition's page; [B-87](#b-87-two-component-installs-at-once-leave-only-one-of-them-in-heliosconfigjson), two installs at once lose one from `helios.config.json`). Each is placed by its severity and area. The largest clusters are the keyboard ([B-04](#b-04-enter--and--lose-their-browser-action-on-the-whole-page-and-space-never-presses-a-button), raised by 10 documents, with B-05, B-25, B-52, and B-60, 14 documents in all), switching compositions (B-08, B-10, and B-42, 9 documents), and the Props Editor's auto-save and what it writes to `composition.json` (B-03, B-09, B-10, and B-19, 8 documents). Most of the high entries have one of two shapes: Studio silently writes the wrong thing to disk (B-01, B-03, B-06, B-08, B-09, B-10), or one key or pointer action does two things, or none (B-04, B-05, B-11, B-12). The other two are buttons that never reach the server (B-02) and a transport that cannot drive any composition Studio ships (B-07). The automated pass checked B-07 first and confirmed it: a clock-bound composition runs on its own clock whatever Studio does, so the playback items were run on copies without the clock binding. It confirmed every high entry (B-01 to B-11, though for B-12 only the cause could be seen) and most of the others; see each entry's Status line. Five entries have none, because every item that shows them needs a file picker or a file dragged in from the desktop, which the pass did not use: B-13, B-14, B-15, B-26, and B-67.

| ID | Title | Severity | Area | Decision needed | Issue |
| --- | --- | --- | --- | --- | --- |
| B-01 | Saving Composition Settings moves or renames the composition's folder even when the name is unchanged | high | compositions | fix | — |
| B-02 | Deleting a composition from the Compositions panel, and removing a component from the Components panel, never reach the server | high | compositions | fix | — |
| B-03 | Studio writes its own stale copy of `composition.json` over changes made outside it | high | cross-cutting | fix | — |
| B-04 | Enter, ↑, and ↓ lose their browser action on the whole page, and Space never presses a button | high | input | fix | — |
| B-05 | With the player focused, keys act twice: once in the player, then again in Studio | high | input | fix | — |
| B-78 | Cancelling a server-side render stops the `helios studio` process | high | output | fix | — |
| B-81 | Server-side renders ignore the input props | high | output | fix | — |
| B-85 | Client-side exports never contain audio | high | output | fix | — |
| B-06 | Dragging a time-prop marker throws away every other input prop | high | playback | fix | — |
| B-07 | Studio's transport and timeline cannot control a clock-bound composition, which is every template and nearly every example | high | preview | fix | — |
| B-08 | Switching compositions carries the previous composition's input props, playhead, and playing state into the new one | high | preview | fix | — |
| B-74 | Studio serves composition pages untouched, so the Title explainer template never connects and nothing hot reloads | high | preview | fix | — |
| B-09 | The Props Editor's auto-save never comes while playing or for a clock-bound composition | high | props | fix | — |
| B-10 | A pending auto-save is written into the composition being opened instead of the one that was edited | high | props | fix | — |
| B-11 | A pan that starts and ends on the composition toggles playback, and one that starts and ends on a toolbar button presses it | high | stage | fix | — |
| B-12 | Ctrl/Cmd and the wheel zoom the whole page as well as the stage | high | stage | fix | — |
| B-13 | Dropping several desktop files on the Assets panel uploads only the first | medium | assets | fix | — |
| B-14 | Uploading a file whose name already exists replaces the old file without asking | medium | assets | product call | — |
| B-15 | A file whose name has characters outside Latin-1 cannot be uploaded | medium | assets | fix | — |
| B-73 | The repository's `npm run build` fails because it never builds `packages/infrastructure` | medium | build | fix | — |
| B-16 | Composition Settings refills itself while open, discarding edits, and shows leftover numbers for a composition without `composition.json` | medium | compositions | fix | — |
| B-17 | New Composition accepts names whose folders Studio cannot list or name properly | medium | compositions | fix | — |
| B-18 | New Composition replaces all four numbers with defaults when any one of them is 0 | medium | compositions | fix | — |
| B-19 | A composition at the project root cannot be saved, duplicated, deleted, or auto-saved | medium | compositions | fix | — |
| B-82 | Compositions made from the Vanilla JS, React, and Three.js templates never connect | medium | compositions | fix | — |
| B-20 | The Compositions panel cannot be used from the keyboard | medium | compositions | fix | — |
| B-21 | Renders started by an agent and from the Renders panel use different frame rates and lengths | medium | cross-cutting | fix | — |
| B-22 | System Diagnostics reports a capable server renderer as unable to do anything | medium | help | fix | — |
| B-23 | The first diagnostics check or render on a machine without the renderer's Chromium freezes the Studio server while it downloads | medium | help | fix | — |
| B-24 | The Helios Assistant's Documentation tab finds almost none of the documentation | medium | help | fix | — |
| B-25 | Studio's letter shortcuts also fire with Ctrl/Cmd held, on top of the browser's own shortcut | medium | input | fix | — |
| B-26 | A desktop file dropped outside a drop target replaces Studio in the tab | medium | input | fix | — |
| B-27 | Client-side exports draw each caption one frame late | medium | output | fix | — |
| B-28 | A client-side export keeps running against a composition that was switched away | medium | output | fix | — |
| B-29 | Client-side export ignores the Video Codec setting and turns a decimal bitrate into 5 megabits per second | medium | output | fix | — |
| B-86 | Snapshots and client-side exports in DOM mode fail in Chromium | medium | output | fix | — |
| B-30 | A render or job spec started before the composition's length is known covers zero frames | medium | output | fix | — |
| B-31 | The "Transparent (WebM)" preset writes an MP4 file with no transparency | medium | output | fix | — |
| B-32 | A job spec does not reproduce "Start Render Job", and with a WebCodecs preference every chunk command fails | medium | output | fix | — |
| B-33 | The Audio panel lists and controls tracks that the composition never applies the controls to | medium | panels | fix | — |
| B-34 | Solo lives in the Audio panel and comes apart from the composition's mutes | medium | panels | fix | — |
| B-35 | The Captions panel writes cues into a `captions` input prop for compositions connected through `connectToParent` | medium | panels | fix | — |
| B-36 | With a remote registry in the index format, every component shows "Installed" | medium | panels | fix | — |
| B-37 | A component install reports success when the package manager fails | medium | panels | fix | — |
| B-79 | Two Components panel failures stop the `helios studio` process | medium | panels | fix | — |
| B-38 | The out point does not follow a change in the composition's length, and playback can run past the end | medium | playback | fix | — |
| B-39 | Dragged in, out, and time-prop markers stick to their own position | medium | playback | fix | — |
| B-40 | A click on the composition within a frame of the end restarts from frame 0, even while playing | medium | playback | fix | — |
| B-41 | A hot reload resets the playback rate, and refused props cancel the rest of the restore | medium | playback | fix | — |
| B-75 | Reverse playback freezes on a composition whose media Helios manages | medium | playback | fix | — |
| B-84 | Zooming the timeline in widens the whole middle column instead of scrolling the track area | medium | playback | fix | — |
| B-42 | After a switch, Studio goes on using the previous composition's length, frame rate, props, playhead, and schema | medium | preview | fix | — |
| B-43 | Five requests report success without looking at the server's answer | medium | project | fix | — |
| B-44 | The Props Editor's time field undoes a marker drag and never shows its error style | medium | props | fix | — |
| B-45 | An inferred color field changes kind mid-typing and loses keyboard focus | medium | props | fix | — |
| B-46 | Typing into a typed-array box is undone at the next redraw | medium | props | fix | — |
| B-47 | Asset fields with accepted extensions, and color text boxes, refuse every partly typed value | medium | props | fix | — |
| B-48 | Reset removes props the schema does not list, and silently does nothing when one default is refused | medium | props | fix | — |
| B-49 | Safe-area guides are positioned from the stage's corner, not the composition's | medium | stage | fix | — |
| B-50 | The transparency grid never shows through a transparent composition | medium | stage | fix | — |
| B-51 | One unexpected error blanks the whole Studio page | medium | workspace | fix | — |
| B-52 | The Omnibar opens beneath every other dialog and takes keyboard focus there | medium | workspace | fix | — |
| B-76 | At the default sidebar width the last sidebar tabs lie under the stage and cannot be clicked | medium | workspace | fix | — |
| B-77 | The stage never shrinks below about 938 pixels, pushing the inspector off a narrow window | medium | workspace | fix | — |
| B-53 | Two asset moves that should work are refused | low | assets | fix | — |
| B-54 | 📝 on a composition tile opens its folder rather than its page | low | compositions | fix | — |
| B-55 | Searching the Compositions panel shows a matching folder closed, and leaves folders it opened open | low | compositions | product call | — |
| B-56 | The Omnibar's highlight does not scroll into view | low | compositions | fix | — |
| B-57 | Open Studio tabs never follow each other's remembered values | low | cross-cutting | product call | — |
| B-58 | Two `helios studio` processes on one project overwrite each other's render history | low | cross-cutting | product call | — |
| B-59 | An agent can cancel the user's render with no notice beyond the status | low | cross-cutting | product call | — |
| B-60 | The Keyboard Shortcuts dialog and the Omnibar's hints disagree with the shortcuts | low | help | fix | — |
| B-61 | The Assistant picks documentation by splitting the question at spaces and taking the first three matches | low | help | product call | — |
| B-62 | Export and snapshot do nothing, without a message, when there is nothing to capture | low | output | fix | — |
| B-63 | A render job started in Studio is labeled with the composition page's address | low | output | fix | — |
| B-64 | A finished client-side export is not announced | low | output | product call | — |
| B-65 | Deleting a render job has no confirmation | low | output | product call | — |
| B-66 | Every render starts at once; there is no queue | low | output | product call | — |
| B-67 | Import SRT accepts only strict SRT and refuses WebVTT | low | panels | product call | — |
| B-87 | Two component installs at once leave only one of them in `helios.config.json` | low | panels | fix | — |
| B-68 | The empty background below the timeline's track area takes no presses or drops, and the drop highlight blinks | low | playback | fix | — |
| B-80 | The `d3-animation` example never connects | low | preview | fix | — |
| B-69 | A size typed in the stage toolbar is replaced by the metadata's at every save | low | stage | product call | — |
| B-83 | A canvas wider than the stage is drawn no wider than the composition's page | low | stage | fix | — |
| B-70 | Fit sets 100% rather than fitting the composition to the stage | low | stage | product call | — |
| B-71 | Clipboard copies report success without checking | low | workspace | fix | — |
| B-72 | Small copy and rendering slips | low | various | fix | — |

## High

### B-01: Saving Composition Settings moves or renames the composition's folder even when the name is unchanged

- **Where the user meets it:** Composition Settings, changing only the frame rate, duration, or size of a composition in a subfolder, or of a top-level composition whose folder name has capitals or characters other than letters, digits, and hyphens.
- **What happens / what was expected:** Save moves `scenes/intro` to `intro` at the top of the project, and renames `My_Comp` to `my-comp`. The ID changes, so the remembered in and out points, loop, and playhead position are forgotten, and a composition that loads files by relative paths may break. On a disk that ignores case (macOS and Windows defaults), a top-level folder such as `Intro` cannot be saved at all: Save is refused as "already exists". After an auto-save the prefilled name of a subfolder composition is built from its whole ID ("Scenes/intro Card"), so Save moves it to `scenes-intro-card`. Expected: Save with an untouched name changes only the numbers.
- **Reproduce:** Open a composition in `scenes/intro`. Open Composition Settings, change FPS, press Save. The folder is now `intro` at the project root.
- **Why (from the code):** `packages/studio/src/components/CompositionSettingsModal.tsx` lines 19 and 39 prefill the shown name and always send it. `packages/studio/src/server/plugin.ts` lines 385 to 395 rename whenever a name is sent. `packages/studio/src/server/discovery.ts` lines 173 to 203 (`renameComposition`) build the target from the name at the top level (`path.join(projectRoot, dirName)`), lowercase it, and refuse when the target exists, which on a case-insensitive disk is the same folder. The whole-ID name comes from `discovery.ts` lines 684 to 687.
- **Severity:** `high`. Silently does something different from what was confirmed, and loses the remembered timeline state.
- **Decision needed:** `fix`. Send a name only when the user changed it, and keep a renamed composition in its parent folder.
- **Raised by:** [composition settings](compositions/composition-settings.md#edge-cases), [composition settings](compositions/composition-settings.md#open-questions-and-verification), [project and compositions](foundations/project-and-compositions.md#edge-cases)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): COMPSETTINGS-25 (Save with nothing changed moved `scenes/intro` to `intro`).

### B-02: Deleting a composition from the Compositions panel, and removing a component from the Components panel, never reach the server

- **Where the user meets it:** × on a composition tile, then Delete in the confirmation; Remove on an installed component.
- **What happens / what was expected:** A red toast with the browser's complaint about an empty answer (in Chromium ending "Unexpected end of JSON input"), and nothing is deleted. Expected: the composition's folder, or the component's files, are removed.
- **Reproduce:** In the Compositions panel, press × on any tile and confirm. The tile stays and the toast is red. With a project configuration, press Remove on an installed component and confirm the browser prompt.
- **Why (from the code):** The page sends the target in the query string: `packages/studio/src/context/StudioContext.tsx` line 534 (`/api/compositions?id=...`) and `packages/studio/src/components/ComponentsPanel/ComponentsPanel.tsx` line 94 (`/api/components?name=...`). The handlers in `packages/studio/src/server/plugin.ts` act only when the rest of the address is exactly `/` (line 342 for compositions, line 120 for components), which `/?id=...` is not, so the request falls through to an empty "not found". The assets handler strips the query first (lines 518 to 521) and is not affected. If the delete did reach the server, `StudioContext.tsx` lines 543 to 549 would open the first composition in the server's order, not the first tile.
- **Severity:** `high`. Two buttons do not work at all.
- **Decision needed:** `fix`. Compare the path without its query in both handlers, as the assets handler does.
- **Raised by:** [project and compositions](foundations/project-and-compositions.md#when-a-request-fails), [project and compositions](foundations/project-and-compositions.md#open-questions-and-verification), [the Compositions panel](compositions/the-compositions-panel.md#finishing), [the Compositions panel](compositions/the-compositions-panel.md#open-questions-and-verification), [the Components panel](panels/the-components-panel.md#finishing), [the Components panel](panels/the-components-panel.md#open-questions-and-verification)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): PROJECT-60, COMPOSPANEL-26, COMPONENTS-18, and PROJECT-61, and in the items that delete from the Compositions panel, COMPOSPANEL-25, COMPOSPANEL-50, COMPOSPANEL-53, and COMPOSPANEL-61. Both DELETE requests were answered 404 with an empty body, and the toast read "Failed to execute 'json' on 'Response': Unexpected end of JSON input"; the folder, the component's files, and `helios.config.json` stayed.

### B-03: Studio writes its own stale copy of `composition.json` over changes made outside it

- **Where the user meets it:** Editing a composition's `composition.json` in an editor, or letting an agent or a second Studio tab change it, while Studio has the composition open.
- **What happens / what was expected:** Studio does not re-read the file. The next Props Editor auto-save, or Composition Settings' Save, writes Studio's old width, height, frame rate, duration, and default props back over the outside edit, with a "Composition updated" toast. The auto-save also fires when the user changed nothing, whenever the composition's props differ from the saved ones as JSON text (a new composition, a schema that adds defaults, a different key order), and writes the composition's own props over saved ones it refused. Two tabs on one composition overwrite each other the same way. Expected: an outside edit survives unless the user changes the same field in Studio.
- **Reproduce:** Open a Title explainer composition, paused. Change `width` in its `composition.json` in an editor and save. Change any prop in the Props Editor and wait a few seconds. The file has the old width again.
- **Why (from the code):** `packages/studio/src/components/PropsEditor.tsx` lines 48 to 71 save whenever the props differ from Studio's copy of `defaultProps` and send Studio's whole copy of the metadata with them (lines 55 to 65). `CompositionSettingsModal.tsx` line 39 sends all four numbers. `packages/studio/src/server/discovery.ts` lines 657 to 681 merge what was sent over the file. Studio reads the file only when it walks the project (`discovery.ts` lines 75 to 85).
- **Severity:** `high`. Loses work silently.
- **Decision needed:** `fix`. The auto-save should send only `defaultProps`, and only after an edit; Settings should send only changed fields. Whether two tabs editing one composition should be reconciled is a separate product call.
- **Raised by:** [changes from outside Studio](cross-cutting/changes-from-outside-studio.md#finishing), [changes from outside Studio](cross-cutting/changes-from-outside-studio.md#open-questions-and-verification), [project and compositions](foundations/project-and-compositions.md#when-the-project-changes-underneath-studio), [composition settings](compositions/composition-settings.md#cancel-and-interrupt), [the Props Editor](props/the-props-editor.md#edge-cases), [the Props Editor](props/the-props-editor.md#open-questions-and-verification)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): PROPSEDITOR-57 (the auto-save wrote Studio's copy of the size and time fields over an edit made to `composition.json` on disk), with PROJECT-67, COMPSETTINGS-11, OUTSIDE-07, and STAGETOOLBAR-78 showing that Studio does not read the edited file again. Those items' expected results are this behavior, so they passed.

### B-04: Enter, ↑, and ↓ lose their browser action on the whole page, and Space never presses a button

- **Where the user meets it:** Everywhere a keyboard user works: every dialog, every confirmation, every button, every text area, number box, slider, and drop-down menu.
- **What happens / what was expected:** Enter never submits New Composition, Duplicate Composition, or Composition Settings, never presses a focused button, and never starts a new line in a JSON box or a caption's text. ↑ and ↓ never step a number box, move a slider, change a closed menu, move the caret between lines, or scroll. Space on a focused button toggles playback instead of pressing it. Confirmations can be answered from the keyboard only with Escape. Expected: the browser's usual keyboard behavior wherever Studio does not use the key.
- **Reproduce:** Open New Composition, type a name, press Enter: nothing happens. Tab to a confirmation's Delete and press Enter or Space: nothing, or playback toggles. Focus a Props Editor number box and press ↑.
- **Why (from the code):** The Omnibar stays mounted while closed and registers ↑, ↓, and Enter with `preventDefault: true` (`packages/studio/src/components/Omnibar.tsx` lines 180 to 196). `packages/studio/src/hooks/useKeyboardShortcut.ts` lines 30 to 34 call `preventDefault()` before the callback checks whether the Omnibar is open. The Space shortcut does the same outside text fields (`packages/studio/src/components/GlobalShortcuts.tsx` lines 22 to 29).
- **Severity:** `high`. A missing global handler that affects every form and button in Studio.
- **Decision needed:** `fix`. Register the Omnibar's keys only while it is open, and let Space reach a focused button.
- **Raised by:** [the input model](foundations/input-model.md#keys-studio-cancels-everywhere), [the input model](foundations/input-model.md#open-questions-and-verification), [the workspace](foundations/the-workspace.md#open-questions-and-verification), [the stage toolbar](stage/the-stage-toolbar.md#open-questions-and-verification), [composition settings](compositions/composition-settings.md#open-questions-and-verification), [creating and duplicating](compositions/creating-and-duplicating.md#finishing), [creating and duplicating](compositions/creating-and-duplicating.md#open-questions-and-verification), [the Compositions panel](compositions/the-compositions-panel.md#interactions-with-other-systems), [the Compositions panel](compositions/the-compositions-panel.md#open-questions-and-verification), [the Omnibar](compositions/the-omnibar.md#interactions-with-other-systems), [the Omnibar](compositions/the-omnibar.md#open-questions-and-verification), [prop fields](props/prop-fields.md#open-questions-and-verification), [the Captions panel](panels/the-captions-panel.md#open-questions-and-verification), [client-side export](output/client-side-export.md#open-questions-and-verification)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): INPUT-29, INPUT-30, INPUT-76 to INPUT-80, WORKSPACE-42, CREATEDUP-25, CREATEDUP-40, COMPSETTINGS-22, COMPSETTINGS-44, CAPTIONS-37, PROPFIELDS-28, PROPFIELDS-37, and OMNIBAR-70. The same behavior was also the expected result of ASSETPANEL-58, ASSETACTIONS-68, CAPTIONS-96, AUDIOMIXER-40, COMPONENTS-30, SERVERRENDER-64, and SERVERRENDER-83, which passed.

### B-05: With the player focused, keys act twice: once in the player, then again in Studio

- **Where the user meets it:** After any click on the composition, which gives the player keyboard focus until something else is focused.
- **What happens / what was expected:** J and L jump ten seconds and then start reverse or forward playback; Shift+L jumps ten seconds and toggles loop; K at the end jumps to frame 0; I and O set the composition's own range from the player's rule and Studio's from its own, so the two can differ; X clears the composition's range while Studio's markers still show; F, M, C, the digits, and Shift+D act on the hidden player. ? opens both the player's list and Studio's dialog, and the first Escape closes only the player's list. Expected: one action per key, Studio's.
- **Reproduce:** Click the composition of a connected Title explainer composition, then press L: the playhead jumps ten seconds and playback starts.
- **Why (from the code):** The player makes itself focusable and handles keys on its own element (`packages/player/src/index.ts` lines 2613 to 2616, and `handleKeydown` at lines 3235 to 3377); it stops Escape from going further when it closes one of its panels (lines 3237 to 3260). Studio's shortcuts are window listeners that act on the same key press (`packages/studio/src/hooks/useKeyboardShortcut.ts` lines 14 to 39). Nothing in Studio turns the player's keys off (`packages/studio/src/components/Stage/Stage.tsx` lines 156 to 166).
- **Severity:** `high`. One common action does two things at once.
- **Decision needed:** `fix`. Turn off the player's own key handling inside Studio, or have Studio ignore keys the player handled.
- **Raised by:** [the input model](foundations/input-model.md#keys-the-player-adds-when-it-has-keyboard-focus), [the input model](foundations/input-model.md#edge-cases), [the input model](foundations/input-model.md#open-questions-and-verification), [the playback range](playback/the-playback-range.md#edge-cases), [the playback range](playback/the-playback-range.md#open-questions-and-verification), [the stage view](stage/the-stage-view.md#open-questions-and-verification), [shortcuts and diagnostics](help/shortcuts-and-diagnostics.md#open-questions-and-verification)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): INPUT-61 (→ stepped two frames, Shift+→ twenty) and SHORTCUTS-57 (the first Escape closed only the player's list). INPUT-55 showed a form the entry does not describe: with the player focused at the last frame, Space went to frame 0 but stayed paused, because the player restarts and plays and Studio, already seeing it playing, pauses it. TRANSPORT-66 showed the same, and RANGE-48 and RANGE-49 had to start playback another way, since Space with the player focused changes nothing mid-way.

### B-78: Cancelling a server-side render stops the `helios studio` process

- **Where the user meets it:** Cancel on a rendering job in the Renders panel, or an agent's `cancel_render`.
- **What happens / what was expected:** The cancel is accepted, and about a second later the `helios studio` process exits: the terminal shows "Render aborted via signal. Killing FFmpeg..." and then an unhandled "page.evaluate: Target page, context or browser has been closed". Every open Studio tab loses its server until the process is started again. Expected: the render stops, the job reads CANCELLED, and the server keeps running.
- **Reproduce:** Start a render of a composition several seconds long and press Cancel while it reads RENDERING.
- **Why (from the code):** The cancel closes the render's browser while the capture loop is waiting on the page (`packages/renderer/src/core/CaptureLoop.ts` from line 118), and the resulting rejection is not caught on the way back through `packages/renderer/src/Renderer.ts` and `packages/studio/src/server/render-manager.ts`, so Node exits on it.
- **Severity:** `high`. A routine button stops the whole application.
- **Decision needed:** `fix`. Wait for the capture loop to stop before closing the browser, and treat the aborted capture as a cancellation.
- **Raised by:** the automated pass: [stage-and-output.md](verification/stage-and-output.md) (SERVERRENDER-25, SERVERRENDER-26), [help-and-cross-cutting.md](verification/help-and-cross-cutting.md) (OUTSIDE-44); described in [server-side renders](output/server-renders.md#cancel-and-interrupt)
- **Status:** found by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input), twice: Cancel in the Renders panel at 40% (SERVERRENDER-25, SERVERRENDER-26) and an agent's `cancel_render` at the start of a render (OUTSIDE-44). Both times the process exited and had to be started again. It happened again in SERVERRENDER-27, where, with Concurrency 4, the process stopped before it could clean up and left an empty `temp_…_part_1.mov` in `renders/`, and in SERVERRENDER-85, where a Delete pressed right after Cancel never reached a server (recorded `blocked`).

### B-81: Server-side renders ignore the input props

- **Where the user meets it:** "Start Render Job" in the Renders panel (and the Omnibar's Start Render) after changing a prop in the Props Editor, saved or not.
- **What happens / what was expected:** Studio sends the props with the request, but the video shows the composition's own props: a title changed to "RENDER PROPS" renders as the composition's default title. Expected: the video shows the props the preview shows, as the documents say.
- **Reproduce:** On a composition with a `title` prop, type a new title, press "Start Render Job", and look at the finished video.
- **Why (from the code):** `packages/renderer/src/core/BrowserPool.ts` lines 159 to 162 hand the props to the page only as `window.__HELIOS_PROPS__`, and nothing in Helios reads that name, so the composition starts with its own defaults.
- **Severity:** `high`. Silently renders something other than what the user set up.
- **Decision needed:** `fix`. Have Helios read the injected props when it starts, or set them through the instance once the page has loaded.
- **Raised by:** the automated pass: [stage-and-output.md](verification/stage-and-output.md) (SERVERRENDER-13, SERVERRENDER-66); described in [server-side renders](output/server-renders.md#starting)
- **Status:** found by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): SERVERRENDER-13 (the request carried "RENDER PROPS"; the video drew "Verify Driveable", although the composition's `composition.json` also held a saved title, "AAA", left by SERVERRENDER-66, so saved default props do not reach the video either) SERVERRENDER-66, and PROPSEDITOR-62 (the rendered video lacks the prop typed just before the render). The documents' sentences that say a render uses the current props are corrected.

### B-85: Client-side exports never contain audio

- **Where the user meets it:** Export in the Renders panel's Client-Side Export, on any composition with sound.
- **What happens / what was expected:** The video downloads with no audio stream at all, and no message says so; the browser's console shows "Failed to setup audio: TypeError: config.bitrate must be provided for compressed audio codecs." The Audio panel's volumes and mutes therefore have nothing to apply to. Expected: the composition's audio mixed in, as [client-side export](output/client-side-export.md#finishing) describes.
- **Reproduce:** Export a composition with an `<audio>` element (the protocol's Verify Audio) as WebM and probe the file: one VP9 stream, no Opus.
- **Why (from the code):** `packages/player/src/features/exporter.ts` lines 200 to 212 create the audio encoder source with only a codec (`{ codec: 'opus' }` or `{ codec: 'aac' }`); the media library refuses a compressed audio codec without a bitrate, and the `catch` turns that into a console warning and carries on without the audio track.
- **Severity:** `high`. Every client-side export silently loses its sound.
- **Decision needed:** `fix`. Pass a bitrate with the audio configuration, and report a failure to set up audio instead of dropping it.
- **Raised by:** the automated pass: [stage-and-output.md](verification/stage-and-output.md) (CLIENTEXPORT-12, CLIENTEXPORT-27); described in [client-side export](output/client-side-export.md#finishing)
- **Status:** found by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): CLIENTEXPORT-12 and CLIENTEXPORT-27. This Chromium can encode Opus but not AAC, so MP4 exports could not be tried at all (no H.264 either); the error is raised before any encoder is asked. CLIENTEXPORT-29, -49, -54, -64, and -67 were recorded `blocked` because of it.

### B-06: Dragging a time-prop marker throws away every other input prop

- **Where the user meets it:** The timeline, dragging the diamond of a time prop (a schema `number` with the format `time`).
- **What happens / what was expected:** On the first move every other prop is lost: a prop with a schema default goes back to it, a prop outside the schema disappears, and a required prop without a default makes every move fail. The Props Editor shows the reduced set and the auto-save writes it to `composition.json`. Expected: only the dragged prop changes.
- **Reproduce:** In a composition whose schema has a time prop and a text prop, change the text prop, then drag the time prop's diamond. The text prop goes back to its default.
- **Why (from the code):** `packages/studio/src/components/Timeline.tsx` lines 304 to 307 send `{ [draggingPropKey]: time }` alone; the drop handler at lines 243 to 250 spreads the current props, the marker drag does not. The composition replaces its whole set with what it is sent (`packages/core/src/Helios.ts` lines 681 to 683).
- **Severity:** `high`. Loses work, then saves the loss.
- **Decision needed:** `fix`. Send the current props with the dragged one changed.
- **Raised by:** [timeline tracks](playback/timeline-tracks.md#while-ongoing), [timeline tracks](playback/timeline-tracks.md#open-questions-and-verification)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): TRACKS-34, TRACKS-35, TRACKS-46, and PROPSEDITOR-61.

### B-07: Studio's transport and timeline cannot control a clock-bound composition, which is every template and nearly every example

- **Where the user meets it:** Every composition made from a Studio template, and every example in `examples/` that connects. (`lottie-animation` and `dom-benchmark` are the only examples that are not clock-bound, and neither connects.)
- **What happens / what was expected:** Read from the code, the composition takes its frame from the browser's document clock on every animation frame. It runs on its own from the moment it loads, whether Studio shows it playing or paused; seeks, frame steps, Home, the timecode field, and the remembered playhead hold for at most one frame; the playback range, loop, and rate have no effect. Expected: Studio's transport drives the preview.
- **Reproduce:** Open `simple-canvas-animation`. Press ❚❚ or drag the playhead; the animation keeps moving and the timecode keeps counting.
- **Why (from the code):** `bindToDocumentTimeline` in `packages/core/src/Helios.ts` lines 1085 to 1158 polls `document.timeline.currentTime` every animation frame and sets the current frame from it, and `onTick` does nothing while bound (lines 1214 to 1216). Every template calls it: `packages/studio/src/server/templates/vanilla.ts` lines 35 to 36, `title-explainer.ts` lines 18 to 20, `react.ts` lines 33 to 34, `threejs.ts` lines 50 to 51, `vue.ts` lines 38 to 39, `svelte.ts` lines 43 to 48, `solid.ts` lines 33 to 39. Neither the player nor Studio unbinds when it takes control.
- **Severity:** `high`. Affects every playback feature on every template and on every example Studio can connect to.
- **Decision needed:** `fix`. Follow the document clock only while a renderer drives it, or unbind when the player connects.
- **Raised by:** [the preview player](foundations/the-preview-player.md#clock-bound-compositions), [the preview player](foundations/the-preview-player.md#open-questions-and-verification), [the transport controls](playback/the-transport-controls.md#open-questions-and-verification), [the timeline](playback/the-timeline.md#open-questions-and-verification), [the playback range](playback/the-playback-range.md#open-questions-and-verification), [client-side export](output/client-side-export.md#open-questions-and-verification), [snapshots and job specs](output/snapshots-and-job-specs.md#open-questions-and-verification), [composition settings](compositions/composition-settings.md#open-questions-and-verification)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input), the first thing it checked: PLAYER-43 to PLAYER-46, TRANSPORT-02, TIMELINE-82, and RANGE-66. On Verify Title and on unmodified `simple-canvas-animation` the frame ran in real time from the composition's own clock whatever Studio did: ▶ shown, seeks, steps, the range, loop, and rate held for a moment at most. PLAYER-49 passed on the copy without `bindToDocumentTimeline()`, so the playback items ran on such copies.

### B-08: Switching compositions carries the previous composition's input props, playhead, and playing state into the new one

- **Where the user meets it:** Opening another composition (the Compositions panel, the Omnibar, New Composition, Duplicate) while a connected one is open.
- **What happens / what was expected:** The new composition's first connection is treated as a hot reload: it receives the previous composition's input props, is sought to its frame, and starts playing if it was playing. Its own default props are never applied, and the auto-save then writes the carried props into its `composition.json`. If the new composition refuses the carried props, nothing else is restored either. Expected: a fresh open with the new composition's default props and remembered playhead.
- **Reproduce:** Open a Title explainer composition, change its title prop, and play. Create another Title explainer composition. It opens playing, at the old frame, with the first one's title, and a few seconds after pausing its `composition.json` holds that title.
- **Why (from the code):** In `packages/studio/src/components/Stage/Stage.tsx`, the tracking effect (lines 36 to 45) runs with the new `src` while the old controller is still set, recording the old frame, playing state, and props under the new address. The connection check (lines 68 to 81) then finds a matching address and restores them; the default-props branch (lines 83 to 90) never runs. The restore is one `try`, so a refused `setInputProps` skips the seek and play too. `PropsEditor.tsx` lines 48 to 71 save the result.
- **Severity:** `high`. Silently writes one composition's props into another's file.
- **Decision needed:** `fix`. Record and restore state only for the composition it came from.
- **Raised by:** [the preview player](foundations/the-preview-player.md#switching-compositions), [the preview player](foundations/the-preview-player.md#open-questions-and-verification), [creating and duplicating](compositions/creating-and-duplicating.md#open-questions-and-verification), [the Compositions panel](compositions/the-compositions-panel.md#interactions-with-other-systems), [the Omnibar](compositions/the-omnibar.md#interactions-with-other-systems)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): PLAYER-67 to PLAYER-70, PLAYER-72 to PLAYER-74, COMPOSPANEL-65, CREATEDUP-42, and OMNIBAR-68.

### B-74: Studio serves composition pages untouched, so the Title explainer template never connects and nothing hot reloads

- **Where the user meets it:** Every composition, because the player loads each one from a `/@fs/` address. Most visibly, a composition made with New Composition's Title explainer template, and any edit saved to a composition's files.
- **What happens / what was expected:** The page arrives exactly as it is on disk, without the development server's processing. An inline module script that imports a package by its bare name, as the Title explainer template's does (`import { Helios } from '@helios-project/core'`), stops with "Failed to resolve module specifier", so the player shows "Connection Failed..." after 5 seconds and the transport stays disabled. The page also gets no hot-reload client, so saving `composition.html` or a script it loads reloads nothing: the terminal prints "page reload", but the composition runs the old code until the Studio page is reloaded. Expected: Studio's own default template connects, and a saved change reloads the composition, as the documents describe.
- **Reproduce:** Create a composition from Title explainer; it ends on "Connection Failed...". Or open `simple-canvas-animation`, append a comment to its `composition.html`, and save; the player does not reload.
- **Why (from the code):** `packages/studio/src/server/discovery.ts` lines 97 to 99 give every composition the address `/@fs` plus its absolute path, which Vite's development server answers straight from the file system, skipping its HTML transform (no rewritten imports in inline scripts, no `/@vite/client`). `packages/studio/src/server/templates/title-explainer.ts` lines 12 and 13 import Helios by its package name in an inline script. A script loaded with `src` is still transformed, which is why the pass's copies of the Title explainer compositions, with the script moved into `main.js`, connect; and a script that uses `import.meta.hot` gets the client and does reload.
- **Severity:** `high`. The default way to make a composition gives one Studio cannot control, and hot reload, which many documents rely on, never happens.
- **Decision needed:** `fix`. Serve composition pages through the development server's HTML transform, for example by addressing them from the project root rather than by `/@fs/`, or make the templates load their script from a file.
- **Raised by:** the automated pass: [foundations.md](verification/foundations.md) (PROJECT-39, PLAYER-50), [compositions-and-props.md](verification/compositions-and-props.md) (CREATEDUP-03, CREATEDUP-16), [help-and-cross-cutting.md](verification/help-and-cross-cutting.md) (OUTSIDE-01, OUTSIDE-03); described in [the preview player](foundations/the-preview-player.md#hot-reload) and [project and compositions](foundations/project-and-compositions.md#templates)
- **Status:** found by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): PROJECT-39, PROJECT-41, PLAYER-50, CREATEDUP-03, CREATEDUP-16, CREATEDUP-55, CREATEDUP-56, OUTSIDE-01, and OUTSIDE-03; also PLAYER-27 (the inline script never runs, so editing it changes nothing), and OMNIBAR-57, SERVERRENDER-02, SERVERRENDER-33, and SERVERRENDER-65, where a server-side render of a composition with such a script fails with "Failed to resolve module specifier". Every item that needs a hot reload is recorded `blocked`; where the pass could, it reran the item on a fixture whose script carries an `import.meta.hot` line and recorded what it saw in the note.

### B-09: The Props Editor's auto-save never comes while playing or for a clock-bound composition

- **Where the user meets it:** Changing input props in the Props Editor, or by dragging a time-prop marker or dropping an asset on the timeline.
- **What happens / what was expected:** The save waits for one second in which nothing in Studio redraws. Paused, it comes one to a few seconds after the last edit; while playing, and always for a clock-bound composition ([B-07](#b-07-studios-transport-and-timeline-cannot-control-a-clock-bound-composition-which-is-every-template-and-nearly-every-example)), it never comes, and the edits are lost on reload. A failing save repeats its error toast about every second. Expected: a save about a second after the props stop changing.
- **Reproduce:** Play a connected Title explainer composition, change a prop, keep playing, and reload. The change is gone.
- **Why (from the code):** The timer effect in `packages/studio/src/components/PropsEditor.tsx` lines 48 to 71 depends on `updateCompositionMetadata`, which `packages/studio/src/context/StudioContext.tsx` line 431 creates anew on every render, and on `inputProps`, which every state report replaces. Studio renders at least once a second for the render-job poll (lines 711 to 716) and on every frame while playing (`packages/studio/src/App.tsx` lines 46 to 48), so the one-second timer is cleared before it fires.
- **Severity:** `high`. Loses work.
- **Decision needed:** `fix`. Restart the timer only when the props change (memoize the save function and compare by value).
- **Raised by:** [project and compositions](foundations/project-and-compositions.md#composition-metadata), [project and compositions](foundations/project-and-compositions.md#open-questions-and-verification), [the Props Editor](props/the-props-editor.md#while-ongoing), [the Props Editor](props/the-props-editor.md#open-questions-and-verification), [timeline tracks](playback/timeline-tracks.md#cancel-and-interrupt)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): no save while playing or for a clock-bound composition (PROJECT-31, PROJECT-32, PROPSEDITOR-21, PROPSEDITOR-22, PROPSEDITOR-48). Paused, the save is slower than this entry says: edits were saved between about 4 and more than 30 seconds after the last keystroke (PROJECT-30, PROPSEDITOR-04, PROPSEDITOR-20; 9 to 18 seconds in several other items), because the one-second quiet time is also broken by Studio's own redraws, such as the render jobs poll every second. A failing save repeated its toast 3 to 11 seconds apart, not every second (PROJECT-17). A time-prop drag on the timeline was saved 18 to 31 seconds after the release (TRACKS-38, TRACKS-39, TRACKS-50, TRACKS-52). Other saves came 13 to 25 seconds after the last change (PROPSEDITOR-18, STAGETOOLBAR-23, STAGETOOLBAR-81, PROJECT-33, PROJECT-78). With the server stopped, the failing save repeated 1 to 2 seconds apart (PROPSEDITOR-28).

### B-10: A pending auto-save is written into the composition being opened instead of the one that was edited

- **Where the user meets it:** Changing a prop and opening another composition before the auto-save has run.
- **What happens / what was expected:** The edited composition's change is never saved. The wait starts again, and the edited props are written into the composition being opened: after a quiet second before it connects (always, for one that never connects), or after [B-08](#b-08-switching-compositions-carries-the-previous-compositions-input-props-playhead-and-playing-state-into-the-new-one) carries them over. Expected: the pending save goes to the composition that was edited.
- **Reproduce:** Change a prop on a Title explainer composition and, within a second, open a Vanilla JS composition. The first composition's file is unchanged; the second one's `composition.json` now holds the first one's props.
- **Why (from the code):** `packages/studio/src/components/PropsEditor.tsx` lines 48 to 71 read the active composition when the timer fires, not when the props changed, and the effect keeps running while the editor shows "No active controller" (the early return is at lines 93 to 95). Studio never clears the props it last saw when the composition changes (`packages/studio/src/context/StudioContext.tsx` lines 232 to 243 and 648 to 653).
- **Severity:** `high`. Loses one composition's edit and writes it into another.
- **Decision needed:** `fix`. Bind each pending save to the composition whose props changed, and flush or drop it on a switch.
- **Raised by:** [the Props Editor](props/the-props-editor.md#cancel-and-interrupt), [the Props Editor](props/the-props-editor.md#open-questions-and-verification)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): PROPSEDITOR-51 and PROPSEDITOR-50 (Schema Check's props, its edited `titleIn` included, were written into Verify Unbound's file). COMPOSPANEL-57 shows the same save without any edit: with the server stopped, opening Lottie Animation from Simple Canvas Animation brought red "Failed to fetch" toasts, in pairs, about every second from 1.2 seconds after the click, as the auto-save tried to write the props Studio last saw into the composition being opened.

### B-11: A pan that starts and ends on the composition toggles playback, and one that starts and ends on a toolbar button presses it

- **Where the user meets it:** Panning the stage by grabbing the picture, or starting a pan on the stage toolbar.
- **What happens / what was expected:** The browser fires a click because the press and release landed on the same element, so the player toggles playback (and takes keyboard focus, see [B-05](#b-05-with-the-player-focused-keys-act-twice-once-in-the-player-then-again-in-studio)); a pan started and ended on + also zooms in; selecting the number in a size field pans the composition. Expected: a press that moved is a pan and nothing else.
- **Reproduce:** Press on the composition, drag, and release on it. Playback starts or stops.
- **Why (from the code):** `packages/studio/src/components/Stage/Stage.tsx` lines 114 to 132 start a pan on any left or middle press inside the stage container (lines 139 to 147), which also holds the toolbar (lines 185 to 197), and do not suppress the click that follows. The player's click layer toggles playback on every click (`packages/player/src/index.ts` lines 1935 to 1938).
- **Severity:** `high`. One common action does two things at once.
- **Decision needed:** `fix`. Swallow the click after a press that moved, and do not start a pan from the toolbar.
- **Raised by:** [the stage view](stage/the-stage-view.md#edge-cases), [the stage view](stage/the-stage-view.md#open-questions-and-verification), [the input model](foundations/input-model.md#clicks-after-drags), [the preview player](foundations/the-preview-player.md#the-player-inside-the-stage), [the stage toolbar](stage/the-stage-toolbar.md#edge-cases)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): STAGEVIEW-31 and INPUT-16 (a 100 px pan that started and ended on the composition also started playback).

### B-12: Ctrl/Cmd and the wheel zoom the whole page as well as the stage

- **Where the user meets it:** Zooming the stage with Ctrl/Cmd and the wheel, or a trackpad pinch.
- **What happens / what was expected:** Read from the code, on Windows and Linux the browser also zooms the whole Studio page, and a pinch on a Mac may too. Expected: only the stage zooms.
- **Reproduce:** In Chromium on Windows or Linux, hold Ctrl and turn the wheel over the stage.
- **Why (from the code):** `packages/studio/src/components/Stage/Stage.tsx` lines 99 to 104 call `preventDefault()` in a React `onWheel` handler (line 146). React registers wheel listeners as passive, and the browser ignores `preventDefault()` in a passive listener.
- **Severity:** `high`. One common action does two things at once.
- **Decision needed:** `fix`. Add a non-passive wheel listener to the stage element directly.
- **Raised by:** [the stage view](stage/the-stage-view.md#modifiers), [the stage view](stage/the-stage-view.md#open-questions-and-verification)
- **Status:** Cause confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input), effect not observed: Chromium logged "Unable to preventDefault inside passive event listener invocation" at every Ctrl+wheel notch over the stage (STAGEVIEW-37), so Studio cannot stop the browser's zoom; scripted wheel events do not reach the browser's page zoom, so whether the page zooms needs a real wheel. STAGEVIEW-37 is recorded `blocked`.

## Medium

### B-13: Dropping several desktop files on the Assets panel uploads only the first

- **Where the user meets it:** Dragging several files from the desktop onto the Assets panel or a folder in it.
- **What happens / what was expected:** Read from the code, only the first file is uploaded; the rest are skipped without a message. The Upload button's picker uploads them all. Expected: every dropped file is uploaded.
- **Reproduce:** Drop three images on the panel at once. One appears.
- **Why (from the code):** `packages/studio/src/components/AssetsPanel/AssetsPanel.tsx` lines 69 to 72 read `e.dataTransfer.files` again on each pass of a loop that awaits each upload. Chromium empties a drop's file list once the drop event has returned, so after the first `await` the loop ends. The unit test passes because it uses a plain object.
- **Severity:** `medium`. Wrong but recoverable: the files can be dropped one at a time.
- **Decision needed:** `fix`. Copy the file list before the first `await`.
- **Raised by:** [the Assets panel](assets/the-assets-panel.md#becoming-ongoing), [the Assets panel](assets/the-assets-panel.md#edge-cases), [the Assets panel](assets/the-assets-panel.md#open-questions-and-verification)

### B-14: Uploading a file whose name already exists replaces the old file without asking

- **Where the user meets it:** Uploading `logo.png` into a folder that already has one.
- **What happens / what was expected:** The old file is replaced, with the usual success toast, and there is no undo. Either behavior is defensible: replacing is how a designer updates an asset; asking protects against an accident.
- **Reproduce:** Upload a file, then upload a different file with the same name into the same folder.
- **Why (from the code):** `packages/studio/src/server/plugin.ts` lines 667 to 677 open the target for writing without checking whether it exists.
- **Severity:** `medium`. The replaced file is gone for good, but the user chose the upload.
- **Decision needed:** `product call`. Replace silently (today), ask first, or keep both under different names. Asking costs a dialog on every intentional replacement.
- **Raised by:** [the Assets panel](assets/the-assets-panel.md#edge-cases), [the Assets panel](assets/the-assets-panel.md#open-questions-and-verification)

### B-15: A file whose name has characters outside Latin-1 cannot be uploaded

- **Where the user meets it:** Uploading `café-ñ.png` is fine; uploading a file named with characters outside Latin-1 (`标志.png`, an emoji) is not.
- **What happens / what was expected:** Read from the code, "Failed to upload asset", and nothing is sent. Expected: the file is uploaded under its name.
- **Reproduce:** Upload a file named `标志.png`.
- **Why (from the code):** `packages/studio/src/context/StudioContext.tsx` lines 256 to 269 send the file name in the `x-filename` request header; the browser refuses header values outside Latin-1 and `fetch` throws before sending.
- **Severity:** `medium`. A wrong result in an uncommon path.
- **Decision needed:** `fix`. Encode the name (for example with `encodeURIComponent`) and decode it on the server.
- **Raised by:** [the Assets panel](assets/the-assets-panel.md#open-questions-and-verification)

### B-73: The repository's `npm run build` fails because it never builds `packages/infrastructure`

- **Where the user meets it:** Not in Studio. A developer, or a tester following the [verification protocol](verification/README.md#how-to-run-a-pass), builds Helios from a fresh checkout with the root `npm run build` in order to run `helios studio`.
- **What happens / what was expected:** The root build builds the core, player, renderer, and Studio packages and then fails at the CLI with "Cannot find module '@helios-project/infrastructure' or its corresponding type declarations", so there is no `helios` command to start Studio with. Building `packages/infrastructure` and then `packages/cli` by hand (`npm run build -w packages/infrastructure`, `npm run build -w packages/cli`) completes it. Expected: the root build builds every package the CLI needs, in order. This is a developer-facing build-order defect, not a Studio behavior, and no feature document raises it.
- **Reproduce:** In a fresh checkout at this commit, `npm install`, then `npm run build`.
- **Why (from the code):** The root `package.json` (line 20) builds `packages/core`, `packages/player`, `packages/renderer`, `packages/studio`, and `packages/cli` in that order and never `packages/infrastructure`, while `packages/cli/package.json` (line 42) depends on `@helios-project/infrastructure` and `packages/cli/src/commands/job.ts` (line 5) imports it; the infrastructure package's types come only from its own build (`packages/infrastructure/package.json`, `"build": "tsc"`).
- **Severity:** `medium`. Nothing is lost and the workaround is two commands, but the documented build of a fresh checkout fails outright.
- **Decision needed:** `fix`. Add `npm run build -w packages/infrastructure` before the CLI in the root build script, or build every workspace in dependency order.
- **Raised by:** [the verification protocol](verification/README.md#how-to-run-a-pass)
- **Status:** confirmed at commit `c2bfddb` by running the protocol's build: the root `npm run build` stopped at the CLI with that error, and the two extra commands completed it. No checklist item covers it.

### B-16: Composition Settings refills itself while open, discarding edits, and shows leftover numbers for a composition without `composition.json`

- **Where the user meets it:** Composition Settings, editing the name or numbers.
- **What happens / what was expected:** Whenever Studio's copy of the active composition changes while the dialog is open ("Set from Current Frame" finishing, a Props Editor auto-save, choosing a composition from the Omnibar), the fields are filled in again and unsaved edits are lost. For a composition without `composition.json` the number boxes keep whatever the dialog last held, including numbers typed and cancelled for another composition, and Save writes them into a new file. Expected: the dialog fills once when opened, and shows the composition's real values or empty boxes.
- **Reproduce:** Open Composition Settings, change the name, then press "Set from Current Frame". The name goes back.
- **Why (from the code):** `packages/studio/src/components/CompositionSettingsModal.tsx` lines 17 to 29 refill on every change of `activeComposition`, and set the numbers only when the composition has metadata; the numbers otherwise keep their previous state (lines 8 to 11).
- **Severity:** `medium`. Loses a few typed fields, and can write wrong numbers that the user saw before saving.
- **Decision needed:** `fix`. Fill the fields when the dialog opens, and reset them when there is no metadata.
- **Raised by:** [composition settings](compositions/composition-settings.md#while-ongoing), [composition settings](compositions/composition-settings.md#edge-cases), [composition settings](compositions/composition-settings.md#open-questions-and-verification)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): COMPSETTINGS-12, COMPSETTINGS-19, and COMPSETTINGS-20.

### B-17: New Composition accepts names whose folders Studio cannot list or name properly

- **Where the user meets it:** New Composition (and Duplicate) with the names "Build" or "Dist", or the Solid template with a name that has no letters or digits.
- **What happens / what was expected:** "Build" and "Dist" make the folders `build` and `dist`, which Studio never looks inside: the composition is written and opened, but it is not listed, and after a reload Studio no longer shows it. With Solid, "!!!" is not refused; it writes a folder named `-solid`, shown as " Solid". Expected: such names are refused with a message.
- **Reproduce:** Create a composition named "Build". Reload the page. It is gone from the Compositions panel, but the `build` folder is on disk.
- **Why (from the code):** `packages/studio/src/server/discovery.ts` line 316 (and 259 for Duplicate) builds the folder name without checking it against the folders the walk skips (line 23, applied at line 110). Lines 318 to 325 add `-solid` before the empty-name check.
- **Severity:** `medium`. A composition the user just made disappears.
- **Decision needed:** `fix`. Refuse names that map to a skipped folder, and check for an empty name before adding the suffix.
- **Raised by:** [creating and duplicating](compositions/creating-and-duplicating.md#edge-cases), [creating and duplicating](compositions/creating-and-duplicating.md#open-questions-and-verification)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): CREATEDUP-59 ("Build") and CREATEDUP-61 ("!!!" with Solid wrote `-solid`, shown " Solid").

### B-18: New Composition replaces all four numbers with defaults when any one of them is 0

- **Where the user meets it:** New Composition, after clearing a number box (it then holds 0).
- **What happens / what was expected:** The composition is created at 1920 by 1080, 30 FPS, and 5 seconds, whatever the other three boxes said. Meanwhile a negative width or a frame rate of 0.5 is written as typed. Expected: the typed numbers, with invalid ones refused.
- **Reproduce:** Set FPS to 60 and duration to 12, clear the Width box, and create. `composition.json` says 30 and 5.
- **Why (from the code):** `packages/studio/src/server/plugin.ts` lines 353 to 358 use the four numbers only if all are truthy; otherwise `createComposition` takes its defaults (`packages/studio/src/server/discovery.ts` lines 338 to 343). Nothing checks ranges.
- **Severity:** `medium`. A wrong result in an uncommon path.
- **Decision needed:** `fix`. Validate each number on its own and report the invalid one.
- **Raised by:** [creating and duplicating](compositions/creating-and-duplicating.md#edge-cases), [creating and duplicating](compositions/creating-and-duplicating.md#open-questions-and-verification)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): CREATEDUP-29.

### B-19: A composition at the project root cannot be saved, duplicated, deleted, or auto-saved

- **Where the user meets it:** A project with `composition.html` directly in its root.
- **What happens / what was expected:** The composition is listed and plays, but its ID is empty. Composition Settings' Save fails with "ID is required"; the Props Editor's auto-save fails with the same toast, repeating about every second while it is open; "Set from Current Frame" and 📝 do nothing; 📑 on its tile duplicates the active composition instead, and Duplicate does nothing at all when it is the active one; without `composition.json` its Omnibar description reads "undefinedxundefined @ undefinedfps". Expected: it behaves like any other composition, or Studio says it is not supported.
- **Reproduce:** Put a Title explainer's `composition.html` at the project root, open it, and change a prop.
- **Why (from the code):** `packages/studio/src/server/discovery.ts` lines 65 to 67 give it the ID `''`. `packages/studio/src/server/plugin.ts` lines 376 to 380 refuse an empty ID. `packages/studio/src/components/DuplicateCompositionModal.tsx` lines 22 and 46 fall back to the active composition with `||`. `packages/studio/src/components/Omnibar.tsx` line 134 falls back from the empty description to metadata that is absent. The repeating toast comes from [B-09](#b-09-the-props-editors-auto-save-never-comes-while-playing-or-for-a-clock-bound-composition).
- **Severity:** `medium`. An uncommon layout, but nothing about it works and the error repeats.
- **Decision needed:** `fix`. Give the root composition a non-empty ID such as `.`, or refuse to list it with a message.
- **Raised by:** [project and compositions](foundations/project-and-compositions.md#composition-ids-and-names), [project and compositions](foundations/project-and-compositions.md#open-questions-and-verification), [creating and duplicating](compositions/creating-and-duplicating.md#edge-cases), [creating and duplicating](compositions/creating-and-duplicating.md#open-questions-and-verification), [composition settings](compositions/composition-settings.md#edge-cases), [the Compositions panel](compositions/the-compositions-panel.md#edge-cases), [the Omnibar](compositions/the-omnibar.md#edge-cases), [the Omnibar](compositions/the-omnibar.md#open-questions-and-verification), [the Props Editor](props/the-props-editor.md#edge-cases)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input), in a root project (Studio started inside `verify-unbound`) and with a `composition.html` copied to the copy's root: PROJECT-16, PROJECT-17, COMPOSPANEL-74, COMPSETTINGS-74, CREATEDUP-68, and OMNIBAR-77 (bare root project, "undefinedxundefined @ undefinedfps"). Two details differ from the text: the auto-save's "ID is required" toast repeated 3 to 11 seconds apart, not every second; and 📑 on the root tile prefilled the root composition's own name ("Copy of Verify Unbound") while it copied the active one.

### B-82: Compositions made from the Vanilla JS, React, and Three.js templates never connect

- **Where the user meets it:** New Composition with the Vanilla JS template (the dialog's default), React, or Three.js, and an agent's `create_composition` without a template.
- **What happens / what was expected:** The composition loads, but the player never finds its Helios instance: "Connection Failed..." after 5 seconds, the transport disabled, no props. Expected: every template Studio offers makes a composition Studio can control.
- **Reproduce:** Create a composition with the default template and wait 6 seconds.
- **Why (from the code):** `packages/studio/src/server/templates/vanilla.ts`, `react.ts`, and `threejs.ts` create a Helios instance but neither set `window.helios` nor call `connectToParent`.
- **Severity:** `medium`. The dialog's default template gives a composition Studio cannot drive.
- **Decision needed:** `fix`. Expose the instance in all three templates, as Title explainer and Solid do.
- **Raised by:** [project and compositions](foundations/project-and-compositions.md#templates), [project and compositions](foundations/project-and-compositions.md#open-questions-and-verification)
- **Status:** confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): PROJECT-38, CREATEDUP-16, and OUTSIDE-37. The suspected defect was in the documents but had not been filed here.

### B-20: The Compositions panel cannot be used from the keyboard

- **Where the user meets it:** Tabbing through the Compositions panel.
- **What happens / what was expected:** Tiles and folder rows cannot take keyboard focus, so opening a composition or a folder needs the mouse. The 📝, 📑, and × buttons on each tile can take focus but stay invisible while they have it, and are labeled only by tooltips. Expected: tiles and folders reachable and operable from the keyboard, and focused buttons visible.
- **Reproduce:** Press Tab repeatedly in the panel; focus lands on buttons that cannot be seen.
- **Why (from the code):** Tiles and folder rows are plain elements with click handlers and no focusability (`packages/studio/src/components/CompositionsPanel/CompositionItem.tsx` lines 22 to 25, `CompositionTree.tsx` line 88). The buttons are hidden with opacity and shown only on hover (`CompositionsPanel.css` lines 130 to 147).
- **Severity:** `medium`. An accessibility gap; the Omnibar is a keyboard route to open a composition.
- **Decision needed:** `fix`. Make tiles and folders buttons, and show the actions on focus as well as hover.
- **Raised by:** [the Compositions panel](compositions/the-compositions-panel.md#interactions-with-other-systems), [the Compositions panel](compositions/the-compositions-panel.md#open-questions-and-verification)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): COMPOSPANEL-68.

### B-21: Renders started by an agent and from the Renders panel use different frame rates and lengths

- **Where the user meets it:** An agent connected to Studio's MCP server starts a render of a composition that the user also renders from the Renders panel.
- **What happens / what was expected:** The agent's render uses the frame rate and duration in `composition.json`, or 30 frames per second and 10 seconds when the file has none. The Renders panel uses the composition's own frame rate and duration. The two can render different lengths of the same composition. Expected: the same composition renders the same way from both.
- **Reproduce:** Give a composition a `composition.json` whose `duration` differs from its code's; render it from the Renders panel and through the MCP render tool.
- **Why (from the code):** `packages/studio/src/server/mcp.ts` lines 157 to 160 take `fps` and `duration` from the metadata; `packages/studio/src/server/render-manager.ts` lines 289 to 290 default to 30 and 10. `packages/studio/src/context/StudioContext.tsx` line 722 sends the player's values.
- **Severity:** `medium`. An inconsistency between two features that should match.
- **Decision needed:** `fix`. Pick one source of truth for a render's frame rate and length.
- **Raised by:** [changes from outside Studio](cross-cutting/changes-from-outside-studio.md#open-questions-and-verification)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): OUTSIDE-41 (the panel's render of `simple-canvas-animation` had 150 frames, the agent's 300).

### B-22: System Diagnostics reports a capable server renderer as unable to do anything

- **Where the user meets it:** System Diagnostics, the server column.
- **What happens / what was expected:** After a successful check the column shows ✗ on all three rows and an empty user agent. Expected: the server browser's real capabilities.
- **Reproduce:** Open System Diagnostics on a machine where renders work.
- **Why (from the code):** `packages/studio/src/components/DiagnosticsModal.tsx` lines 98 to 103 read `webCodecs`, `waapi`, `offscreenCanvas`, and `userAgent` from the top level of the answer, but the renderer answers `{ browser: {...}, ffmpeg: {...} }` (`packages/renderer/src/core/Diagnostics.ts` lines 27 to 30). The test mocks a flat answer.
- **Severity:** `medium`. A wrong result that sends the user looking for a problem that is not there.
- **Decision needed:** `fix`. Read the fields from `browser`, and update the test's mock.
- **Raised by:** [shortcuts and diagnostics](help/shortcuts-and-diagnostics.md#the-simple-case), [shortcuts and diagnostics](help/shortcuts-and-diagnostics.md#open-questions-and-verification)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): SHORTCUTS-11.

### B-23: The first diagnostics check or render on a machine without the renderer's Chromium freezes the Studio server while it downloads

- **Where the user meets it:** Opening System Diagnostics, or starting a first render, on a fresh machine.
- **What happens / what was expected:** Read from the code, the server downloads Chromium synchronously and answers nothing else meanwhile: render progress stops, other requests wait, and hot reload pauses. Expected: the download runs in the background, with progress.
- **Reproduce:** On a machine without Playwright's browsers, open System Diagnostics and watch the Renders panel or try any other action.
- **Why (from the code):** `packages/renderer/src/core/launchBrowser.ts` line 56 runs the installer with `spawnSync` in the server process.
- **Severity:** `medium`. Wrong but recoverable; it happens once per machine.
- **Decision needed:** `fix`. Install asynchronously and report progress.
- **Raised by:** [shortcuts and diagnostics](help/shortcuts-and-diagnostics.md#while-ongoing), [shortcuts and diagnostics](help/shortcuts-and-diagnostics.md#open-questions-and-verification)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): SHORTCUTS-40. With `PLAYWRIGHT_BROWSERS_PATH` pointing at an empty folder, 🩺 made the server download Chrome Headless Shell and Playwright's FFmpeg (8 seconds, 265 MB, here); a second tab's reload and a `/api/compositions` request waited until the download ended.

### B-24: The Helios Assistant's Documentation tab finds almost none of the documentation

- **Where the user meets it:** The Helios Assistant's Documentation tab, and the documentation part of a built prompt.
- **What happens / what was expected:** Read from the code, in an ordinary project only the project's own `README.md` is listed: no package README and no "Agent Skill:" section ever appears. Expected: the core, studio, renderer, and player READMEs and the agent skills.
- **Reproduce:** Run `helios studio` in `examples/` and open the Documentation tab. Only the eight sections of `examples/README.md` appear.
- **Why (from the code):** `packages/studio/src/server/documentation.ts` lines 58 to 68 resolve each package's `package.json`, which every Helios package hides behind its `exports` field, so the lookup fails silently; lines 16 to 22 recognize the repository only from its root or two folders below it. Lines 117 to 138 look for `core`, `studio`, `renderer`, `player`, and `cli` skills under `.agents/skills/helios`, which holds none of them; the copy bundled with the CLI holds only `make-video`.
- **Severity:** `medium`. The tab's main content is missing.
- **Decision needed:** `fix`. Resolve READMEs from the package entry point's folder, and point the skills lookup at where the skills live.
- **Raised by:** [the Helios Assistant](help/the-assistant.md#what-the-prompt-contains), [the Helios Assistant](help/the-assistant.md#open-questions-and-verification)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): ASSISTANT-22 and ASSISTANT-26.

### B-25: Studio's letter shortcuts also fire with Ctrl/Cmd held, on top of the browser's own shortcut

- **Where the user meets it:** Pressing a browser shortcut such as Ctrl+L (address bar), Ctrl+O (open file), Ctrl+J (downloads), or Ctrl/Cmd+K, with focus outside a text field.
- **What happens / what was expected:** Studio's shortcut for the letter acts as well: Ctrl+L plays forward, Ctrl+O sets the out point, Ctrl+J plays in reverse, Ctrl/Cmd+K pauses as well as opening the Omnibar. Expected: a shortcut with Ctrl/Cmd held is left to the browser, except Ctrl/Cmd+K.
- **Reproduce:** With a connected composition paused, press Ctrl+L. Playback starts as the address bar takes focus.
- **Why (from the code):** `packages/studio/src/hooks/useKeyboardShortcut.ts` lines 26 to 30 check modifiers only when `ctrlOrCmd` is asked for, and otherwise compare the key alone; the K pause shortcut (`packages/studio/src/components/GlobalShortcuts.tsx` lines 90 to 93) therefore fires with Ctrl/Cmd+K.
- **Severity:** `medium`. Two actions at once, but on keys users press for the browser rather than for Studio.
- **Decision needed:** `fix`. Skip letter shortcuts when Ctrl, Cmd, or Alt is held.
- **Raised by:** [the input model](foundations/input-model.md#modifier-keys), [the input model](foundations/input-model.md#open-questions-and-verification)
- **Status:** Confirmed for Studio's side by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): TRANSPORT-59, INPUT-94, INPUT-95, and RANGE-45, whose expected results are this behavior, passed: Ctrl+L played forward, Ctrl+J in reverse, and Ctrl+I and Ctrl+O set the points. Whether the browser also ran its own shortcut cannot be seen from a script.

### B-26: A desktop file dropped outside a drop target replaces Studio in the tab

- **Where the user meets it:** Dragging a file from the desktop toward the Assets panel and letting go over the stage, the header, or another panel.
- **What happens / what was expected:** Read from the code, the browser opens the file in place of Studio. Open dialogs, a client-side export in progress, and unsaved props are lost. Expected: a drop outside a target does nothing.
- **Reproduce:** Drag an image from the desktop and drop it on the stage.
- **Why (from the code):** Only the Assets panel, the timeline, and Props Editor fields cancel the browser's default for drops; nothing in `packages/studio/src/App.tsx` or elsewhere does so for the rest of the page.
- **Severity:** `medium`. Recoverable with Back, but loses what was only on the page.
- **Decision needed:** `fix`. Cancel `dragover` and `drop` for files on the whole window.
- **Raised by:** [the input model](foundations/input-model.md#drag-and-drop), [the input model](foundations/input-model.md#open-questions-and-verification), [the Assets panel](assets/the-assets-panel.md#cancel-and-interrupt)

### B-27: Client-side exports draw each caption one frame late

- **Where the user meets it:** Exporting a composition with captions from the Renders panel.
- **What happens / what was expected:** Each captured frame carries the captions of the frame before it, so every cue appears and disappears one frame late. Expected: the captions of the frame captured.
- **Reproduce:** Export a composition whose first cue starts at a known frame and step through the video.
- **Why (from the code):** `captureFrame` in `packages/player/src/controllers.ts` lines 177 to 181 reads the active captions before seeking to the frame it captures.
- **Severity:** `medium`. A wrong result in the output.
- **Decision needed:** `fix`. Read the captions after the seek has settled.
- **Raised by:** [client-side export](output/client-side-export.md#open-questions-and-verification)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): CLIENTEXPORT-63 (exported as WebM; this Chromium has no H.264 encoder).

### B-28: A client-side export keeps running against a composition that was switched away

- **Where the user meets it:** Opening another composition while a client-side export runs.
- **What happens / what was expected:** Read from the code, the export keeps addressing the replaced player: it fails with "Frame {n} missing during export.", or captures Studio's own page (in DOM mode) or Studio's own waveform drawing (in Canvas mode, with an audio lane showing). Expected: the export is cancelled when its composition goes away, or switching is held off.
- **Reproduce:** Start an export in DOM mode and open another composition from the Omnibar.
- **Why (from the code):** `packages/studio/src/context/StudioContext.tsx` line 848 binds the exporter to the controller at the start. In `packages/player/src/controllers.ts` lines 189 to 206 the capture falls back to Studio's own `document` when the old frame has no document any more.
- **Severity:** `medium`. A wrong result in an uncommon path.
- **Decision needed:** `fix`. Abort the export when the controller changes, and never fall back to the host page.
- **Raised by:** [client-side export](output/client-side-export.md#cancel-and-interrupt), [client-side export](output/client-side-export.md#open-questions-and-verification)
- **Status:** Confirmed in part by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): CLIENTEXPORT-46. In Canvas mode, after another composition was opened, the export never ended: Cancel stayed for 90 seconds, with no toast and no file. Neither of the outcomes this entry reads from the code (the "missing during export" error, or Studio's own drawing captured) was seen. DOM mode could not be tried, because DOM-mode exports fail at their first frame in this Chromium ([B-86](#b-86-snapshots-and-client-side-exports-in-dom-mode-fail-in-chromium)).

### B-29: Client-side export ignores the Video Codec setting and turns a decimal bitrate into 5 megabits per second

- **Where the user meets it:** The render settings shared by "Start Render Job" and the client-side Export button.
- **What happens / what was expected:** The export's codec follows only the MP4 or WebM choice; the Video Codec setting is ignored. A bitrate such as `2.5M` does not match and silently becomes the default of 5 megabits per second. Expected: the settings apply, or the panel says which ones do not.
- **Reproduce:** Set Video Bitrate to `2.5M` and export; inspect the file's bitrate.
- **Why (from the code):** `packages/studio/src/context/StudioContext.tsx` lines 855 to 877 accept only whole numbers with an optional `k` or `m` and pass no codec; `packages/player/src/features/exporter.ts` line 191 falls back to 5,000,000.
- **Severity:** `medium`. Silently differs from the settings, though the video is valid.
- **Decision needed:** `fix`. Parse decimals, pass the codec or label the settings that apply only to server renders.
- **Raised by:** [client-side export](output/client-side-export.md#open-questions-and-verification)
- **Status:** Bitrate confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): CLIENTEXPORT-15 ("2.5M" gave 4.10 Mbps, the same as the default). The codec part could not be checked as written, because this Chromium cannot encode H.264 (CLIENTEXPORT-16, `blocked`; as WebM, "mpeg4" still gave VP9 with no message).

### B-86: Snapshots and client-side exports in DOM mode fail in Chromium

- **Where the user meets it:** 📷, or Export in Client-Side Export, with Mode set to DOM in the Renders panel, the mode a composition built from page elements rather than a canvas needs.
- **What happens / what was expected:** Nothing is captured. A snapshot gives no file and no toast; an export stops at its first frame with no file. The console shows "DOM capture failed: SecurityError: Failed to construct 'VideoFrame': VideoFrames can't be created from tainted sources." and, for an export, "Failed to capture first frame in mode: dom". Expected: a picture of the composition's page, as [snapshots](output/snapshots-and-job-specs.md#while-ongoing) and [client-side export](output/client-side-export.md#starting) describe.
- **Reproduce:** Open Simple Animation, set Mode to DOM in the Renders panel, and press 📷.
- **Why (from the code):** `packages/player/src/features/dom-capture.ts` lines 37 to 69 draw the page into an SVG image with a `<foreignObject>` and turn it into a bitmap; Chromium treats such an image as tainted, so `new VideoFrame(bitmap)` in `packages/player/src/controllers.ts` lines 193 to 196 throws. The snapshot path catches the error and logs it without a toast.
- **Severity:** `medium`. DOM mode in the browser is unusable; Canvas mode and server-side DOM renders still work.
- **Decision needed:** `fix`. Capture DOM pages another way (or report the failure), and show a toast when a snapshot fails.
- **Raised by:** the automated pass: [stage-and-output.md](verification/stage-and-output.md) (SNAPSPEC-14, CLIENTEXPORT-13, CLIENTEXPORT-21); described in [snapshots and job specs](output/snapshots-and-job-specs.md#while-ongoing)
- **Status:** found by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): SNAPSPEC-14, CLIENTEXPORT-13, CLIENTEXPORT-21, and CLIENTEXPORT-46 (DOM half).

### B-30: A render or job spec started before the composition's length is known covers zero frames

- **Where the user meets it:** "Start Render Job" or "Export Spec" on a first open of a composition with no remembered timeline state, before the player connects (the readout says "Range: 0 - 0"). Both buttons are enabled then.
- **What happens / what was expected:** The request asks for zero frames; the job spec is still reported as exported. Expected: the buttons wait for the length, or the request is refused with a message.
- **Reproduce:** Clear the browser's storage for Studio, reload, and press "Start Render Job" at once.
- **Why (from the code):** The out point is 0 until the length arrives (`packages/studio/src/context/StudioContext.tsx` lines 696 to 702); `startRender` and `exportJobSpec` (lines 718 to 743 and 896 to 919) send it anyway, and `packages/studio/src/server/render-manager.ts` lines 179 to 183 and 293 to 297 compute a duration of 0. The buttons are disabled only without a composition (`packages/studio/src/components/RendersPanel/RendersPanel.tsx` lines 83 and 90).
- **Severity:** `medium`. A wrong result in an uncommon path.
- **Decision needed:** `fix`. Disable both until the player has connected, and refuse an empty range on the server.
- **Raised by:** [server-side renders](output/server-renders.md#edge-cases), [server-side renders](output/server-renders.md#open-questions-and-verification), [snapshots and job specs](output/snapshots-and-job-specs.md#open-questions-and-verification)
- **Status:** Confirmed in part by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): in SERVERRENDER-65, a render started on a first open, before the composition's length was known, was sent for frames 0 to 0. It then failed for another reason ([B-74](#b-74-studio-serves-composition-pages-untouched-so-the-title-explainer-template-never-connects-and-nothing-hot-reloads)), so what a zero-frame render produces was not seen.

### B-31: The "Transparent (WebM)" preset writes an MP4 file with no transparency

- **Where the user meets it:** The Renders panel's Preset menu.
- **What happens / what was expected:** The preset sets the VP9 codec and DOM mode, but every render is written as `render-{id}.mp4` and no pixel format with an alpha channel is set, so read from the code the output has no transparency. Expected: a WebM file with alpha, as the name says.
- **Reproduce:** Choose the preset, render a composition with a transparent background, and inspect the file.
- **Why (from the code):** `packages/studio/src/components/RendersPanel/RenderConfig.tsx` line 23 sets only `mode` and `videoCodec`; `packages/studio/src/server/render-manager.ts` line 259 always names the output `.mp4`.
- **Severity:** `medium`. Silently differs from what the preset promises.
- **Decision needed:** `fix`. Set an alpha pixel format and a `.webm` output for this preset, or rename it.
- **Raised by:** [server-side renders](output/server-renders.md#the-render-settings), [server-side renders](output/server-renders.md#open-questions-and-verification)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): SERVERRENDER-45.

### B-32: A job spec does not reproduce "Start Render Job", and with a WebCodecs preference every chunk command fails

- **Where the user meets it:** "Export Spec" in the Renders panel, then running the commands with `helios render`.
- **What happens / what was expected:** The commands leave out the input props shown in the Props Editor, the Video Bitrate, and the Hardware Acceleration setting, all of which "Start Render Job" uses. Once a WebCodecs Preference is chosen, every chunk command carries `--webcodecs-preference`, an option `helios render` does not define, so read from the code each chunk stops with an unknown-option error. Expected: a job spec renders what "Start Render Job" would.
- **Reproduce:** Set a WebCodecs Preference, export a job spec, and run its first chunk command.
- **Why (from the code):** `packages/studio/src/server/render-manager.ts` lines 144 to 156 turn only size, frame rate, quality, mode, codecs, headless, and WebCodecs preference into flags, and lines 210 to 221 build the commands from them. `packages/cli/src/commands/render.ts` lines 55 to 75 define no option for props, bitrate, hardware acceleration, or WebCodecs preference.
- **Severity:** `medium`. A wrong or failing result in a path outside the main flow.
- **Decision needed:** `fix`. Add the missing options to `helios render` and emit them, or drop the unsupported flag.
- **Raised by:** [snapshots and job specs](output/snapshots-and-job-specs.md#while-ongoing), [snapshots and job specs](output/snapshots-and-job-specs.md#open-questions-and-verification)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): SNAPSPEC-23 (`--webcodecs-preference` refused as an unknown option) and SNAPSPEC-26 (no props in the spec).

### B-33: The Audio panel lists and controls tracks that the composition never applies the controls to

- **Where the user meets it:** The Audio panel with a composition whose `<audio>` or `<video>` elements are named by `id` or not named at all.
- **What happens / what was expected:** Read from the code, such tracks are listed and their slider, mute, and solo change what the panel shows and what a client-side export mixes, but not what is heard. Only elements with `data-helios-track-id` respond. Expected: every listed track responds, or only controllable tracks are listed.
- **Reproduce:** In a composition with an `<audio id="music">` element, mute "music" in the panel while playing.
- **Why (from the code):** `packages/player/src/features/audio-utils.ts` line 47 names a track by `data-helios-track-id`, then `id`, then position; `packages/core/src/drivers/DomDriver.ts` lines 407 to 412 apply a track's settings only by `data-helios-track-id`.
- **Severity:** `medium`. An inconsistency between the panel and the sound.
- **Decision needed:** `fix`. Use one naming rule in both places.
- **Raised by:** [the Audio mixer](panels/the-audio-mixer.md#what-the-panel-shows), [the Audio mixer](panels/the-audio-mixer.md#open-questions-and-verification)
- **Status:** Confirmed in part by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): in AUDIOMIXER-53 the panel's mutes reached only the element with `data-helios-track-id`; the `sfx` and unnamed elements were never muted. What is heard was not judged (AUDIOMIXER-12 was not run).

### B-34: Solo lives in the Audio panel and comes apart from the composition's mutes

- **Where the user meets it:** Soloing a track, then switching sidebar tabs, hot reloading, or switching compositions.
- **What happens / what was expected:** Hiding the panel forgets the solo but leaves the other tracks muted, with no S lit. A hot reload resets the mutes but leaves S lit and the other mute buttons disabled. After a switch no S is lit but every mute button is disabled. Expected: the solo and the mutes stay consistent.
- **Reproduce:** Solo a track, open the Assets tab, return to Audio. Every other track is muted and nothing shows why.
- **Why (from the code):** `packages/studio/src/components/AudioMixerPanel/AudioMixerPanel.tsx` lines 11 to 12 keep the solo and the saved mutes in the panel's own state, which is discarded when the panel is hidden and is not reset when the composition reloads or changes.
- **Severity:** `medium`. Wrong but recoverable by hand.
- **Decision needed:** `fix`. Keep the solo with the composition's audio state, or end it whenever the panel or the composition goes away.
- **Raised by:** [the Audio mixer](panels/the-audio-mixer.md#cancel-and-interrupt), [the Audio mixer](panels/the-audio-mixer.md#open-questions-and-verification)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): AUDIOMIXER-53 and AUDIOMIXER-55, and AUDIOMIXER-54 with a fixture that can hot reload. AUDIOMIXER-55 happens only when the switch keeps the Audio tab shown (through the Omnibar); opened from the Compositions tab, the panel is rebuilt and forgets the solo, mute buttons enabled.

### B-35: The Captions panel writes cues into a `captions` input prop for compositions connected through `connectToParent`

- **Where the user meets it:** Editing captions of a composition that connects through `connectToParent` without `window.helios`, such as the `client-export-api` example.
- **What happens / what was expected:** Read from the code, the panel sets an input prop named `captions` instead of the composition's captions, so the list does not change and, for a composition that is paused and not clock-bound, the auto-save writes the cues into `composition.json` as a prop. Expected: the composition's captions change.
- **Reproduce:** With such a composition, press + Add in the Captions panel.
- **Why (from the code):** `packages/studio/src/components/CaptionsPanel/CaptionsPanel.tsx` lines 50 to 57 call `setCaptions` only on a direct connection and otherwise set the prop, although the bridged connection could carry captions too.
- **Severity:** `medium`. A wrong result in an uncommon path.
- **Decision needed:** `fix`. Send the captions through the connection.
- **Raised by:** [the Captions panel](panels/the-captions-panel.md#finishing), [the Captions panel](panels/the-captions-panel.md#open-questions-and-verification)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): CAPTIONS-49 (`defaultProps.captions` written 12.9 seconds after the click).

### B-36: With a remote registry in the index format, every component shows "Installed"

- **Where the user meets it:** The Components panel with a registry address set.
- **What happens / what was expected:** Components from an index-format registry are listed without their files, and each shows "Installed" at once, so Install is never offered. Expected: Install for components that are not installed.
- **Reproduce:** Point the project configuration at an index-format registry and open the Components tab.
- **Why (from the code):** `packages/cli/src/commands/studio.ts` lines 81 to 89 call a component installed when every one of its files exists, which is true of an empty list.
- **Severity:** `medium`. The panel cannot install anything from such a registry.
- **Decision needed:** `fix`. Treat a component with no known files as not installed, or fetch its files first.
- **Raised by:** [the Components panel](panels/the-components-panel.md#edge-cases), [the Components panel](panels/the-components-panel.md#open-questions-and-verification)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): COMPONENTS-50.

### B-37: A component install reports success when the package manager fails

- **Where the user meets it:** Install or Update in the Components panel when the package manager's install fails.
- **What happens / what was expected:** The component's files are written and the panel reports success, although its dependencies were not installed. Expected: the failure is reported.
- **Reproduce:** Install a component while offline.
- **Why (from the code):** `packages/cli/src/utils/install.ts` lines 126 to 133 catch the package manager's failure, print it in the terminal, and carry on.
- **Severity:** `medium`. Silently reports success for a broken install.
- **Decision needed:** `fix`. Let the failure reach the request's answer.
- **Raised by:** [the Components panel](panels/the-components-panel.md#open-questions-and-verification)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): COMPONENTS-27 (with `npm_config_registry=http://127.0.0.1:9/`, npm's ECONNREFUSED in the terminal and a green `Component "progress-bar" installed` 71 seconds later). A package manager that cannot be started at all stops the server instead; see [B-79](#b-79-two-components-panel-failures-stop-the-helios-studio-process).

### B-79: Two Components panel failures stop the `helios studio` process

- **Where the user meets it:** The Components panel, when `helios.config.json` has become unreadable while Studio runs, or when the project's lockfile names a package manager that is not installed (an empty `bun.lockb` on a machine without Bun).
- **What happens / what was expected:** In the first case, opening the Components tab makes the server throw "Failed to parse helios.config.json: ..." outside any error handling and exit; the panel shows "No components found in registry.", and every later request fails ("Failed to fetch"). In the second, Install writes the component's files, then the server dies on an unhandled "spawn bun ENOENT"; no toast appears. Expected: an error message, and the server keeps running.
- **Reproduce:** In a project with a configuration, replace `helios.config.json`'s contents with `{` and open the Components tab. Or put an empty `bun.lockb` at the root of a project on a machine without Bun and press Install.
- **Why (from the code):** `packages/studio/src/server/plugin.ts` lines 121 to 128 call `onCheckInstalled` for every component with no `try`, and `packages/cli/src/utils/config.ts` throws on unreadable JSON. `packages/cli/src/utils/package-manager.ts` lines 51 to 62 spawn the package manager without listening for its `error` event.
- **Severity:** `medium`. Both need an unusual project, but both take the whole application down.
- **Decision needed:** `fix`. Catch both errors and answer the request with them.
- **Raised by:** the automated pass: [assets-and-panels.md](verification/assets-and-panels.md) (COMPONENTS-52, COMPONENTS-53); described in [the Components panel](panels/the-components-panel.md#edge-cases)
- **Status:** found by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): COMPONENTS-52 (the document had expected the panel to wait on "Loading registry..."; corrected) and COMPONENTS-53 (Bun removed from the server's `PATH`).

### B-38: The out point does not follow a change in the composition's length, and playback can run past the end

- **Where the user meets it:** Editing a composition's duration in its code, or opening a shorter composition with an out point left over (see [B-42](#b-42-after-a-switch-studio-goes-on-using-the-previous-compositions-length-frame-rate-props-playhead-and-schema)).
- **What happens / what was expected:** The out point is set from the length only while it is 0. A longer composition stays cut short at the old length for playback and renders. With an out point beyond the end and the in point above 0, the range is applied as it is, and playback goes past the composition's last frame, with the timecode counting beyond the length, until it reaches the out point. Expected: an out point that was at the end follows the end, and no range reaches past it.
- **Reproduce:** Set the in point at frame 30 on a 10-second composition whose out point is at its end, then shorten its duration in the code to 5 seconds and play.
- **Why (from the code):** `packages/studio/src/context/StudioContext.tsx` lines 696 to 702 set the out point only while it is 0; lines 782 to 797 clear the range only when the in point is 0. `packages/core/src/Helios.ts` lines 832 to 841 accept a range beyond the length, and `onTick` (lines 1242 to 1251) stops only at the range's end.
- **Severity:** `medium`. A wrong result after a common edit, recoverable by setting the points again.
- **Decision needed:** `fix`. Clamp the range to the length, and move an out point that was at the end when the length changes.
- **Raised by:** [the playback range](playback/the-playback-range.md#edge-cases), [the playback range](playback/the-playback-range.md#open-questions-and-verification)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): RANGE-64.

### B-39: Dragged in, out, and time-prop markers stick to their own position

- **Where the user meets it:** Dragging the in or out marker, or a time-prop diamond, slowly on the timeline.
- **What happens / what was expected:** The marker lags behind the pointer and moves in jumps of about 10 pixels, because the snap points include its own current position. Shift avoids it. Expected: the marker follows the pointer and snaps only to other things.
- **Reproduce:** Drag the out marker slowly to the left without Shift.
- **Why (from the code):** `getSnapFrame` in `packages/studio/src/components/Timeline.tsx` lines 167 to 200 snaps to the in point, the out point, and every time prop, including the one being dragged; the drag handler at lines 292 to 307 uses it for all three kinds of marker.
- **Severity:** `medium`. Wrong but workable with Shift.
- **Decision needed:** `fix`. Leave the dragged item out of the snap points.
- **Raised by:** [the playback range](playback/the-playback-range.md#edge-cases), [the playback range](playback/the-playback-range.md#open-questions-and-verification), [timeline tracks](playback/timeline-tracks.md#open-questions-and-verification)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): RANGE-20 and TRACKS-36, whose expected results are this behavior, passed: the out marker held "Out: 450" for the first 10 pixels and then moved in jumps of 10 to 11 pixels, and Title In did the same.

### B-40: A click on the composition within a frame of the end restarts from frame 0, even while playing

- **Where the user meets it:** Clicking the composition to pause during the last frame of playback, or pressing Space or K with the player focused at the end.
- **What happens / what was expected:** Playback restarts from frame 0 instead of pausing, and from frame 0 rather than the in point. With an in point set, ▶ (to the in point), Space (no restart), and a click (to frame 0) all disagree. Expected: a click while playing pauses, and a restart goes to the in point as ▶ does.
- **Reproduce:** Play to the last frame with loop off and click the composition just before it stops.
- **Why (from the code):** `togglePlayPause` in `packages/player/src/index.ts` lines 3082 to 3096 checks for the end before checking whether it is playing, and seeks to 0; the click layer calls it (lines 1935 to 1938).
- **Severity:** `medium`. Wrong in a narrow window, and inconsistent with the transport.
- **Decision needed:** `fix`. Pause when playing; restart from the playback range's start.
- **Raised by:** [the transport controls](playback/the-transport-controls.md#edge-cases), [the transport controls](playback/the-transport-controls.md#open-questions-and-verification), [the input model](foundations/input-model.md#keys-the-player-adds-when-it-has-keyboard-focus)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): TRANSPORT-83.

### B-41: A hot reload resets the playback rate, and refused props cancel the rest of the restore

- **Where the user meets it:** Saving a composition's code while it plays in reverse or faster than 1x, or after a code change that makes the composition refuse its current props.
- **What happens / what was expected:** Playback resumes at 1x forward. If the reloaded composition refuses the props, the playhead and playing state are not restored either. Expected: the rate is kept, and the frame and playing state are restored whatever happens to the props.
- **Reproduce:** Press L twice (2x), then save the composition's file.
- **Why (from the code):** `packages/studio/src/components/Stage/Stage.tsx` lines 33 to 45 record only the frame, playing state, and props, and lines 73 to 81 restore them inside one `try`, props first.
- **Severity:** `medium`. Wrong but recoverable with a key press.
- **Decision needed:** `fix`. Record and restore the rate, and restore each part separately.
- **Raised by:** [the transport controls](playback/the-transport-controls.md#open-questions-and-verification), [the preview player](foundations/the-preview-player.md#hot-reload), [the preview player](foundations/the-preview-player.md#open-questions-and-verification)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input) with a fixture that can hot reload (hot reload does not happen otherwise, [B-74](#b-74-studio-serves-composition-pages-untouched-so-the-title-explainer-template-never-connects-and-nothing-hot-reloads)): PLAYER-57 (the speed menu read 1x after the reload) and PLAYER-61 (refused props left it at frame 0, paused). Both are recorded `blocked` as written.

### B-75: Reverse playback freezes on a composition whose media Helios manages

- **Where the user meets it:** J, ⏪ in the speed menu, or the Omnibar, on a composition with `autoSyncAnimations` and `<audio>` or `<video>` elements, such as the protocol's Verify Media.
- **What happens / what was expected:** The speed menu shows the reverse rate and ❚❚ shows, but the playhead never moves: every frame the page throws "Failed to set the 'playbackRate' property on 'HTMLMediaElement'" for the negative rate, and the frame is not advanced. Expected: reverse playback moves the playhead backward, with the media paused or silent.
- **Reproduce:** Open Verify Media, press J (or choose ⏪ -1x) and watch the playhead.
- **Why (from the code):** `packages/core/src/drivers/DomDriver.ts` lines 512 to 514 copy the playback rate onto every managed media element; browsers refuse a negative `playbackRate` and throw.
- **Severity:** `medium`. A transport feature fails on exactly the compositions with sound, with no message.
- **Decision needed:** `fix`. Pause the media, or keep a rate of at least 0, while playing in reverse.
- **Raised by:** the automated pass: [foundations.md](verification/foundations.md) (INPUT-35, INPUT-58); described in [the transport controls](playback/the-transport-controls.md#edge-cases)
- **Status:** found by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): INPUT-35 and INPUT-58. Reverse playback works on Verify Unbound, which has no media.

### B-84: Zooming the timeline in widens the whole middle column instead of scrolling the track area

- **Where the user meets it:** The timeline's zoom slider, moved past the point where the timeline is wider than its panel (on a 20-second composition in a 1600-pixel window, from about step 18; on a 5-second one, past the middle).
- **What happens / what was expected:** The timeline does not scroll. The timeline panel grows to the timeline's full width, and the stage above it grows with it, since both share the layout's middle column: the inspector and the header's "In:", "Out:", and "Fr:" readouts are pushed off the right of the window, the page does not scroll to them, and the later part of the timeline cannot be brought into view by the scrollbar or the wheel. At the far right the column is about 15,000 pixels wide for 20 seconds. The zoom is remembered, so a reload keeps the layout broken until the slider goes back toward Fit. Expected: the track area scrolls inside a panel that keeps its width, as [the timeline](playback/the-timeline.md#zooming-the-timeline) describes the code's intent.
- **Reproduce:** Open a 20-second composition and move the timeline's zoom slider to the middle. The Props Editor leaves the window.
- **Why (from the code):** `packages/studio/src/components/Timeline.tsx` lines 88 to 89 and 386 give the timeline content a fixed pixel width when zoomed. Its container is a flex item with the default minimum width (`packages/studio/src/App.tsx` lines 115 to 118), and the layout's middle column is `1fr` (`packages/studio/src/components/Layout/StudioLayout.css` line 19), whose minimum is its content's width, so the content's width passes up to the column instead of overflowing the track area, which is the element that scrolls (`Timeline.css` lines 56 to 64). The same `1fr` minimum is behind [B-77](#b-77-the-stage-never-shrinks-below-about-938-pixels-pushing-the-inspector-off-a-narrow-window).
- **Severity:** `medium`. Zooming, the only way to see frames in detail on a long composition, breaks the layout and cannot show the end of the timeline; Fit still works.
- **Decision needed:** `fix`. Give the timeline's container and the middle column a minimum width of 0 (`min-width: 0`, `minmax(0, 1fr)`), so the track area scrolls.
- **Raised by:** the automated pass: [playback.md](verification/playback.md) (TIMELINE-36, TIMELINE-37), [foundations.md](verification/foundations.md) (INPUT-22); described in [the timeline](playback/the-timeline.md#zooming-the-timeline)
- **Status:** found by the automated pass of 2026-10-07 (Playwright driving headless Chromium 141 on Linux, with real mouse and keyboard input, and confirmed headed): TIMELINE-36, TIMELINE-37, and INPUT-22; TIMELINE-22 and TIMELINE-38 passed only because nothing scrolls.

### B-42: After a switch, Studio goes on using the previous composition's length, frame rate, props, playhead, and schema

- **Where the user meets it:** The moments after opening another composition, before it connects (for a composition that never connects, indefinitely), and for the schema, after.
- **What happens / what was expected:** Until the new composition connects: a render or job spec uses the previous composition's frame rate and input props; a composition with no remembered state gets its out point from the previous composition's length, which is then never corrected (switching from 10 seconds to 5 leaves "Out: 300" on a 150-frame composition, and a render covers 300 frames); the timeline keeps the previous composition's captions, markers, time props, and audio lanes; and the new composition's remembered timeline state is overwritten with the previous one's in point, out point, loop, and playhead position. The same early write happens when the page loads, with Studio's starting values: the record of the composition opened at load is overwritten with frame 0 until the next write after it connects, so a composition that never connects loses its remembered playhead position at every page load. After it connects, a composition without a schema keeps the previous one's: the Props Editor's labels, groups, fields, and Reset, the time-prop markers, and the Helios Assistant's prompt all use it. Expected: a switch starts from a clean state.
- **Reproduce:** Pause a connected composition at frame 40, open a Vanilla JS composition, and look at `helios-studio:timeline:{its ID}` in the browser's storage: it holds frame 40.
- **Why (from the code):** `packages/studio/src/context/StudioContext.tsx` never resets the player state when the active composition changes (lines 232 to 243; the switch at lines 648 to 653 only loads the timeline state). The save effects at lines 655 to 667 run under the new ID with the old values before the loaded ones apply. The out point is set from the stale length at lines 696 to 702. `packages/studio/src/App.tsx` lines 39 to 43 set the schema only when the new composition has one.
- **Severity:** `medium`. Wrong results after a switch, mostly corrected once the composition connects.
- **Decision needed:** `fix`. Reset the player state and schema on a switch, and do not save the timeline state until the new composition's has been loaded, on a switch or a page load.
- **Raised by:** [the playback range](playback/the-playback-range.md#edge-cases), [the playback range](playback/the-playback-range.md#open-questions-and-verification), [server-side renders](output/server-renders.md#edge-cases), [server-side renders](output/server-renders.md#open-questions-and-verification), [the Props Editor](props/the-props-editor.md#edge-cases), [the Props Editor](props/the-props-editor.md#open-questions-and-verification), [the Helios Assistant](help/the-assistant.md#modifiers), [the Helios Assistant](help/the-assistant.md#open-questions-and-verification), [timeline tracks](playback/timeline-tracks.md#edge-cases), [timeline tracks](playback/timeline-tracks.md#open-questions-and-verification)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): RANGE-39, RANGE-40, RANGE-41, RANGE-67, SERVERRENDER-66, SERVERRENDER-84, SNAPSPEC-41, CREATEDUP-54, PROPSEDITOR-69, TRACKS-46, and ASSISTANT-57. TIMELINE-63 and TRACKS-41 showed it on the timeline: after a tile switch from Drive Long, Drive Test's header read "Out: 600", and after Tracks Test, Slow Drive kept Tracks Test's cyan Title In diamond for good. In SNAPSPEC-41 the stale out point outlasted the connection: a job spec of Simple Canvas Animation, made after it connected, still covered Verify Driveable's 300 frames. In SERVERRENDER-66 the request carried the previous composition's frame rate, range, and props as described, but the video drew the composition's own title because server renders apply no props at all ([B-81](#b-81-server-side-renders-ignore-the-input-props)).

### B-43: Five requests report success without looking at the server's answer

- **Where the user meets it:** Uploading an asset, deleting an asset or folder, starting a render, cancelling a render, deleting a render job.
- **What happens / what was expected:** "Asset uploaded successfully", "Asset deleted", "Render started", "Render cancelled", or "Render job deleted" appears even when the server refused; only an unreachable server shows an error. A folder's delete also says "Asset deleted", and its own "Failed to delete folder" can never appear. Expected: the toast reflects the server's answer.
- **Reproduce:** Delete an asset that was already removed on disk: "Asset deleted" appears.
- **Why (from the code):** `packages/studio/src/context/StudioContext.tsx` lines 265 to 271, 280 to 284, 729 to 745, 754 to 756, and 765 to 767 never check `res.ok`, while rename, move, and new folder do (lines 299, 319, 342). `packages/studio/src/components/AssetsPanel/FolderItem.tsx` lines 65 to 73 wait for a failure that is never thrown.
- **Severity:** `medium`. Misleading, but nothing is lost by the message itself.
- **Decision needed:** `fix`. Check the answer and show the server's error, as rename and move do.
- **Raised by:** [project and compositions](foundations/project-and-compositions.md#when-a-request-fails), [project and compositions](foundations/project-and-compositions.md#open-questions-and-verification), [the input model](foundations/input-model.md#the-interrupt-rows), [asset actions](assets/asset-actions.md#cancel-and-interrupt), [asset actions](assets/asset-actions.md#open-questions-and-verification), [the Assets panel](assets/the-assets-panel.md#cancel-and-interrupt), [the Assets panel](assets/the-assets-panel.md#open-questions-and-verification), [server-side renders](output/server-renders.md#cancel-and-interrupt), [server-side renders](output/server-renders.md#open-questions-and-verification)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): PROJECT-59 and OUTSIDE-49 ("Asset deleted" after a DELETE answered 500), SERVERRENDER-59, and SERVERRENDER-81. In SERVERRENDER-59 the server answered 200 for a job that was already gone.

### B-44: The Props Editor's time field undoes a marker drag and never shows its error style

- **Where the user meets it:** A Props Editor time field (a schema `number` with the format `time`).
- **What happens / what was expected:** While the field has keyboard focus it does not follow a drag of its marker on the timeline (a press on the timeline does not take focus), and leaving the field afterwards commits the old time it still shows, undoing the drag. A time the field cannot read, or that the composition refuses, goes back without any sign: the red "invalid" style is cleared in the same update that sets it. Expected: the field follows outside changes until typed in, and a refusal is visible.
- **Reproduce:** Click into a time field, drag its diamond on the timeline, then click elsewhere. The diamond jumps back.
- **Why (from the code):** `packages/studio/src/components/Controls/TimecodeInput.tsx` lines 16 to 27 skip updates while editing and clear the error whenever editing ends; `commitChange` (lines 47 to 62) sets the error and ends editing together; the field commits on leaving (line 87). The timeline cancels the press's default, so focus stays in the field (`packages/studio/src/components/Timeline.tsx` line 262).
- **Severity:** `medium`. Silently undoes the user's drag.
- **Decision needed:** `fix`. Mark the field as editing only after a keystroke, and keep the error until the next edit.
- **Raised by:** [prop fields](props/prop-fields.md#the-time-field), [prop fields](props/prop-fields.md#cancel-and-interrupt), [prop fields](props/prop-fields.md#edge-cases), [prop fields](props/prop-fields.md#open-questions-and-verification)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): PROPFIELDS-33 and PROPFIELDS-68.

### B-45: An inferred color field changes kind mid-typing and loses keyboard focus

- **Where the user meets it:** A prop the schema does not list, holding text such as `#ff0000`.
- **What happens / what was expected:** Deleting one character turns the color field into a plain text box, which replaces the box being typed in; keyboard focus is lost and the next keystrokes act as Studio shortcuts (I, O, J, K, L). Typing a color into a text box turns it into a color field after `#ff0` the same way. Any 4- or 7-character text starting with `#` counts. Expected: the field keeps its kind while it is being edited.
- **Reproduce:** In such a field, press Backspace once, then type `l`: playback starts.
- **Why (from the code):** `packages/studio/src/components/PropsEditor.tsx` lines 243 to 262 decide the field's kind from the current value on every render.
- **Severity:** `medium`. Loses focus and fires shortcuts while typing.
- **Decision needed:** `fix`. Decide the kind once per prop, not per keystroke.
- **Raised by:** [prop fields](props/prop-fields.md#edge-cases), [prop fields](props/prop-fields.md#open-questions-and-verification)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): PROPFIELDS-77.

### B-46: Typing into a typed-array box is undone at the next redraw

- **Where the user meets it:** A schema prop of a typed-array type (`float32array` and similar).
- **What happens / what was expected:** Read from the code, the text is replaced with the current value on every redraw of the Props Editor, which is about every second while paused and every frame while playing, so typing is undone almost at once. Expected: the box keeps the typed text until it is committed.
- **Reproduce:** Type into such a box and wait a second.
- **Why (from the code):** `packages/studio/src/components/SchemaInputs.tsx` line 563 builds a new array on every render, and the JSON box's effect at lines 515 to 517 replaces its text whenever the value changes by identity.
- **Severity:** `medium`. The field cannot be edited by typing.
- **Decision needed:** `fix`. Compare by value before replacing the text, as the inferred JSON box does.
- **Raised by:** [prop fields](props/prop-fields.md#json-boxes), [prop fields](props/prop-fields.md#open-questions-and-verification)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): PROPFIELDS-41.

### B-47: Asset fields with accepted extensions, and color text boxes, refuse every partly typed value

- **Where the user meets it:** Typing an address into an asset field whose schema lists accepted extensions, or editing a color's text box.
- **What happens / what was expected:** Read from the code, every keystroke that leaves an incomplete address or color is refused by the composition, and the box snaps back to the accepted value, so only pasting or picking works. Expected: the box keeps the text while it is typed and checks it when it is left.
- **Reproduce:** In an image field with accepted extensions, type `logo.p`.
- **Why (from the code):** The fields show only the composition's value and send every keystroke (`packages/studio/src/components/SchemaInputs.tsx` lines 320 to 332 and 424 to 441), and the composition refuses the whole change when a value fails validation (`packages/core/src/schema.ts`).
- **Severity:** `medium`. Typing does not work in these fields.
- **Decision needed:** `fix`. Keep local text and commit on leaving or on a valid value.
- **Raised by:** [prop fields](props/prop-fields.md#open-questions-and-verification)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): PROPFIELDS-17 and PROPFIELDS-18.

### B-48: Reset removes props the schema does not list, and silently does nothing when one default is refused

- **Where the user meets it:** The Props Editor's Reset.
- **What happens / what was expected:** Props outside the schema disappear from the editor, from the composition, and, after the save, from `composition.json`. If any schema prop's empty value is refused (a required prop without a default), Reset does nothing and says nothing. Without a schema it does nothing either, without a message. Expected: Reset restores the schema's defaults, keeps other props, and reports a failure.
- **Reproduce:** In a composition with a schema, add a prop by editing `composition.json`, reopen, and press Reset.
- **Why (from the code):** `handleReset` in `packages/studio/src/components/PropsEditor.tsx` lines 112 to 120 builds the new set from the schema alone and lets an error from `setInputProps` go uncaught.
- **Severity:** `medium`. Removes props without warning.
- **Decision needed:** `fix`. Merge the defaults into the current props, and show an error when refused.
- **Raised by:** [the Props Editor](props/the-props-editor.md#reset), [the Props Editor](props/the-props-editor.md#open-questions-and-verification)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): PROPSEDITOR-36 and PROPSEDITOR-37.

### B-49: Safe-area guides are positioned from the stage's corner, not the composition's

- **Where the user meets it:** The safe-area guides (' or the toolbar button).
- **What happens / what was expected:** Read from the code, the guides are offset from the composition by half the difference between the stage's size and the canvas size, and line up only when the two are equal. Expected: the guides frame the composition.
- **Reproduce:** Turn on the guides with the default 1920 by 1080 canvas in an ordinary window.
- **Why (from the code):** The guide layer is absolutely positioned at the top left of the area that pans and zooms (`packages/studio/src/components/Stage/Stage.css` lines 33 to 39; `Stage.tsx` lines 167 to 179), which is as large as the stage, while the player is centered in it (`Stage.css` lines 13 to 21).
- **Severity:** `medium`. A framing aid in the wrong place.
- **Decision needed:** `fix`. Position the guides with the player, for example in the same centered wrapper.
- **Raised by:** [the stage toolbar](stage/the-stage-toolbar.md#ending-at-once), [the stage toolbar](stage/the-stage-toolbar.md#open-questions-and-verification)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): STAGETOOLBAR-32, STAGETOOLBAR-28 (the guides grow with the composition but their top-left sat 178 pixels right of and 107 below the composition's), and STAGETOOLBAR-30 (at Fit the crosshair's crossing lay under the stage toolbar, so a click there pressed the toolbar).

### B-50: The transparency grid never shows through a transparent composition

- **Where the user meets it:** The transparency grid, with a composition whose page has no background.
- **What happens / what was expected:** The composition shows light grey, not the checkerboard; the grid is visible only around it. Expected: the checkerboard shows through transparent pixels.
- **Reproduce:** Turn the grid on and open a composition with a transparent background.
- **Why (from the code):** The checkerboard is drawn on the stage behind the player (`packages/studio/src/components/Stage/Stage.tsx` line 141), and the player paints its own `#f0f0f0` background (`packages/player/src/index.ts` lines 88 to 93).
- **Severity:** `medium`. The feature does not do what its name says.
- **Decision needed:** `fix`. Make the player's background transparent inside Studio.
- **Raised by:** [the stage toolbar](stage/the-stage-toolbar.md#edge-cases), [the stage toolbar](stage/the-stage-toolbar.md#open-questions-and-verification)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): STAGETOOLBAR-92.

### B-51: One unexpected error blanks the whole Studio page

- **Where the user meets it:** A browser profile that refuses local storage; or, rarely, the Helios Assistant's Documentation tab after the server answers with an error.
- **What happens / what was expected:** Read from the code, an error thrown while Studio draws or updates takes the whole page down to blank, because nothing catches it. With local storage refused this happens as soon as the page loads, because the render settings and the active composition are written without protection. Expected: a failure in one part leaves the rest working, and storage failures are ignored as the other remembered values' are.
- **Reproduce:** Block site data for the Studio address in Chromium and load Studio.
- **Why (from the code):** There is no error boundary (`packages/studio/src/main.tsx` lines 5 to 9, `packages/studio/src/App.tsx` lines 135 to 145). `packages/studio/src/context/StudioContext.tsx` lines 217 to 220 and 602 to 607 write local storage without `try`, unlike `hooks/usePersistentState.ts` lines 18 to 24. `packages/studio/src/components/AssistantModal/AssistantModal.tsx` lines 26 to 33 keep whatever the server answered as the list.
- **Severity:** `medium`. Total in effect, but the triggers are uncommon.
- **Decision needed:** `fix`. Guard the two storage writes, check the documentation answer, and add an error boundary around each panel and dialog.
- **Raised by:** [the workspace](foundations/the-workspace.md#open-questions-and-verification), [the Helios Assistant](help/the-assistant.md#open-questions-and-verification)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): WORKSPACE-69. In a Chromium profile with site data blocked, the page stayed blank from the first load, with the uncaught "Failed to read the 'localStorage' property from 'Window': Access is denied for this document."

### B-52: The Omnibar opens beneath every other dialog and takes keyboard focus there

- **Where the user meets it:** Ctrl/Cmd+K while another dialog is open, including from a dialog's text field.
- **What happens / what was expected:** The Omnibar opens hidden behind the dialog already shown, with keyboard focus in its search: typing filters a list the user cannot see, Enter runs the highlighted item (Create Composition if nothing was typed), and Escape closes it together with a Keyboard Shortcuts or confirmation dialog above it. Expected: the Omnibar opens on top, or does not open over a dialog.
- **Reproduce:** Open New Composition, click in the name field, press Ctrl/Cmd+K, then Enter.
- **Why (from the code):** `packages/studio/src/components/Omnibar.css` line 12 gives its overlay `z-index: 1000`, below the confirmations (1100) and most dialogs (2000), and it comes first in the page (`packages/studio/src/App.tsx` lines 122 to 129), so it is also below Composition Settings and the Helios Assistant at the same level.
- **Severity:** `medium`. Wrong but recoverable; a hidden Enter can act.
- **Decision needed:** `fix`. Put the Omnibar on top of every dialog.
- **Raised by:** [the workspace](foundations/the-workspace.md#dialogs), [the workspace](foundations/the-workspace.md#open-questions-and-verification), [the input model](foundations/input-model.md#edge-cases), [the Omnibar](compositions/the-omnibar.md#edge-cases), [the Omnibar](compositions/the-omnibar.md#open-questions-and-verification), [composition settings](compositions/composition-settings.md#modifiers), [composition settings](compositions/composition-settings.md#open-questions-and-verification), [creating and duplicating](compositions/creating-and-duplicating.md#modifiers), [creating and duplicating](compositions/creating-and-duplicating.md#open-questions-and-verification), [shortcuts and diagnostics](help/shortcuts-and-diagnostics.md#open-questions-and-verification), [the Helios Assistant](help/the-assistant.md#open-questions-and-verification)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): WORKSPACE-43, WORKSPACE-76, OMNIBAR-29, OMNIBAR-71, OMNIBAR-72, CREATEDUP-38, and COMPSETTINGS-43; SHORTCUTS-47 and SHORTCUTS-48, whose expected results are this behavior, passed.

### B-76: At the default sidebar width the last sidebar tabs lie under the stage and cannot be clicked

- **Where the user meets it:** The sidebar's tab row at its default width of 250 pixels.
- **What happens / what was expected:** The six tabs need about 507 pixels. Components is cut off at the sidebar's edge, and Captions, Audio, and Renders lie under the stage, where a click lands on the composition (and toggles playback). They can be reached only after widening the sidebar to about 540 pixels. Expected: every tab can be seen and clicked at the default width.
- **Reproduce:** Clear local storage, reload, and try to click the Renders tab.
- **Why (from the code):** `packages/studio/src/components/Sidebar/Sidebar.css` lines 9 to 27 lay the tabs out in one row that neither wraps, scrolls, nor shrinks its labels, and the stage, later in the page, covers what overflows.
- **Severity:** `medium`. Three panels are unreachable until the user discovers the divider.
- **Decision needed:** `fix`. Let the row wrap or scroll, shorten the labels, or clip the row to the sidebar.
- **Raised by:** the automated pass: [foundations.md](verification/foundations.md) (WORKSPACE-25); described in [the workspace](foundations/the-workspace.md#the-sidebar)
- **Status:** found by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): WORKSPACE-25. The pass widened the sidebar with a real drag of its divider whenever it needed those tabs.

### B-77: The stage never shrinks below about 938 pixels, pushing the inspector off a narrow window

- **Where the user meets it:** A browser window narrower than about 1500 pixels, or a sidebar or inspector widened by its divider.
- **What happens / what was expected:** The stage stops shrinking at about 938 pixels. At a 1400-pixel window the inspector runs 90 pixels past the right edge; from about 1200 pixels down it is entirely off the page, and the page does not scroll to it. Expected: the stage gives way so that the sidebar and the inspector stay on screen.
- **Reproduce:** Make the window 1200 pixels wide and look for the Props Editor.
- **Why (from the code):** `packages/studio/src/components/Layout/StudioLayout.css` line 19 sizes the middle column `1fr`, whose minimum is its content's width, here the stage toolbar's row of controls.
- **Severity:** `medium`. The Props Editor disappears on an ordinary laptop window.
- **Decision needed:** `fix`. Give the middle column a minimum of 0 (`minmax(0, 1fr)`) and let the toolbar wrap or scroll.
- **Raised by:** the automated pass: [foundations.md](verification/foundations.md) (WORKSPACE-02, WORKSPACE-20); described in [the workspace](foundations/the-workspace.md#the-layout-and-its-dividers)
- **Status:** found by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): WORKSPACE-02, WORKSPACE-20, and STAGETOOLBAR-88 (with the sidebar and the inspector at 600 pixels the stage stayed 938 wide and pushed the inspector past the window's right edge).

## Low

### B-53: Two asset moves that should work are refused

- **Where the user meets it:** Moving assets by dragging in the Assets panel.
- **What happens / what was expected:** Dropping a tile on the panel inside the folder it is already in shows an "already exists in target folder" error toast instead of doing nothing. Moving a folder `icons` into a sibling whose name begins with it, such as `icons-old`, is refused as a move "into itself". Expected: the first does nothing quietly; the second moves the folder.
- **Reproduce:** Drag an asset onto the empty area of the panel while viewing its own folder. Then make `icons` and `icons-old` side by side and drag `icons` onto `icons-old`.
- **Why (from the code):** The drop handlers send the move without checking where the asset already is (`packages/studio/src/components/AssetsPanel/AssetsPanel.tsx` lines 37 to 65, `FolderItem.tsx` lines 43 to 57). `moveAsset` in `packages/studio/src/server/discovery.ts` lines 492 to 495 compares the two paths as plain text, so `.../icons-old` counts as inside `.../icons`.
- **Severity:** `low`. An error toast for a no-op, and a refusal with an easy workaround (rename first).
- **Decision needed:** `fix`. Skip a move to the current folder, and compare paths by whole segments.
- **Raised by:** [asset actions](assets/asset-actions.md#open-questions-and-verification)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): ASSETACTIONS-109 and ASSETACTIONS-110.

### B-54: 📝 on a composition tile opens its folder rather than its page

- **Where the user meets it:** The 📝 button on a composition tile.
- **What happens / what was expected:** Read from the code, Studio asks the development server to open the composition's ID, which is its folder, so an editor such as VS Code may open a new workspace window on the folder. Nothing appears in Studio either way. Expected: `composition.html` opens in the editor.
- **Reproduce:** Press 📝 on a tile with VS Code as the editor.
- **Why (from the code):** `packages/studio/src/components/CompositionsPanel/CompositionItem.tsx` line 39 passes `composition.id` to `openInEditor` (`packages/studio/src/context/StudioContext.tsx` lines 943 to 947).
- **Severity:** `low`. The editor opens, just not on the file.
- **Decision needed:** `fix`. Pass the path of `composition.html`.
- **Raised by:** [the Compositions panel](compositions/the-compositions-panel.md#open-questions-and-verification)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): COMPOSPANEL-20 (with `LAUNCH_EDITOR` naming a stub, the editor was given the folder `gsap-animation`).

### B-55: Searching the Compositions panel shows a matching folder closed, and leaves folders it opened open

- **Where the user meets it:** The Compositions panel's search box.
- **What happens / what was expected:** A search that matches only a folder's name shows that folder closed, with all its contents inside, so the result is one click away. Folders a search opened stay open after it is cleared, while folders it hid come back closed. The panel's test calls the first behavior correct.
- **Reproduce:** Search for the name of a folder that holds compositions with other names.
- **Why (from the code):** `packages/studio/src/utils/tree.ts` lines 104 to 122 keep a matching folder without marking it open; `packages/studio/src/components/CompositionsPanel/CompositionTree.tsx` lines 74 to 80 keep a folder's open state once a search has set it.
- **Severity:** `low`. A quirk of search.
- **Decision needed:** `product call`. Open folders that match (more visible results, more clutter), or keep them closed (today); and whether clearing a search should restore the folders as they were.
- **Raised by:** [the Compositions panel](compositions/the-compositions-panel.md#open-questions-and-verification)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): COMPOSPANEL-33 and COMPOSPANEL-35, whose expected results are this behavior.

### B-56: The Omnibar's highlight does not scroll into view

- **Where the user meets it:** Moving through a long Omnibar list with ↓.
- **What happens / what was expected:** The highlight moves below the visible part of the list, which does not scroll to it, so in a large project choosing by ↓ alone is impractical. Expected: the list scrolls to keep the highlight visible.
- **Reproduce:** In the verification project, open the Omnibar and hold ↓.
- **Why (from the code):** `packages/studio/src/components/Omnibar.tsx` lines 180 to 188 change the highlighted index, and the list at lines 219 to 262 never scrolls to it.
- **Severity:** `low`. The mouse and typing still work.
- **Decision needed:** `fix`. Scroll the highlighted item into view when it changes.
- **Raised by:** [the Omnibar](compositions/the-omnibar.md#edge-cases), [the Omnibar](compositions/the-omnibar.md#open-questions-and-verification)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): OMNIBAR-40, whose expected result is this behavior.

### B-57: Open Studio tabs never follow each other's remembered values

- **Where the user meets it:** Two Studio tabs on the same address.
- **What happens / what was expected:** Each tab keeps its own layout, active composition, and timeline state in memory and writes them on change, so the last write wins and reloading one tab can switch its composition to the one another tab opened. A tab also writes the timeline state of its open composition as the page closes, so reloading it puts back its own in point, out point, loop, and playhead position over another tab's later change to the same composition. Following the other tab keeps them in step; not following keeps each tab independent.
- **Reproduce:** Open a composition in tab A, another in tab B, then reload tab A.
- **Why (from the code):** `packages/studio/src/hooks/usePersistentState.ts` lines 3 to 27 and `packages/studio/src/context/StudioContext.tsx` lines 602 to 607 write local storage but never listen for changes from other tabs; `StudioContext.tsx` lines 669 to 678 write the timeline state when the page closes.
- **Severity:** `low`. Surprising only with several tabs.
- **Decision needed:** `product call`. Sync tabs through storage events, or keep tabs independent and say so.
- **Raised by:** [changes from outside Studio](cross-cutting/changes-from-outside-studio.md#open-questions-and-verification), [changes from outside Studio](cross-cutting/changes-from-outside-studio.md#edge-cases), [the playback range](playback/the-playback-range.md#interactions-with-other-systems)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headless Chromium 141 on Linux, with real mouse and keyboard input): RANGE-63. A second tab reloaded after the first set the range to 30 to 90 came back at 0 to 150 and wrote that over the record.

### B-58: Two `helios studio` processes on one project overwrite each other's render history

- **Where the user meets it:** Running `helios studio` twice in the same folder (on two ports).
- **What happens / what was expected:** Each process writes its whole in-memory job list to `renders/jobs.json`, so each one's jobs vanish from the file when the other saves. Refusing a second process prevents it; merging lets both run.
- **Reproduce:** Start two processes on one project and render from each.
- **Why (from the code):** `performSave` in `packages/studio/src/server/render-manager.ts` lines 65 to 74 replaces the file with this process's list.
- **Severity:** `low`. An unusual setup.
- **Decision needed:** `product call`. Refuse a second process on the same project, or merge the history on save.
- **Raised by:** [changes from outside Studio](cross-cutting/changes-from-outside-studio.md#open-questions-and-verification)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): OUTSIDE-78.

### B-59: An agent can cancel the user's render with no notice beyond the status

- **Where the user meets it:** An agent connected to Studio's MCP server cancels a render the user started.
- **What happens / what was expected:** The job's status changes to CANCELLED in the Renders panel and nothing else tells the user. Notifying keeps the user informed; staying quiet keeps agents unobtrusive.
- **Reproduce:** Start a render in Studio and cancel it through the MCP `cancel_render` tool.
- **Why (from the code):** `packages/studio/src/server/mcp.ts` lines 188 to 193 cancel any job by ID; Studio learns of it only through the once-a-second job poll.
- **Severity:** `low`. The status is shown.
- **Decision needed:** `product call`. Show a toast when someone else changes a job, or limit agents to their own jobs.
- **Raised by:** [changes from outside Studio](cross-cutting/changes-from-outside-studio.md#open-questions-and-verification)
- **Status:** Not checked: in the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input), the agent's `cancel_render` stopped the `helios studio` process ([B-78](#b-78-cancelling-a-server-side-render-stops-the-helios-studio-process); OUTSIDE-44), so what the user would see afterwards could not be observed.

### B-60: The Keyboard Shortcuts dialog and the Omnibar's hints disagree with the shortcuts

- **Where the user meets it:** The Keyboard Shortcuts dialog (?) and the Omnibar's command list.
- **What happens / what was expected:** The dialog shows a "/" key cap between Space and K for play and pause (it does nothing), describes K as play and pause (it only pauses), J as "Slower", Home as "Restart" (it goes to the in point), ⌘ on every platform, Ctrl/Cmd+K as "Switch Composition", and leaves out '. The Omnibar shows "N" for Create Composition and "S" for Take Snapshot, which do nothing, and "L" for Toggle Loop, which plays forward. Expected: both match [the shortcut map](foundations/input-model.md#the-shortcut-map).
- **Reproduce:** Press ? and compare with the shortcut map; open the Omnibar and press L.
- **Why (from the code):** `packages/studio/src/components/KeyboardShortcutsModal.tsx` lines 15 to 49; `packages/studio/src/components/Omnibar.tsx` lines 59, 81, and 89.
- **Severity:** `low`. Copy that misleads.
- **Decision needed:** `fix`. Correct the dialog and the hints.
- **Raised by:** [the input model](foundations/input-model.md#the-shortcut-map), [the input model](foundations/input-model.md#open-questions-and-verification), [the Omnibar](compositions/the-omnibar.md#open-questions-and-verification), [shortcuts and diagnostics](help/shortcuts-and-diagnostics.md#open-questions-and-verification)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): INPUT-50, INPUT-52, INPUT-53, INPUT-54, SHORTCUTS-21, and OMNIBAR-14.

### B-61: The Assistant picks documentation by splitting the question at spaces and taking the first three matches

- **Where the user meets it:** Building a prompt in the Helios Assistant.
- **What happens / what was expected:** Words are split only at spaces, keep their punctuation, and are dropped when three letters or shorter; the first three sections that contain any word are used, in list order. The dialog's own placeholder question gets no documentation. Better relevance costs more code; the current rule is predictable.
- **Reproduce:** Use the placeholder question as typed.
- **Why (from the code):** `packages/studio/src/components/AssistantModal/AssistantModal.tsx` lines 39 to 43.
- **Severity:** `low`. The prompt is still useful without documentation.
- **Decision needed:** `product call`. Keep the simple rule, or rank sections (strip punctuation, score by matches).
- **Raised by:** [the Helios Assistant](help/the-assistant.md#open-questions-and-verification)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): ASSISTANT-24 and ASSISTANT-20, whose expected results are this behavior, passed (the first three matching sections in the list's order, and no keyword of three letters or fewer).

### B-62: Export and snapshot do nothing, without a message, when there is nothing to capture

- **Where the user meets it:** The Export button before the player connects; 📷 in Canvas mode on a composition that has no canvas.
- **What happens / what was expected:** Export is enabled but does nothing; the snapshot does nothing. Neither says why. Expected: the button is disabled, or a message explains.
- **Reproduce:** Open a Vanilla JS composition (it never connects) and press Export.
- **Why (from the code):** `packages/studio/src/components/RendersPanel/RendersPanel.tsx` lines 56 to 61 disable Export only without a composition, and `exportVideo` returns early without a controller (`packages/studio/src/context/StudioContext.tsx` lines 837 to 838). `takeSnapshot` returns early on an empty capture (lines 806 to 807), which `captureFrame` gives when no canvas is found (`packages/player/src/controllers.ts` lines 201 to 206).
- **Severity:** `low`. Nothing is lost.
- **Decision needed:** `fix`. Disable Export until connected, and show a message for an empty capture.
- **Raised by:** [client-side export](output/client-side-export.md#open-questions-and-verification), [snapshots and job specs](output/snapshots-and-job-specs.md#open-questions-and-verification)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): CLIENTEXPORT-11 and SNAPSPEC-30.

### B-63: A render job started in Studio is labeled with the composition page's address

- **Where the user meets it:** The Renders panel's job list.
- **What happens / what was expected:** A job started in Studio shows the composition page's `/@fs/...` address; a job started by an agent shows the composition's ID. Expected: the composition's name or ID for both.
- **Reproduce:** Start a render from the Renders panel.
- **Why (from the code):** `startRender` in `packages/studio/src/context/StudioContext.tsx` lines 729 to 743 sends no composition ID, so `packages/studio/src/server/render-manager.ts` line 266 falls back to the address.
- **Severity:** `low`. A labeling slip.
- **Decision needed:** `fix`. Send the composition ID.
- **Raised by:** [server-side renders](output/server-renders.md#open-questions-and-verification), [changes from outside Studio](cross-cutting/changes-from-outside-studio.md#open-questions-and-verification)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): SERVERRENDER-50.

### B-64: A finished client-side export is not announced

- **Where the user meets it:** The end of a client-side export.
- **What happens / what was expected:** Only the browser's download shows that it finished; Studio's progress simply disappears. A toast would match snapshots and job specs; leaving it to the browser avoids a duplicate notice.
- **Reproduce:** Export any connected composition.
- **Why (from the code):** `exportVideo` in `packages/studio/src/context/StudioContext.tsx` lines 867 to 887 shows a toast only on failure.
- **Severity:** `low`. The download itself is visible.
- **Decision needed:** `product call`. Add an "Export finished" toast or not.
- **Raised by:** [client-side export](output/client-side-export.md#open-questions-and-verification)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): CLIENTEXPORT-05, whose expected result is this behavior, passed; only the browser's download showed that the export had finished.

### B-65: Deleting a render job has no confirmation

- **Where the user meets it:** Delete on a finished render job.
- **What happens / what was expected:** The job and its output file are removed at once, unlike deleting a composition or an asset, which ask first. Asking protects the video; not asking keeps cleanup quick.
- **Reproduce:** Press Delete on a completed job.
- **Why (from the code):** `packages/studio/src/components/RendersPanel/RendersPanel.tsx` lines 145 to 147 call `deleteRender` directly; `packages/studio/src/server/render-manager.ts` lines 377 to 395 delete the file.
- **Severity:** `low`. The render can be run again.
- **Decision needed:** `product call`. Add a confirmation like the other deletes, or not.
- **Raised by:** [server-side renders](output/server-renders.md#open-questions-and-verification)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): SERVERRENDER-58 and PROJECT-53, whose expected results are this behavior, passed: Delete removed the job and its file at once with no confirmation.

### B-66: Every render starts at once; there is no queue

- **Where the user meets it:** Starting several renders in a row.
- **What happens / what was expected:** Each starts immediately in its own headless browser, so QUEUED is practically never shown and the renders compete for the machine. A queue runs them one after another; running at once finishes short jobs sooner.
- **Reproduce:** Press "Start Render Job" three times.
- **Why (from the code):** `startRender` in `packages/studio/src/server/render-manager.ts` lines 250 to 353 sets QUEUED and starts the render in the same call.
- **Severity:** `low`. Slower, not wrong.
- **Decision needed:** `product call`. Queue renders (with a concurrency limit), or keep running them at once and drop the QUEUED status.
- **Raised by:** [server-side renders](output/server-renders.md#open-questions-and-verification)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): SERVERRENDER-15, whose expected result is this behavior, passed: three clicks started three renders that ran at the same time and all completed.

### B-67: Import SRT accepts only strict SRT and refuses WebVTT

- **Where the user meets it:** Import SRT in the Captions panel.
- **What happens / what was expected:** Common variants (one-digit hours, a period before the milliseconds) and WebVTT files are refused or misread, although Helios has a more lenient caption reader. Accepting more formats helps users with real-world files; staying strict keeps the panel's name honest.
- **Reproduce:** Import a `.vtt` file, or an SRT file with `0:00:01.000` timings.
- **Why (from the code):** `packages/studio/src/components/CaptionsPanel/CaptionsPanel.tsx` line 70 uses `parseSrt` rather than the general reader in `packages/core/src/captions.ts` line 172.
- **Severity:** `low`. The file can be converted first.
- **Decision needed:** `product call`. Use the general reader (and rename the button), or keep strict SRT.
- **Raised by:** [the Captions panel](panels/the-captions-panel.md#open-questions-and-verification)

### B-87: Two component installs at once leave only one of them in `helios.config.json`

- **Where the user meets it:** The Components panel, when a second Install is started while the first is still running, which the panel allows after the user leaves the tab and comes back (or from a second tab, or by an agent through Studio's MCP server).
- **What happens / what was expected:** Both installs write their files and both report success, but `helios.config.json` ends up listing only the components of the install that finished last; the other one's entries are lost. The panel still shows every component as Installed, because it decides that from the files on disk, so nothing in Studio shows the loss; tools that read the configuration (the `helios` CLI's list, diff, and update commands) no longer know the component. Expected: both components recorded.
- **Reproduce:** In a project with a `helios.config.json`, press Install on `timer`, at once click another sidebar tab and come back, and press Install on `watermark` before the first toast. When both toasts have come, `helios.config.json` lists either `use-video-frame` and `timer`, or `watermark`, not all three.
- **Why (from the code):** `packages/cli/src/utils/install.ts` reads the configuration when an install starts (line 45) and writes its own copy back when it ends (lines 141 to 163), after the package manager has run, so two overlapping installs each write a copy that lacks the other's components. `packages/cli/src/commands/studio.ts` lines 81 to 89 report a component installed when its files exist, whatever the configuration says.
- **Severity:** `low`. It needs two installs at once, and installing the lost component again records it.
- **Decision needed:** `fix`. Read, change, and write the configuration in one step at the end of each install, or let only one action run at a time on the server.
- **Raised by:** the automated pass: [assets-and-panels.md](verification/assets-and-panels.md) (COMPONENTS-38); described in [the Components panel](panels/the-components-panel.md#cancel-and-interrupt)
- **Status:** found by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): COMPONENTS-38, twice. In one run the configuration ended as `["watermark"]`, in the other as `["use-video-frame", "timer"]`; all three components' files were on disk and the panel showed all three as Installed.

### B-68: The empty background below the timeline's track area takes no presses or drops, and the drop highlight blinks

- **Where the user meets it:** The timeline panel at its default height with no audio lanes, where most of the space below the header is empty background.
- **What happens / what was expected:** A press there does not seek or start a scrub, and an asset dropped there is not taken. While dragging an asset across lanes and markers the drop highlight may blink. Expected: the whole panel below the header behaves as the track area.
- **Reproduce:** Press in the lower half of the default timeline panel; drag a video asset slowly across the track area.
- **Why (from the code):** In `packages/studio/src/components/Timeline.tsx` lines 376 to 390 only the inner box, whose height is fixed by its content (line 386), listens for presses and drops, while the scrolling area around it fills the panel; the outer area's drag-leave handler (lines 207 to 210, 379) fires for every child the pointer leaves.
- **Severity:** `low`. The track area itself works.
- **Decision needed:** `fix`. Let the inner box fill the panel, and ignore drag-leave events into children.
- **Raised by:** [the timeline](playback/the-timeline.md#edge-cases), [the timeline](playback/the-timeline.md#open-questions-and-verification), [timeline tracks](playback/timeline-tracks.md#open-questions-and-verification)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): TRACKS-21; INPUT-07 also found that a press below the lanes does not seek.

### B-80: The `d3-animation` example never connects

- **Where the user meets it:** Opening the `d3-animation` example in Studio.
- **What happens / what was expected:** The page stops with "The requested module '/@fs/.../packages/core/src/drivers/index.ts' does not provide an export named 'TimeDriver'", and the player shows "Connection Failed...". Expected: it connects like the other canvas and SVG examples.
- **Reproduce:** Open D3 Animation and wait 6 seconds.
- **Why (from the code):** `examples/d3-animation/src/index.js` line 1 imports Helios from core's TypeScript source, and `packages/core/src/index.ts` line 22 re-exports `TimeDriver`, which is only an interface, as a value; a file-by-file transform cannot drop it, so the browser finds no such export.
- **Severity:** `low`. One example.
- **Decision needed:** `fix`. Re-export `TimeDriver` with `export type`, or import the built package in the example.
- **Raised by:** the automated pass: [foundations.md](verification/foundations.md) (PLAYER-28); described in [the preview player](foundations/the-preview-player.md#finishing)
- **Status:** found by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): PLAYER-28. The document's list of examples that never connect is corrected.

### B-69: A size typed in the stage toolbar is replaced by the metadata's at every save

- **Where the user meets it:** Typing a canvas size in the stage toolbar, then any save.
- **What happens / what was expected:** The typed size is replaced by `composition.json`'s width and height whenever Studio's copy of the composition changes: an auto-save, a Composition Settings save, "Set from Current Frame", or opening a composition; if a size field has focus, the number changes under the caret. Treating the toolbar as a temporary preview size matches the code; keeping it until changed matches what the user typed.
- **Reproduce:** Type a width in the toolbar, then change a prop and wait for the auto-save.
- **Why (from the code):** `packages/studio/src/context/StudioContext.tsx` lines 688 to 694 set the canvas size from the metadata whenever the active composition object changes.
- **Severity:** `low`. The size can be typed again.
- **Decision needed:** `product call`. Keep a typed size until the composition changes, or keep today's behavior and say in the toolbar that it is a preview size.
- **Raised by:** [the stage toolbar](stage/the-stage-toolbar.md#edge-cases), [the stage toolbar](stage/the-stage-toolbar.md#open-questions-and-verification), [project and compositions](foundations/project-and-compositions.md#open-questions-and-verification)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): in STAGETOOLBAR-23 the width typed in the toolbar, 1280, was replaced by the metadata's 1920 at the next auto-save, while the field had keyboard focus.

### B-83: A canvas wider than the stage is drawn no wider than the composition's page

- **Where the user meets it:** Typing a canvas width in the stage toolbar larger than the stage, for example 2500 or 5000 pixels on a 1920-pixel composition.
- **What happens / what was expected:** The field and the canvas size take the typed width, but the player is drawn only as wide as the page inside it (1920 pixels for the test compositions), so the stage does not show the wider canvas. Widths below that are drawn as typed. Expected: the player is drawn at the canvas size, as it is for heights.
- **Reproduce:** Open a composition, type 5000 in the stage toolbar's width field, and measure the player.
- **Why (from the code):** `packages/studio/src/components/Stage/Stage.css` lines 13 to 19 make the stage's content a flex row, and the player (`Stage.tsx` lines 156 to 166) is a flex item that may shrink; a flex item cannot shrink below its content's width, which is the composition page's own width, so a wider canvas shrinks to that.
- **Severity:** `low`. The preview misstates a large canvas size; renders use the typed size.
- **Decision needed:** `fix`. Keep the player from shrinking (`flex-shrink: 0`).
- **Raised by:** the automated pass: [stage-and-output.md](verification/stage-and-output.md) (STAGETOOLBAR-45); described in [the stage toolbar](stage/the-stage-toolbar.md#edge-cases)
- **Status:** found by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): STAGETOOLBAR-45 (5000 typed, player 1920 pixels wide) and STAGETOOLBAR-90.

### B-70: Fit sets 100% rather than fitting the composition to the stage

- **Where the user meets it:** The Fit button on the stage toolbar.
- **What happens / what was expected:** Fit sets the zoom to 100% and centers the composition, so a 1920 by 1080 composition does not fit an ordinary stage. Fitting to the stage matches the label; "Reset" or "100%" matches the code.
- **Reproduce:** Press Fit in a window narrower than 1920 pixels.
- **Why (from the code):** `handleFit` in `packages/studio/src/components/Stage/Stage.tsx` lines 134 to 137 sets zoom 1 and pan 0.
- **Severity:** `low`. The zoom buttons work.
- **Decision needed:** `product call`. Compute a zoom that fits the stage, or rename the button.
- **Raised by:** [the stage view](stage/the-stage-view.md#edge-cases), [the stage view](stage/the-stage-view.md#open-questions-and-verification)
- **Status:** Confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): STAGEVIEW-22, whose expected result is this behavior.

### B-71: Clipboard copies report success without checking

- **Where the user meets it:** The Omnibar's asset items ("Path copied to clipboard"), the Props Editor's Copy JSON ("Copied!"), and the Helios Assistant's "Copy to Clipboard" (no feedback at all).
- **What happens / what was expected:** The first two report success before the copy finishes and even if the browser refuses it; the third says nothing either way. Expected: feedback after the copy succeeds, and an error when it fails.
- **Reproduce:** In a profile that denies clipboard access, choose an asset in the Omnibar.
- **Why (from the code):** `packages/studio/src/components/Omnibar.tsx` lines 149 to 152, `packages/studio/src/components/PropsEditor.tsx` lines 25 to 28 and 106 to 110, and `packages/studio/src/components/AssistantModal/AssistantModal.tsx` line 140 ignore the promise `navigator.clipboard.writeText` returns.
- **Severity:** `low`. Copying usually works at the Studio address.
- **Decision needed:** `fix`. Wait for the promise and report its result.
- **Raised by:** [the Omnibar](compositions/the-omnibar.md#open-questions-and-verification), [the Props Editor](props/the-props-editor.md#open-questions-and-verification), [the Helios Assistant](help/the-assistant.md#open-questions-and-verification)
- **Status:** Not checked: in the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input), setting the clipboard permission to denied through the DevTools protocol did not stop Chromium from letting the page write, so a refused write could not be produced (OMNIBAR-47 and PROPSEDITOR-31 recorded `blocked`).

### B-72: Small copy and rendering slips

- **Where the user meets it:** Across Studio, as listed below.
- **What happens / what was expected:** Each item is a small display or wording slip:
  - **The hover guide's timecode label is never visible.** It is drawn above the top of the track area, which clips it. `packages/studio/src/components/Timeline.css` lines 55 to 63 and 247 to 262. Raised by [the timeline](playback/the-timeline.md#open-questions-and-verification).
  - **Caption bars and audio lanes never show their tooltips.** Their titles are set (`Timeline.tsx` line 457, `TimelineAudioTrack.tsx` line 99) but both ignore the pointer (`Timeline.css` lines 189 to 197 and 264 to 272). Raised by [timeline tracks](playback/timeline-tracks.md#open-questions-and-verification).
  - **Disabled transport controls look enabled.** Inline colors on every control override the browser's disabled look; only the cursor changes. `packages/studio/src/components/Controls/PlaybackControls.tsx` lines 49 to 170. Raised by [the transport controls](playback/the-transport-controls.md#the-controls) and [its open questions](playback/the-transport-controls.md#open-questions-and-verification).
  - **The breadcrumb row at Home shows "Home /" and an empty entry.** Splitting an empty path gives one empty part. `packages/studio/src/components/AssetsPanel/AssetsPanel.tsx` lines 217 to 238. Raised by [the Assets panel](assets/the-assets-panel.md#edge-cases) and [its open questions](assets/the-assets-panel.md#open-questions-and-verification).
  - **Asset rename and delete messages.** A failed rename always says "Failed to rename asset" (or "folder") without the server's reason, while a failed move shows it; a successful rename shows no toast while a move and a delete do; deleting a folder says "Asset deleted". `packages/studio/src/components/AssetsPanel/AssetItem.tsx` lines 86 to 95, `FolderItem.tsx` lines 91 to 100, `packages/studio/src/context/StudioContext.tsx` lines 278 to 309. Raised by [asset actions](assets/asset-actions.md#open-questions-and-verification).
  - **System Diagnostics' error hint.** It shows literal backticks around `npx playwright install chromium`, for every error including "Failed to fetch", and names a different browser build from the one the renderer installs (`chromium-headless-shell`). `packages/studio/src/components/DiagnosticsModal.tsx` lines 89 to 95. Raised by [shortcuts and diagnostics](help/shortcuts-and-diagnostics.md#open-questions-and-verification).
  - **The Assistant's prompt says "Name: undefined"** with no composition open. `packages/studio/src/components/AssistantModal/AssistantModal.tsx` line 49. Raised by [the Helios Assistant](help/the-assistant.md#open-questions-and-verification).
  - **Hard-to-read Props Editor text.** Row names outside a group are dark gray (`#333`) on the inspector's near-black background, and a check box's "True" or "False" inside a group is light text on white. `packages/studio/src/components/PropsEditor.css` line 17. Raised by [the Props Editor](props/the-props-editor.md#what-the-editor-shows) and [its open questions](props/the-props-editor.md#open-questions-and-verification).
  - **The Components panel's colors are undefined.** Its stylesheet refers to color settings defined nowhere in Studio, leaving the cards, the type, and the Install button unstyled. `packages/studio/src/components/ComponentsPanel/ComponentsPanel.css` lines 3, 16, 17, 38, 41, 47, 53, 57, 68, and 99. Raised by [the Components panel](panels/the-components-panel.md#open-questions-and-verification).
  - **Names after an auto-save.** A composition in a subfolder is shown as "Scenes/intro Card" in the header, the Compositions panel, and the Omnibar, with the description "Example: ...", until the page is reloaded, because the server rebuilds the name from the whole ID. `packages/studio/src/server/discovery.ts` lines 684 to 687 and 703. Raised by [project and compositions](foundations/project-and-compositions.md#edge-cases) and [the Compositions panel](compositions/the-compositions-panel.md#edge-cases). This name also feeds [B-01](#b-01-saving-composition-settings-moves-or-renames-the-compositions-folder-even-when-the-name-is-unchanged).
- **Reproduce:** See each item.
- **Why (from the code):** Given with each item.
- **Severity:** `low`. Cosmetic or wording.
- **Decision needed:** `fix`. Each has an obvious correction.
- **Raised by:** [the timeline](playback/the-timeline.md#open-questions-and-verification), [timeline tracks](playback/timeline-tracks.md#open-questions-and-verification), [the transport controls](playback/the-transport-controls.md#the-controls), [the transport controls](playback/the-transport-controls.md#open-questions-and-verification), [the Assets panel](assets/the-assets-panel.md#edge-cases), [the Assets panel](assets/the-assets-panel.md#open-questions-and-verification), [asset actions](assets/asset-actions.md#open-questions-and-verification), [shortcuts and diagnostics](help/shortcuts-and-diagnostics.md#open-questions-and-verification), [the Helios Assistant](help/the-assistant.md#open-questions-and-verification), [the Props Editor](props/the-props-editor.md#what-the-editor-shows), [the Props Editor](props/the-props-editor.md#open-questions-and-verification), [the Components panel](panels/the-components-panel.md#open-questions-and-verification), [project and compositions](foundations/project-and-compositions.md#edge-cases), [the Compositions panel](compositions/the-compositions-panel.md#edge-cases)
- **Status:** Five items confirmed by the automated pass of 2026-10-07 (Playwright driving headed Chromium 141 on Linux, with real mouse and keyboard input): the hover guide's label (TIMELINE-42), the breadcrumb (ASSETPANEL-83), the rename message (ASSETACTIONS-47), the disabled transport controls (TRANSPORT-09, where the speed menu, unlike the others, is dimmed), and the Components panel's colors (COMPONENTS-10: the cards, the type label, and Install have a transparent background and no border). It found one more slip of the same kind: at Fit the timeline's last tick label overflows the track area by about 5 pixels, so a horizontal scrollbar appears and the label is out of view (TIMELINE-33, and at the first five zoom steps, TIMELINE-35). The rest were not checked.
