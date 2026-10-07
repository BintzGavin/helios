# Glossary

The vocabulary used across these documents. When a document uses one of these words, it means exactly this. Where Studio's interface has its own wording, the term uses it and says so.

## The workspace

**Studio.** Helios Studio: the browser app that `helios studio` serves for one project, at `http://127.0.0.1:5173/` unless that port is taken. "The Studio page" is the browser tab showing it; "the Studio server" is the `helios studio` process behind it. One server is bound to one project for its whole life.

**Workspace.** Everything on the Studio page at once: the *header*, the *sidebar*, the *stage*, the *inspector*, and the *timeline panel*, arranged in a fixed grid. The [workspace](foundations/the-workspace.md) document owns the layout.

**Header.** The 40-pixel strip across the top. It shows "Helios Studio", the *composition button* (the active composition's name, or "Select Composition..." when none is open, with a "⌘K" hint on every platform), which opens the *Omnibar*, and a "+" button titled "New Composition".

**Sidebar.** The left column. Six tabs across its top, in this order: Compositions, Assets, Components, Captions, Audio, Renders. Three buttons in its footer: ✨ (Helios Assistant), 🩺 (System Diagnostics), and ? (Keyboard Shortcuts). One tab is shown at a time.

**Stage.** The center area where the composition is shown, at the *canvas size*, inside the *stage view*. It also holds the *stage toolbar* in its bottom-right corner and, when no composition is open, an *empty state*.

**Stage toolbar.** The small bar at the bottom right of the stage: canvas size presets and width and height fields, Fit, zoom out (-), the zoom percentage, zoom in (+), snapshot (📷), transparency grid (🏁), safe-area guides (#), and Composition Settings (⚙️).

**Inspector.** The right column, titled "Properties" (the UI's word). It holds the *Props Editor*.

**Timeline panel.** The bottom-center area, titled "Timeline". It holds the *transport controls* on the left and the *timeline* on the right.

**Panel divider.** One of three invisible 10-pixel strips that resize the sidebar (150 to 600 pixels wide), the inspector (200 to 600 pixels wide), and the timeline panel (100 to 800 pixels tall). It turns blue while hovered or dragged.

**Empty state.** What the stage shows when no composition is open: "Welcome to Helios Studio" with a "+ Create Composition" button when the project has no compositions, or "No Composition Selected" with a "Select Composition (⌘K)" button when it has some.

**Dialog.** A box shown over a dark overlay that covers the whole page: the Omnibar, Keyboard Shortcuts, New Composition, Duplicate Composition, Composition Settings, System Diagnostics, Helios Assistant, Render Preview, and the confirmation dialogs. Clicking the overlay closes any of them. Only the Omnibar, Keyboard Shortcuts, and the confirmation dialogs close on Escape. A dialog does not block Studio's keyboard shortcuts unless keyboard focus is in one of its text fields.

**Omnibar.** Studio's command palette (the UI's name for it), opened with Ctrl/Cmd+K or the composition button. It searches commands, compositions, and assets.

**Toast.** A short notification that slides in at the bottom right of the page and disappears by itself after 3 seconds (2 seconds for "Composition reloaded"), or when its × is clicked. Toasts stack upward, newest at the bottom; a colored stripe on the left marks the kind: green for success, blue for info, orange for warning, red for error.

## Compositions and files

**Project.** The folder `helios studio` was started in, and everything under it. Also called the *project root*. Studio reads and writes only inside it, and cannot be pointed at another project without restarting the server.

**Composition.** A folder in the project that contains a file named `composition.html`. Studio finds compositions by scanning the project when the page loads, skipping folders named `node_modules`, `.git`, `dist`, `build`, and `.helios`, and not looking inside a folder once it has found a composition there. The [project and compositions](foundations/project-and-compositions.md) document owns the details.

**Composition ID.** The composition folder's path relative to the project root, with forward slashes (`simple-canvas-animation`, `scenes/intro`). It is what Studio uses to remember things per composition. A `composition.html` directly in the project root has an empty ID.

**Composition name.** The name Studio shows. It is derived from the composition folder's own name, never stored: the folder name is split at hyphens and each part is capitalized ("simple-canvas-animation" becomes "Simple Canvas Animation"). Renaming a composition therefore renames its folder.

**Active composition.** The composition open in the stage. There is at most one. It is *remembered* and reopened when the page loads.

**Composition metadata.** The optional `composition.json` file in a composition folder: `width`, `height`, `fps`, `duration` (in seconds), and `defaultProps`. Studio uses the width and height as the *canvas size* when the composition opens and applies the default props to it. The frame rate and duration in this file do not change how long the composition plays; the composition's own code decides that.

**Default props.** The `defaultProps` object in `composition.json`. Studio applies it to the composition when it opens, and the Props Editor rewrites it automatically about a second after the input props stop changing.

**Thumbnail.** A `thumbnail.png` file in the composition folder, shown in the Compositions panel and the Omnibar. Studio writes it from the current frame when asked (Composition Settings, "Set from Current Frame").

**Template.** One of the starting points the New Composition dialog offers: Title explainer, Vanilla JS (the default choice), React, Vue, Svelte, Solid, and Three.js.

**Asset.** A file Studio lists in the Assets panel: an image, video, audio, font, 3D model, JSON, or shader file, recognized by its extension, or a folder. Assets are taken from the project's `public/` folder if it exists, otherwise from the whole project.

**Renders folder.** The `renders/` folder at the project root, where server-side renders are written as `render-{id}.mp4`, next to `jobs.json`, the render job history.

## The preview

**Player.** The `<helios-player>` element in the stage that loads the active composition's page and drives it. In Studio it has no controls bar of its own; Studio's *transport controls* and *timeline* replace it.

**Connected.** The player is connected when it has found the composition's Helios instance and Studio has noticed (Studio checks every 200 milliseconds). Until then the transport controls are disabled, the Props Editor says "No active controller", and the timeline shows placeholder numbers. A composition that has not connected within 5 seconds shows "Connection Failed..." in the stage.

**Clock-bound composition.** A composition that binds itself to the browser's document clock (its code calls `bindToDocumentTimeline()`), as every example and every Studio template does. In an ordinary browser tab the code makes such a composition take its frame from that clock, so it keeps advancing on its own and Studio's seeks and pauses do not hold. The [preview player](foundations/the-preview-player.md#clock-bound-compositions) document owns this behavior; it is the first thing verification checks.

**Hot reload.** The player reloading the composition's page because a file the composition uses changed on disk. Studio notices the new connection and puts back the frame, the playing state, and the input props it last saw.

**Canvas size.** The width and height, in composition pixels, at which the player is laid out in the stage and at which renders and exports are made. It is set from the composition's metadata when the composition opens and can be changed from the stage toolbar. It is not remembered.

**Frame.** One still image of the composition. Frames are numbered from 0. A composition with a duration of 5 seconds at 30 frames per second has *total frames* of 150, and Studio lets the playhead go anywhere from frame 0 to frame 150 inclusive.

**Current frame.** The frame the composition is showing. While playing it advances in fractions of a frame, so after a pause it can be a fractional number such as 45.73; the timecode shows it rounded down and the "Fr:" readout rounded to the nearest frame.

**Total frames.** The composition's duration multiplied by its frame rate. Until the player is connected the timeline uses 100 as a placeholder.

**Timecode.** A position written as hours, minutes, seconds, and frames, `HH:MM:SS:FF`, two digits each. At 30 frames per second, frame 45 is `00:00:01:15`.

**Playhead.** The vertical line on the timeline at the current frame.

**Playing / paused.** Whether the current frame is advancing on its own. When playback reaches the end of the *playback range* with *loop* off, it stops and the composition is paused there.

**Playback rate.** How fast and in which direction playback advances: -4, -2, -1, 0.25, 0.5, 1, 2, or 4 times real time. Negative rates play in reverse. It belongs to the composition and goes back to 1 when the composition reloads.

**In point / out point.** The first and last frame of the *playback range*, set with I and O or by dragging the blue markers on the timeline. The out point is never less than the in point plus 1.

**Playback range.** The span from the in point to the out point. Playback stops or loops at its ends; server-side renders and client-side exports cover exactly this span. When it covers the whole composition, Studio clears it in the composition and plays the full length.

**Loop.** Whether playback wraps from the end of the playback range back to its start (or, in reverse, from the start to the end) instead of stopping. Off by default; remembered per composition.

**Timeline state.** The record Studio remembers for each composition ID: in point, out point, loop, and the frame the playhead was on. It is restored when the composition opens.

**Input props.** The values the composition is drawn with, such as a title or a color. The composition declares them; the Props Editor shows and changes them. A change applies to the preview at once.

**Schema.** The composition's optional description of its input props: each prop's type, label, limits, and group. With a schema, the Props Editor shows a field made for each type; without one, it guesses from each value.

**Markers.** Named points in time that the composition declares. They show on the timeline as small colored ticks.

**Captions.** Timed text cues the composition carries. They show on the timeline as bars and can be edited in the Captions panel.

## The stage view

**Stage view.** How the composition is framed in the stage: its *zoom* and its *pan*. The [stage view](stage/the-stage-view.md) document owns it.

**Zoom (stage).** The scale at which the composition is drawn in the stage, shown in the stage toolbar as a percentage. 100% draws one composition pixel as one screen pixel. It ranges from 10% to 500%.

**Pan.** How far, in screen pixels, the composition is moved from the center of the stage, horizontally and vertically.

**Fit.** The stage toolbar button titled "Fit to Screen". It sets the zoom to 100% and the pan to zero; it does not scale the composition to the stage's size.

**Transparency grid.** The checkerboard drawn behind the composition (on by default), toggled with 🏁.

**Safe-area guides.** Dashed overlays on the composition, toggled with # or the ' key: an action-safe frame at 5% from each edge (cyan), a title-safe frame at 10% (yellow), and a center crosshair.

## Interactions

**Interaction.** The unit these documents narrate: anything the user starts with one input and that ends with another. A mouse press and its release, a key press, opening a dialog and closing it, starting playback and its stopping, starting a render and its completion. Every interaction has five phases: *starting*, *ending at once*, *becoming ongoing*, *while ongoing*, and *finishing*.

**Ongoing.** An interaction is ongoing from the moment it can no longer end at once: for a mouse drag, the first mouse move with the button held (Studio has no distance threshold, so a one-pixel move counts); for a dialog, the first edit; for an inline field, the first keystroke; for playback, the first frame advance; for a render, the server accepting the job. A keyboard shortcut is never ongoing unless the key is held and repeats.

**Drag.** A mouse interaction that became ongoing: the button went down on something, and the mouse moved before it came up. Studio's drags start on a press with no threshold and follow the pointer at once.

**Click.** A press and release of the mouse button on the same element. The browser fires a click even if the mouse moved in between, which matters on the composition (see [the preview player](foundations/the-preview-player.md#the-player-inside-the-stage)).

**Shortcut.** A key, with or without modifiers, that Studio acts on wherever the pointer is. The [input model](foundations/input-model.md#the-shortcut-map) owns the full list.

**Keyboard focus.** Where key presses go. For these documents it is one of three places: a *text field*, the *player*, or elsewhere (the page, a button, a slider). Most shortcuts are ignored while focus is in a text field.

**Text field.** Any text input, number input, text area, drop-down menu (`select`), or editable text. Studio treats them all the same when deciding whether to ignore a shortcut.

**Commit.** To make an interaction's result durable: an in point set, a field's value applied, a file written. **Discard** is the opposite: the interaction ends and leaves things as they were before it started.

## Events that end or interrupt an interaction

These are the rows of every "Cancel and interrupt" table. The [input model](foundations/input-model.md#the-interrupt-rows) defines what each one does in Studio in general; each document says what it does to that feature.

**Escape.** The Escape key. Studio has no general Escape behavior: it closes the Omnibar, the Keyboard Shortcuts dialog, and the confirmation dialogs, and cancels editing in the timecode field and the inline rename fields. It does not stop drags, playback, renders, or exports.

**Another shortcut, click, or command.** The user doing something else before the interaction is over: pressing a shortcut, clicking another control, running an Omnibar command, or opening a dialog.

**Composition switched.** The active composition changing, from the Compositions panel, the Omnibar, or as a side effect of creating, duplicating, renaming, or deleting a composition. The player is replaced and must connect again.

**Window loses focus.** Another window or application takes focus, or the Studio tab is hidden. Studio does not listen for this; whatever was in progress continues, and a mouse button released elsewhere is never seen.

**Pointer leaves the window.** The pointer leaves the element an interaction started on, or the browser window, or the mouse button is released outside it.

**Server request fails or server stops.** A request from the Studio page to the Studio server fails, returns an error, or never answers, or the `helios studio` process stops. Studio has no general offline handling; each feature handles a failure its own way, and several report success anyway.

**Reload or tab closed.** The Studio page is reloaded, closed, or navigated away. What was *remembered* comes back; what was only on the page is gone. What is in progress on the server (a render) continues.

**Hot reload.** See the term above. As an interrupt row, it asks what happens to an interaction when the composition reloads under it.

**Project changed on disk.** Files in the project added, renamed, or deleted by anything other than this Studio page: the user's editor or file manager, another Studio tab, or an agent working through Studio's MCP server. Studio lists compositions and assets when the page loads and after its own changes, and does not watch the folder.

## Persistence

**Saved.** Written to a file in the project by the Studio server. Saved things survive anything that happens to the browser, and are seen by every Studio tab after a reload.

**Remembered.** Kept in this browser's local storage for the Studio page's address. Remembered things survive a reload of the same address in the same browser profile, are not seen by another browser or profile, and are shared by every project served at the same address and port. The [workspace](foundations/the-workspace.md#what-studio-remembers) document lists them all.

## Rendering and output

**Render job.** A server-side render of the active composition, started from the Renders panel or the Omnibar. Its status is one of queued, rendering, completed, failed, or cancelled, shown in the UI in those lowercase words. Jobs are saved in the renders folder and survive a restart; a job that was queued or rendering when the server stopped comes back as failed with "Server restarted during render".

**Render settings.** The options in the Renders panel that shape a server-side render and a client-side export: mode (canvas or DOM), codec, bitrate, scale, and the like. They are remembered for all compositions.

**Client-side export.** Rendering the playback range to an MP4 or WebM file inside the browser, without the server, and downloading it.

**Snapshot.** A PNG of the current frame as captured from the composition, downloaded by the browser as `snapshot-{composition name}-{frame}.png`.

**Job spec.** A JSON file describing how to render the playback range in chunks with the `helios` CLI, downloaded as `job-{timestamp}.json`.

## Units

**Screen pixels and composition pixels.** Screen pixels are the browser's CSS pixels on the Studio page; the pan, the panel sizes, and the snapping distance are in screen pixels. Composition pixels are the composition's own; the canvas size, renders, and snapshots are in composition pixels. At a stage zoom of 100% one equals the other.

**Frames and seconds.** Studio's in and out points, the current frame, and the timecode count frames. The composition's duration, time-typed input props, and markers count seconds. Caption cues count milliseconds.
