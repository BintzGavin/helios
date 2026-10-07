# Project and compositions

## Summary

This document owns what Studio knows about the files on disk: what the project is, what counts as a composition and how Studio finds it, how a composition's ID and name come from its folder, what `composition.json` and `thumbnail.png` hold and when Studio writes them, what each template writes, what counts as an asset, where renders go, what is saved where, what happens when a request to the server fails, and what happens when the project changes on disk without Studio's knowledge. Feature documents say what they read or write and link here for the rules.

Everything here is done by the Studio server, inside the [project](../glossary.md#compositions-and-files). The Studio page never touches the disk directly; it asks the server, and lists what the server reports.

## The project

The project is the folder `helios studio` was started in. The server binds itself to that folder when it starts and cannot be pointed at another one without restarting; a second project needs a second `helios studio` process, on another port.

The server makes the project's files available to the page and the player. A composition's page is loaded from its absolute path on disk, so anything the composition imports with a relative path resolves inside its folder, and anything it imports by package name resolves through the project's `node_modules`.

> Technical note: Studio runs inside the project's own Vite development server, which loads the project's `vite.config` file if there is one. Framework compositions (React, Vue, Svelte, Solid) depend on the project having that framework and its Vite plugin installed and configured.

## Compositions

### How Studio finds compositions

A composition is any folder in the project that contains a file named exactly `composition.html`. Studio finds them by walking the project from its root:

- It skips folders named `node_modules`, `.git`, `dist`, `build`, and `.helios`, wherever they are.
- When a folder contains `composition.html`, that folder is a composition and Studio does not look inside it for more. A composition nested inside another composition's folder is never found.
- A folder that cannot be read is skipped.
- There is no limit on depth and no order; the Compositions panel and the Omnibar sort what they show.

The walk happens when the Studio page loads, and again after Studio itself creates or duplicates a composition or sets a thumbnail. It does not happen when files change on disk (see [When the project changes underneath Studio](#when-the-project-changes-underneath-studio)). Saving settings (including a rename), the Props Editor's auto-save, and deleting update Studio's list in place without a new walk.

### Composition IDs and names

A composition's **ID** is its folder's path from the project root, with forward slashes on every platform: `simple-canvas-animation`, `scenes/intro`. Studio uses the ID to remember things per composition (its [timeline state](../glossary.md#the-preview)) and to address it in every request.

A composition's **name** is made from the last part of its folder path: the folder name is split at hyphens and the first letter of each part is capitalized. `simple-canvas-animation` is shown as "Simple Canvas Animation"; `my_intro` is shown as "My_intro"; `v2-final` as "V2 Final". The name is never stored anywhere. Two compositions in different folders with the same folder name show the same name.

Each composition also carries a **description**, which the Omnibar shows under its name. After a walk, the description is the ID. After its settings are saved or its input props are auto-saved, it becomes "Example: {name}" until the next walk.

A `composition.html` directly in the project root makes a composition with an empty ID, named after the project folder. Studio lists it and plays it, but every request that names a composition by its ID refuses it: its settings cannot be saved, it cannot be renamed or deleted, its thumbnail cannot be set, and the Props Editor's auto-save fails (see [Open questions](#open-questions-and-verification)).

### Where new compositions go

Studio creates and duplicates compositions at the top level of the project, in a folder named from the name the user typed: lowercase, every character other than a to z, 0 to 9, and hyphen replaced by a hyphen, runs of hyphens collapsed, and hyphens trimmed from both ends. "My Amazing Video!" becomes `my-amazing-video`. A name that leaves nothing ("!!!") is refused with "Invalid composition name". A folder that already exists is refused with `Composition "{name}" (directory: {folder}) already exists`.

Renaming moves the composition's folder to the top level of the project under the new folder name, wherever it was before. See `compositions/composition-settings.md`.

## Composition metadata

A composition folder may contain `composition.json` with these fields:

| Field | Meaning | What Studio does with it |
| --- | --- | --- |
| `width`, `height` | Pixels | Sets the [canvas size](../glossary.md#the-preview) whenever Studio's copy of the composition changes: when it is opened, and again after its settings are saved or its input props are auto-saved. Shown and edited in Composition Settings. |
| `fps` | Frames per second | Shown and edited in Composition Settings. Does not change playback, renders, or exports, which use the frame rate the composition's own code reports. |
| `duration` | Seconds | Shown and edited in Composition Settings. Does not change playback, renders, or exports, which use the duration the composition's own code reports. |
| `defaultProps` | An object | Applied to the composition as its input props when it is opened, before the user changes anything. |

Studio writes the file in three situations:

1. **New Composition** writes all four size and time fields, from the dialog.
2. **Composition Settings, Save** writes all four size and time fields from the dialog, keeping any other fields in the file.
3. **The Props Editor's auto-save** writes the input props as `defaultProps` about one second after they stop changing, together with the size and time fields as Studio last read them. If the composition had no `composition.json`, the file it creates says 1920 by 1080, 30 frames per second, and 10 seconds, whatever the composition really is. See `props/the-props-editor.md`.

A `composition.json` that is not valid JSON is treated as absent: the composition is listed with no metadata, its canvas size is left as it was, and a warning is printed in the terminal running `helios studio`.

## Thumbnails

A composition's thumbnail is `thumbnail.png` in its folder. Studio shows it in the Compositions panel, the Omnibar, and Composition Settings, and writes it only when the user presses "Set from Current Frame" in Composition Settings: the current frame, scaled down to at most 320 pixels wide. Duplicating a composition copies its thumbnail.

## Templates

The New Composition dialog writes one of these into the new folder, plus `composition.json`:

| Template | Files written | Connects to the player |
| --- | --- | --- |
| Title explainer | `composition.html` (a canvas animation with `title` and `subtitle` input props) | Yes |
| Vanilla JS (the dialog's default) | `composition.html` (a white circle moving on black) | No |
| React | `composition.html`, `index.tsx` | No |
| Vue | `composition.html`, `main.ts`, `App.vue`, `composables/useVideoFrame.ts` | No |
| Svelte | `composition.html`, `main.ts`, `App.svelte`, `lib/store.ts` | No |
| Solid | `composition.html`, `main.tsx`, `App.tsx`, `style.css`, `lib/createHeliosSignal.ts` | No |
| Three.js | `composition.html` | No |

Each template bakes the frame rate and duration typed in the dialog into its code. The Solid template adds `-solid` to the folder name unless the name already contains "solid".

Only the Title explainer template makes its Helios instance available to the player. A composition made from any other template loads, but the player never connects to it and shows "Connection Failed..." after 5 seconds. See [the preview player](the-preview-player.md#connecting) and the open questions below.

## Assets

Assets are the files Studio lists in the Assets panel. Where they come from depends on the project:

- If the project root has a `public/` folder, assets are everything under `public/`, and each is served at its path inside `public/` (`public/logo.png` at `/logo.png`).
- Otherwise assets are everything under the project root, including the composition folders, the [renders folder](../glossary.md#compositions-and-files), and thumbnails, and each is served at its absolute path on disk.

Folders named `node_modules`, `.git`, `dist`, `build`, and `.helios` are skipped. A file is listed only if its extension is one Studio recognizes:

| Type | Extensions |
| --- | --- |
| Image | `.png` `.jpg` `.jpeg` `.gif` `.svg` `.webp` |
| Video | `.mp4` `.webm` `.mov` |
| Audio | `.mp3` `.wav` `.aac` `.ogg` |
| Font | `.ttf` `.otf` `.woff` `.woff2` |
| Model | `.glb` `.gltf` |
| JSON | `.json` |
| Shader | `.glsl` `.vert` `.frag` |

Every other file is not listed. Every folder is listed, even an empty one. Uploads go into `public/` if it exists and into the project root otherwise. The list is read when the page loads and again after every upload, rename, move, delete, and new folder made in Studio. See `assets/the-assets-panel.md`.

## Renders

Server-side renders are written to `renders/` at the project root, created when the first render starts: each output is `render-{id}.mp4`, and the job history is `renders/jobs.json`. The history is read when the server starts, so past jobs reappear after a restart; a job that was queued or rendering when the server stopped comes back as failed, with the error "Server restarted during render". Deleting a job in the Renders panel deletes its output file. See `output/server-renders.md`.

## What is saved where

| What | Where it lives | When it is written |
| --- | --- | --- |
| A composition's files | Its folder | New Composition, Duplicate, renaming (moves the folder), deleting (removes the folder and everything in it) |
| Canvas width and height, frame rate, duration | `composition.json` | New Composition; Composition Settings, Save |
| Default props | `composition.json` | The Props Editor's auto-save, about one second after the input props stop changing |
| Thumbnail | `thumbnail.png` | Composition Settings, "Set from Current Frame" |
| Assets | `public/` or the project root | Upload, rename, move, delete, new folder |
| Render outputs and history | `renders/` | When a render is started, finishes, fails, is cancelled, or is deleted |
| In and out points, loop, playhead position | The browser, per composition ID | See [what Studio remembers](the-workspace.md#what-studio-remembers) |
| Stage view, guides, grid, layout, sidebar tab, timeline zoom, render settings, active composition | The browser | See [what Studio remembers](the-workspace.md#what-studio-remembers) |
| Canvas size changed on the stage toolbar | Nowhere | Lost when another composition is opened or the page reloads |
| Playback rate, volume, mute, per-track audio mix | Only in the running composition | Lost on reload and on hot reload |

Nothing Studio saves to disk can be undone from Studio. There is no trash: deleting a composition or an asset removes it from the disk at once.

## When a request fails

Studio has no offline mode and retries nothing. When the Studio server cannot be reached or answers with an error, each feature behaves in one of three ways:

| Behavior | Requests |
| --- | --- |
| **Reports the failure.** An error toast with the server's message, and for dialogs the same message inside the dialog, which stays open. | Create composition, duplicate, save settings, the Props Editor's auto-save, delete composition, move asset, new folder, rename asset ("Failed to rename asset"), download job spec, capture a thumbnail ("Failed to capture thumbnail") |
| **Fails silently.** Nothing is shown; the terminal or the browser console has the error. | Listing compositions, assets, and templates when the page loads; polling render jobs every second; uploading a thumbnail after it was captured; opening a file in the editor |
| **Reports success anyway.** The success toast appears even if the server refused, because Studio does not look at the answer; only a network failure shows an error. | Upload asset ("Asset uploaded successfully"), delete asset ("Asset deleted"), start render ("Render started"), cancel render ("Render cancelled"), delete render job ("Render job deleted") |

If the compositions list fails to load, the stage shows the "Welcome to Helios Studio" empty state, as if the project had no compositions.

## When the project changes underneath Studio

Studio does not watch the project folder. What it shows is what it last read:

- **A composition added on disk** does not appear until the page is reloaded (or until Studio creates or duplicates a composition, which walks the project again).
- **A composition deleted or renamed on disk** stays in the list under its old ID until the page is reloaded. Opening it loads a page that no longer exists; the player never connects and shows "Connection Failed..." after 5 seconds. Saving its settings or deleting it fails with "Composition ... not found".
- **A `composition.json` edited on disk** is not re-read. Composition Settings shows the old values, and saving them, or the Props Editor's next auto-save, writes Studio's old size and time fields back over the edit.
- **A composition's code edited on disk** is picked up at once: the player reloads it. See [hot reload](the-preview-player.md#hot-reload).
- **Assets added, renamed, or deleted on disk** appear after the next reload or after any asset change made in Studio, which re-reads the whole list.
- **Render jobs** are read every second, so a render started by another tab or by an agent appears in the Renders panel within a second. `renders/jobs.json` edited on disk is not re-read while the server runs.

Who else changes the project, and how Studio looks to the user meanwhile, is described in `cross-cutting/changes-from-outside-studio.md`.

## Edge cases

- **Remembered state follows the ID.** Studio remembers a composition's timeline state under its ID. Renaming gives the composition a new ID, so its in and out points, loop, and playhead position are forgotten. A new composition that reuses an old ID, in this project or in another project served at the same address, inherits the old one's timeline state.
- **Compositions inside compositions.** A folder with its own `composition.html` inside another composition's folder is never listed, even though it is a complete composition.
- **Renders as assets.** In a project without `public/`, every finished render appears in the Assets panel as a video, and so does every thumbnail as an image.
- **The canvas size can be stale.** A composition without `composition.json`, or with an unreadable one, opens at whatever canvas size the previous composition left.
- **Moving a composition by renaming.** Saving Composition Settings for a composition in a subfolder moves it to the top level of the project even if the name was not changed. Saving settings for a top-level composition whose folder name has capitals or characters other than letters, digits, and hyphens renames its folder too (`My_Comp` becomes `my-comp`). See `compositions/composition-settings.md`.
- **Odd names after an auto-save.** After the Props Editor's auto-save, Studio rebuilds the composition's name from its whole ID rather than its folder name, so a composition in a subfolder is shown as, for example, "Scenes/intro Card" instead of "Intro Card" in the header and the Omnibar until the page is reloaded.

## Open questions and verification

- Only the Title explainer template connects to the player. A composition made with the default Vanilla JS template, or React, Vue, Svelte, Solid, or Three.js, never makes its Helios instance available, so the player shows "Connection Failed..." and the transport stays disabled. Confirm by creating one of each. This looks like a bug in the templates rather than intended behavior.
- A composition at the project root has an empty ID, and every request that names a composition refuses an empty ID. Confirm, and confirm what the Props Editor's auto-save does with it: the code suggests an error toast ("ID is required") that repeats roughly every second while the composition is open. This may be worth treating as a bug.
- Confirm the three failure behaviors in [When a request fails](#when-a-request-fails), especially the requests that report success without checking the answer. Those may be worth treating as bugs.
- Confirm that `fps` and `duration` in `composition.json` have no effect on playback, renders, or exports when they disagree with the composition's code.
- Confirm that the Props Editor's auto-save writes 10 seconds as the duration for a composition that had no `composition.json`, while New Composition's default is 5 seconds.
- Read from `server/discovery.ts`, `server/discovery.test.ts`, `server/plugin.ts`, `server/render-manager.ts`, `server/templates/`, and `context/StudioContext.tsx`; not yet confirmed by hand.

Verified against helios commit `c2bfddb`
