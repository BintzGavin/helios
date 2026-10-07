# Hand verification

The feature documents were written from the code and the tests. This directory is the protocol for checking them against the running product, one observable claim at a time.

## What is here

| File | Covers |
| --- | --- |
| [foundations.md](foundations.md) | `foundations/*`: the input model, the project and compositions, the workspace, and the preview player. It also defines the setups (**Fresh**, **Unbound**, **Media**, **Title**, **Vanilla**, **Player focused**) that the other files reuse. |
| [playback.md](playback.md) | `playback/*`: the transport controls, the timeline, the playback range, and the timeline tracks, with its own fixtures for compositions the transport can drive. |
| [stage-and-output.md](stage-and-output.md) | `stage/*` and `output/*`: the stage view, the stage toolbar, server-side renders, client-side export, and snapshots and job specs. |
| [compositions-and-props.md](compositions-and-props.md) | `compositions/*` and `props/*`: the Compositions panel, the Omnibar, creating and duplicating, composition settings, the Props Editor, and the prop fields. |
| [assets-and-panels.md](assets-and-panels.md) | `assets/*` and `panels/*`: the Assets panel, asset actions, the Captions panel, the audio mixer, and the Components panel. |
| [help-and-cross-cutting.md](help-and-cross-cutting.md) | `help/*` and `cross-cutting/*`: Keyboard Shortcuts and System Diagnostics, the Helios Assistant, and changes from outside Studio. |

Each file has one table per document. Each row is an item with a stable ID (`INPUT-07`, `PLAYER-43`), a priority, what it needs (a device, a second tab, the server stopped, a file edited on disk), the claim with a link to the document section, the setup, numbered steps, the expected result, and a Result column for the tester. Items that cannot be checked by hand (design questions, things that need a product decision, mechanisms with no visible effect) are listed under each table as "Not checkable by hand".

Priorities: **P1** is an established fact, a claim many documents depend on, or a suspected bug; **P2** is an ordinary claim; **P3** is a number, a color, or a timing. A row marked "(suspected bug)" is P1 and its expected result is "Record what happens", followed by what the document predicts.

## How to run a pass

