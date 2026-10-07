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
      | Verify Title | `verify-title` | Template Title explainer; 1920 by 1080, 30 FPS, 5 seconds. Left as written. | A composition that connects and has input props (`title`, `subtitle`); clock-bound behavior; the Props Editor on an unmodified template. |
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

      This was written from the source, not run. If Verify Media shows "Error: ..." or never connects, read the browser console and adjust it before using it.

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

No pass has been run yet. Every document is `drafted` in the [coverage table](../README.md#coverage), and none is `verified`. Building the surface for this protocol has been done once, and it found one defect before any item was run: the root `npm run build` fails at this commit because it never builds `packages/infrastructure` (see step 1 of [How to run a pass](#how-to-run-a-pass), and [B-73](../bug-triage.md#b-73-the-repositorys-npm-run-build-fails-because-it-never-builds-packagesinfrastructure)). That is about building Helios, not about Studio's behavior, so it changes no document's status.