1. Bring up the surface.
   1. **Build.** At this commit the repository's own build command does not work as it stands: the root `npm run build` builds the core, player, renderer, Studio, and CLI packages in that order, but the CLI depends on `@helios-project/infrastructure`, which that command never builds, so it fails at the CLI with "Cannot find module '@helios-project/infrastructure'". In the repository root, `/home/user/helios`, run:

      ```sh
      npm install
      npm run build                                # builds core, player, renderer, and Studio, then fails at the CLI
      npm run build -w packages/infrastructure
      npm run build -w packages/cli
      ```

      The first build's failure is expected; the last two commands finish it. This build-order defect is a finding in its own right, about building Helios rather than about Studio, and is filed as [B-73](../bug-triage.md#b-73-the-repositorys-npm-run-build-fails-because-it-never-builds-packagesinfrastructure).
   2. **Make a throwaway copy of `examples/`.** From the repository root, `cp -R examples verify-examples`. Never run a pass in `examples/` itself: it has no `public/` folder, so every example folder is also an asset folder, and deleting, renaming, or moving one in the Assets panel deletes, renames, or moves that composition on disk (see [the project and compositions](../foundations/project-and-compositions.md#assets)). Keep the copy one level below the repository root, where `examples/` is, so that the compositions find `@helios-project/*` through the repository's `node_modules` and the Helios Assistant's documentation lookup behaves as it does for `examples/`. The copy is outside `product-description/`: never stage or commit it. Put a file `scratch.json` containing `{}` at its root, for items that need an asset they can lose.
   3. **Start Studio from the copy.** `cd verify-examples && node ../packages/cli/bin/helios.js studio` (or `helios studio`, if the CLI is linked on the path). The terminal prints the address. Every document assumes `http://127.0.0.1:5173/`; if 5173 is taken Studio uses the next free port, so free 5173 first, because remembered state belongs to the exact address and many items read it.
   4. **Open it** in a desktop Chromium-based browser with a fresh profile (for example `google-chrome --user-data-dir="$(mktemp -d)"`), with a window of at least 1600 by 900 pixels and the page zoom at 100%.
   5. **Check the clock-bound claim first.** Every Studio template, and every example that connects, binds itself to the browser's document clock, and the code says such a composition takes its frame from that clock rather than from Studio's transport (see [clock-bound compositions](../foundations/the-preview-player.md#clock-bound-compositions)). Run PLAYER-43 to PLAYER-46 and PLAYER-49 in [foundations.md](foundations.md), and the three unmodified-example items [playback.md](playback.md) names (TRANSPORT-02, TIMELINE-82, RANGE-66), before anything else. Nearly every playback claim depends on the answer, which is why the playback items run on copies with the binding removed.
   6. **Make the test compositions**, once per pass, with the header's + (New Composition), then edit them on disk as the table says:

      | Composition | Folder | How to make it | Used for |
      | --- | --- | --- | --- |
      | Verify Title | `verify-title` | Template Title explainer; 1920 by 1080, 30 FPS, 5 seconds. Left as written, except that its script is moved into `main.js` (see below). | A composition that connects and has input props (`title`, `subtitle`); clock-bound behavior; the Props Editor on an unmodified template. |
      | Verify Unbound | `verify-unbound` | As Verify Title, then delete the line `helios.bindToDocumentTimeline();` from its `composition.html`. 150 frames. | Anything the transport must drive: frame steps, seeks, the playback range, hot reload. |
      | Verify Media | `verify-media` | Template Title explainer, Duration 20; delete the same line; put a 20-second audio file named `tone.mp3` in the folder (for example `ffmpeg -f lavfi -i "sine=frequency=440:duration=20" verify-media/tone.mp3`); edit `composition.html` as below. 600 frames. | The panels that need media and captions (Captions, Audio), a composition marker, a schema with a time prop and an audio prop, and anything longer than 10 seconds. |
      | Verify Vanilla | `verify-vanilla` | Template Vanilla JS (the dialog's default), the other fields at their defaults. | A composition that never connects. |

      Verify Media's `composition.html`: after `<body>` add `<audio id="music" data-helios-track-id="music" src="./tone.mp3"></audio>` and `<audio id="voice" src="./tone.mp3"></audio>` (one track named by `data-helios-track-id`, one only by `id`), and replace the line `const helios = new Helios({ duration, fps: 30, inputProps: defaults });` with:

      ```js
      const helios = new Helios({
        duration, fps: 30, inputProps: defaults, autoSyncAnimations: true,
        schema: {
          title: { type: 'string', maxLength: 40 },
          subtitle: { type: 'string' },
          audio: { type: 'audio', default: './tone.mp3' },
          audioTime: { type: 'number', format: 'time', default: 2 },
        },
        captions: '1\n00:00:01,000 --> 00:00:03,000\nFirst cue\n\n2\n00:00:05,000 --> 00:00:07,500\nSecond cue',
        markers: [{ id: 'beat', time: 4, label: 'Beat' }],
      });
      ```

      This was written from the source; the automated pass of 2026-10-07 ran it, in `main.js`, and it connected. If Verify Media shows "Error: ..." or never connects, read the browser console and adjust it before using it.

      **Move every Title explainer test composition's script into its own file.** As Studio serves composition pages, a Title explainer composition left as the template writes it never connects: the page's inline `<script type="module">` imports Helios by its package name, which the browser cannot resolve, because the development server does not process pages served from `/@fs/` ([B-74](../bug-triage.md#b-74-studio-serves-composition-pages-untouched-so-the-title-explainer-template-never-connects-and-nothing-hot-reloads)). Move the script's contents, unchanged, into `main.js` in the same folder and load it with `<script type="module" src="./main.js"></script>`. Every instruction in these files to edit the script in `composition.html` (deleting `helios.bindToDocumentTimeline();`, changing the `new Helios({...})` call, adding an `import`) then applies to `main.js`. The same holds for the other Title explainer fixtures the checklist files define (Schema Check, Caption Own, Audio Test, and the rest).

      **Hot reload does not happen** for the same reason: the page gets no development-server client, so saving `composition.html` or a script reloads nothing. An item that needs a hot reload can be run on a copy whose `main.js` starts with `if (import.meta.hot) { import.meta.hot.on('vite:beforeFullReload', () => {}); }`, which brings the client in; then save a change to `main.js` in place of `composition.html`. Record such an item `blocked` with what the copy showed.

      Creating a composition opens it, which is a switch, and a switch from a connected composition can carry its input props into the new one and save them there (see [switching compositions](../foundations/the-preview-player.md#switching-compositions)). After making all four, delete any `defaultProps` from their `composition.json` files, clear the site's local storage, and reload. [playback.md](playback.md#fixtures) makes further fixtures of its own, and the other files name extra setups at their top; make those when you reach them.
   7. **Between items**, start from the setup each item names (most start from **Fresh**: local storage cleared and the page reloaded), and undo what the item changed on disk. Where a copy is past repair, delete it and make it again from `examples/`.
   8. **After the pass**, stop `helios studio`, delete `verify-examples/` and any other folder an item made beside it (`verify-empty/`, `verify-examples-2/`), and delete the browser profile.
2. Confirm the commit. Every document says `Verified against helios commit c2bfddb`. In `/home/user/helios` run `git log -1 --format=%h -- . ':!product-description'` (not `git rev-parse --short HEAD`, which every commit to `product-description/` moves). If it prints something other than `c2bfddb`, the documents describe a different build and some failures will be drift, not defects.
3. Keep the documents open beside Studio. Read the linked section before each item; the item is a summary, the section is the claim.
4. Work through P1 first across all files, then P2, then P3.
5. Record `pass`, `fail`, or `blocked` in the Result column, with a note for anything other than a clean pass. A fail is something the document says that the product does not do; a blocked item could not be run (no device, no second project, a prior failure in the way, such as PLAYER-49 failing, which blocks every item that needs the transport to drive a composition). For a "(suspected bug)" row, write what happened and whether it matches the document's prediction.
6. File every fail in [`bug-triage.md`](../bug-triage.md): if the entry exists, add a Status line quoting the item ID; if not, add an entry with the item ID under "Raised by". A fail is not automatically a product bug; sometimes the document is wrong, and the fix is to the document. Say which in the Status line.
7. When every P1 and P2 item for a document has passed or been filed, change its row in the [coverage table](../README.md#coverage) from `drafted` to `verified`.

## Devices and conditions

The Device column names what an item needs beyond reading the screen. Several values can be combined (`mouse, disk`; `mouse + keyboard`; `keyboard; disk`). Every value used in the six checklist files is listed here; a file may say more about a value at its top.

- **`mouse`**: a mouse with a notched wheel and a middle button. Chromium reports about 100 wheel units per notch. A trackpad is not a mouse: it scrolls in two directions at once and with inertia, and its pinch arrives as Ctrl and the wheel.
- **`trackpad`**: two-finger scrolling and pinching, for the items about them.
- **`keyboard`**: a physical keyboard with a US English layout. Ctrl/Cmd means Control on Windows and Linux and Command on a Mac; Studio treats both as the same key on every platform.
- **`keyboard layout`**: an operating system layout other than US English (German, for example, where ? is Shift+ß).
- **`Mac`**, **`Windows or Linux`** (also written `Windows/Linux`), and **`Linux`**: the item applies to that platform's keyboard, browser, or file system only. Alt and Option differ: Option with a letter types another character on a Mac. A `Linux` item is about a disk that treats upper and lower case as different, which macOS and Windows disks by default do not.
- **`devtools`**: Chromium's developer tools: Application, Local storage (to read and clear remembered values), the Console, Network request blocking by URL and throttling (Slow 4G or Slow 3G keeps a page or request loading for seconds), and the Elements picker (to measure sizes). Network "Offline" in developer tools blocks the page's own requests; it does not stop the Studio server, and it is not the same condition as `server`.
- **`throttled`**: `devtools` with Network throttling set to "Slow 3G", so that "Creating...", "Saving...", and "Updating..." last long enough to be seen and interrupted; turn it off afterwards.
- **`disk`**: an editor or shell on the files in `verify-examples/`, plus `ffprobe` and an image viewer for downloaded and rendered files. Saving a file a composition uses triggers a hot reload, so make edits deliberately.
- **`terminal`**: a shell. In [playback.md](playback.md) it is a shell in the copy, the same as `disk`; in [assets-and-panels.md](assets-and-panels.md) it is the terminal running `helios studio`, the same as `server` (reading its output, stopping it, and starting it again with extra environment variables).
- **`server`**: the terminal running `helios studio`; stop it with Ctrl+C and start it again with the same command. Stopping the process is the only way to get "the server stops"; a blocked request is a different failure. **`second server`**: a second `helios studio` started while the first runs (it takes the next free port).
- **`second tab`**: another tab of the same browser at the same address. It shares local storage with the first tab, so it is not a second user and not a second browser.
- **`second window`** (also written `other app`): another application's window beside the browser, to take focus from the browser, receive a release, or receive a drop.
- **`second project`**: another folder served by `helios studio` at the same address, after stopping the first; it shares the first one's remembered values.
- **`desktop file`** (also written `desktop drag`): a file dragged in from the operating system's file manager onto the Studio window, with both visible side by side.
- **`picker`**: the browser's own file chooser, opened by the Assets panel's Upload or the Captions panel's file chooser.
- **`blocked storage`**: a browser profile in which site data for `127.0.0.1` is blocked in Chromium's settings, so local storage refuses every read and write.
- **`speakers`** (also written `audio`): speakers or headphones; the item is judged by ear. **`stopwatch`**: a timer, for items with a timing; a screen recording played frame by frame is better for anything under a second.
- **`render`**: a server-side render or client-side export must finish and its frames be counted (`ffprobe -count_frames`, or the duration at the frame rate).
- **`clipboard`**: any application to paste into. **`clipboard denied`**: the Studio address's clipboard permission set to Block in Chromium's site settings, with known text already on the clipboard.
- **`editor`**: `helios studio` started with `LAUNCH_EDITOR` naming an installed code editor (for example `LAUNCH_EDITOR=code`). **`no editor`**: started with no `LAUNCH_EDITOR` and no code editor running.
- **`network`**: internet access, for the package manager a component install runs.
- **`registry`**: a local static file server (for example `python3 -m http.server 8099` in a folder) serving a component registry.
- **`agent`**: an MCP client on the same computer connected to `http://127.0.0.1:5173/mcp` (for example the MCP Inspector).
- **`no Chromium`** and **`repo root`**: special server starts that [help-and-cross-cutting.md](help-and-cross-cutting.md) defines at its top.

Traps that apply to many items:

- A hidden or fully covered browser window stops drawing animation frames, so playback, a clock-bound composition, and every timing are only meaningful with the Studio window visible.
- Switching to another application while holding a mouse button (for the "Window loses focus" items) is done with Alt+Tab or Cmd+Tab; come back with the keyboard too, so that no click is made on the page by accident.
- Two clicks on the composition within the double-click interval enter fullscreen. Wait at least a second between clicks unless the item wants a double-click.
- An item that switches compositions can leave carried-over input props in the next composition's `composition.json`. Check the test compositions' files after such items.

## Driving the product from a console or script

The Studio page has no global handle of its own, but three things can be reached from the browser's console and are useful for setting up an exact starting state and for reading state back after a real interaction:

- **The player.** `document.querySelector('helios-player')` is the player element. Its `getController()` returns `null` until the player has found the composition, and then an object whose `getState()` gives the composition's state as Studio sees it: `currentFrame`, `isPlaying`, `playbackRate`, `volume`, `muted`, `inputProps`, the duration and frame rate. The element's own `currentTime`, `paused`, and `duration` work too.
- **The composition's own clock.** The composition's page runs in the same origin, so `document.querySelector('helios-player').shadowRoot.querySelector('iframe').contentWindow.helios` is the composition's Helios instance (or choose the composition's frame as the console's context and use `helios`). Its `getState()` is the truth for the clock-bound items: compare it with what Studio shows.
- **Remembered and saved state.** Local storage holds every remembered value under `helios-studio:` keys: `sidebar-active-tab`, `stage-zoom`, `stage-pan`, `stage-transparent`, `stage-guides`, `timeline-zoom`, `active-composition-id`, `render-config`, and `timeline:{composition ID}`; the three layout sizes are `helios-layout-sidebar`, `helios-layout-inspector`, and `helios-layout-timeline`. Values are JSON, so a composition ID is stored with its quotes. What the server sees can be read with `await (await fetch('/api/compositions')).json()`, and likewise `/api/assets`, `/api/jobs`, and `/api/templates`; what is on disk, with a shell in the copy.

Use the console to observe and to set up, not to gesture. Where an item is about input, the input must be real:

- A key event made in a script is untrusted, so the browser performs no default action for it whether Studio cancels it or not. The items about the keys Studio cancels (Enter submitting, Space or Enter pressing a button, ↑ and ↓ stepping a field) cannot be checked by script at all.
- A key event sent to the window reaches Studio's shortcuts but not the player, which listens on its own element first. The player's keys need real keys with the player focused.
- Scripted mouse events do not reproduce the browser's own behavior around them: a click after a drag, a release outside the window, a context menu, drag and drop of files, fullscreen.
- Calling `play()` or `seek()` on the composition's `helios` bypasses Studio. It is acceptable for putting a composition on a frame before an item, never as the item's step.
- A scripted pass in a hidden or headless window does not draw animation frames the way a visible one does, so it cannot judge playback, clock-bound behavior, or timings, and it sees nothing of what is drawn.

## Results so far

One pass has been run, an automated one, on 2026-10-07, against commit `c2bfddb` (step 2's command printed `c2bfddb`). No document has been changed to `verified` in the [coverage table](../README.md#coverage): every one still has failures, blocked items, or items the pass could not run. Building the surface for this protocol found one defect before any item was run: the root `npm run build` fails at this commit because it never builds `packages/infrastructure` (see step 1 of [How to run a pass](#how-to-run-a-pass), and [B-73](../bug-triage.md#b-73-the-repositorys-npm-run-build-fails-because-it-never-builds-packagesinfrastructure)). That is about building Helios, not about Studio's behavior.

**How it was run.** Playwright 1.60 drove Chromium 141 on Linux with real mouse and keyboard input (Playwright's pointer and key events, which the page receives as a user's), in a 1600 by 900 window on a virtual display. One batch of P2 items for the timeline, the playback range, and the timeline tracks ran headless; the finding it produced ([B-84](../bug-triage.md#b-84-zooming-the-timeline-in-widens-the-whole-middle-column-instead-of-scrolling-the-track-area)) was then confirmed headed. Studio ran from a throwaway `verify-examples/` copy, started with `node ../packages/cli/bin/helios.js studio` and started again for each batch and wherever an item stops the server. State was read from the player's controller, the composition's `helios`, `/api/*`, local storage, and the files on disk; every step was made with real input. Server-side renders used the Chrome Headless Shell that the server downloaded on the pass's first diagnostics check. Where the setup could not be followed as written, the pass did this instead, and says so in the item's note:

- Every Title explainer test composition has its script in `main.js` (see step 6), and the playback items ran on copies without `bindToDocumentTimeline()`, because the clock-bound check failed first ([B-07](../bug-triage.md#b-07-studios-transport-and-timeline-cannot-control-a-clock-bound-composition-which-is-every-template-and-nearly-every-example)).
- Items that need a hot reload are `blocked` ([B-74](../bug-triage.md#b-74-studio-serves-composition-pages-untouched-so-the-title-explainer-template-never-connects-and-nothing-hot-reloads)); where it helped, the note says what a copy with the `import.meta.hot` line showed.
- Client-side exports were made as WebM, because this Chromium has no H.264 or AAC encoder.
- Caption cues were typed, or their file was handed to the Captions panel's file input directly, never through the file picker; the Components items ran in the copy itself, with `helios.config.json` and `package.json` added at its root; `editor` used a small script as `LAUNCH_EDITOR`; Network throttling was set through the DevTools protocol; a second tab was a second Playwright page.

**Items run.**

| File | Items | Run | Pass | Fail | Blocked | Not run |
| --- | --- | --- | --- | --- | --- | --- |
| [foundations.md](foundations.md) | 359 | 316 | 243 | 49 | 24 | 43 |
| [playback.md](playback.md) | 292 | 253 | 214 | 24 | 15 | 39 |
| [stage-and-output.md](stage-and-output.md) | 378 | 309 | 254 | 33 | 22 | 69 |
| [compositions-and-props.md](compositions-and-props.md) | 465 | 427 | 353 | 58 | 16 | 38 |
| [assets-and-panels.md](assets-and-panels.md) | 433 | 244 | 209 | 16 | 19 | 189 |
| [help-and-cross-cutting.md](help-and-cross-cutting.md) | 248 | 217 | 186 | 15 | 16 | 31 |
| Total | 2175 | 1766 | 1459 | 195 | 112 | 409 |

By priority: 446 of the 464 P1 items, 1313 of the 1511 P2 items, and 7 of the 200 P3 items were run. Each result is in its row, marked `(auto)`.

**What the failures were.** Of the 195 failures, 130 are "(suspected bug)" rows whose defect was reproduced (most as the documents predicted), and 41 are other claims the product does not meet; all are filed in [`bug-triage.md`](../bug-triage.md). In the other 24 the document or the row was wrong, and the note says what was corrected. The clock-bound claim was checked first and confirmed: a clock-bound composition runs on its own clock whatever Studio's transport does. The keyboard defects ([B-04](../bug-triage.md#b-04-enter--and--lose-their-browser-action-on-the-whole-page-and-space-never-presses-a-button), [B-05](../bug-triage.md#b-05-with-the-player-focused-keys-act-twice-once-in-the-player-then-again-in-studio)), deleting a composition ([B-02](../bug-triage.md#b-02-deleting-a-composition-from-the-compositions-panel-and-removing-a-component-from-the-components-panel-never-reach-the-server)), the slow auto-save ([B-09](../bug-triage.md#b-09-the-props-editors-auto-save-never-comes-while-playing-or-for-a-clock-bound-composition), 4 to 31 seconds rather than about one), and the carry-over between compositions ([B-08](../bug-triage.md#b-08-switching-compositions-carries-the-previous-compositions-input-props-playhead-and-playing-state-into-the-new-one), [B-10](../bug-triage.md#b-10-a-pending-auto-save-is-written-into-the-composition-being-opened-instead-of-the-one-that-was-edited), [B-42](../bug-triage.md#b-42-after-a-switch-studio-goes-on-using-the-previous-compositions-length-frame-rate-props-playhead-and-schema)) were all confirmed.

**Triage.** Every high entry was confirmed (for B-12 only the cause could be seen), and so were most of the others; each entry the pass touched has a Status line naming the items. B-59 and B-71 could not be checked, and five entries were not reached because the items that show them need a file picker or a desktop drag (B-13, B-14, B-15, B-26, B-67). The pass added fourteen entries from what it observed, B-74 to B-87. Four suspected defects raised in documents' open questions did not reproduce, and those documents now say so: Escape in the timeline's timecode field (TIMELINE-49) and in an asset's rename field (ASSETACTIONS-87) cancelled as intended, and renders started from the Renders panel completed for `simple-canvas-animation` and for a Title explainer composition (SERVERRENDER-04, SERVERRENDER-05).

**Not covered.** Nothing was judged by eye or by ear: colors, layout and drawing judged by looking, the feel of timings, and sound are not covered, apart from rendered frames the pass extracted and read. Nor are drags from the desktop, the browser's file picker, the operating system's dialogs, the window losing focus to another application, the pointer leaving the browser window, a trackpad, Mac and Windows behavior, or a second device. The automation could not reproduce a hidden tab (a second tab left the first one visible), held keys (scripted keys do not repeat), Escape leaving the browser's fullscreen, the browser's own select lists and suggestion lists, acting on the page while a browser prompt is open, a refused clipboard write, or file permissions (it ran as root); the items that need these are `blocked` or not run. P3 items were left almost entirely for a person.
