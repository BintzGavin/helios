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

**Transport controls.** The row at the left of the timeline panel: ⏮ (rewind to the in point), < and > (one frame back and forward), ▶ or ❚❚ (play or pause), 🔁 (loop), the mute button, the volume slider, and the speed menu. The [transport controls](playback/the-transport-controls.md) document owns them.

**Timeline.** The part of the timeline panel to the right of the transport controls: a header row (the *timecode field*, the length, the zoom slider, and the "In:", "Out:", and "Fr:" readouts) above the track area (the ruler, the *composition track*, and one lane per audio track), which takes only the height those need; the rest of the panel below it is empty background that does nothing. Not the same as the timeline panel, which also holds the transport controls.

**Props Editor.** The list of the active composition's input props in the inspector, one row per prop, with "Copy JSON" and "Reset" buttons. Every change applies to the preview at once, and the editor *auto-saves* the props into the composition's default props.

**Panel divider.** One of three invisible 10-pixel strips that resize the sidebar (150 to 600 pixels wide), the inspector (200 to 600 pixels wide), and the timeline panel (100 to 800 pixels tall). It turns blue while hovered or dragged.

**Empty state.** What the stage shows when no composition is open: "Welcome to Helios Studio" with a "+ Create Composition" button when the project has no compositions, or "No Composition Selected" with a "Select Composition (⌘K)" button when it has some.

**Dialog.** A box shown over a dark overlay that covers the whole page: the Omnibar, Keyboard Shortcuts, New Composition, Duplicate Composition, Composition Settings, System Diagnostics, Helios Assistant, Render Preview, and the confirmation dialogs. Clicking the overlay closes any of them. Only the Omnibar, Keyboard Shortcuts, and the confirmation dialogs close on Escape, and nothing in a dialog can be submitted or pressed with Enter or Space. A dialog does not block Studio's keyboard shortcuts unless keyboard focus is in one of its text fields. Dialogs stack in a fixed order with the Omnibar at the bottom, so an Omnibar opened over another dialog is hidden behind it (see [dialogs](foundations/the-workspace.md#dialogs)).

**Omnibar.** Studio's command palette (the UI's name for it), opened with Ctrl/Cmd+K or the composition button. It searches commands, compositions, and assets.

**Toast.** A short notification that slides in at the bottom right of the page, above every dialog, and disappears by itself after 3 seconds (2 seconds for "Composition reloaded", which appears only in Studio's development mode), or when its × is clicked. Toasts stack upward, newest at the bottom; a colored stripe on the left marks the kind: green for success, blue for info, orange for warning, red for error.

**Browser prompt.** A message box drawn by the browser itself rather than by Studio, with the browser's own look and buttons: the Assets panel's "Enter folder name:" box, the confirmation before removing a component in the Components panel, and the "Failed to parse SRT file." message in the Captions panel. It is not a *dialog*: it has no overlay, Escape answers it as Cancel (or as OK when OK is its only button), and it blocks the whole Studio page, keys and clicks included, until it is answered.

## Compositions and files

**Project.** The folder `helios studio` was started in, and everything under it. Also called the *project root*. Studio reads and writes only inside it, and cannot be pointed at another project without restarting the server.

**Agent.** A program, usually an AI coding assistant, that changes the project while the user has Studio open. An agent that writes files with its own tools is, to Studio, the same as an editor. An agent connected to *Studio's MCP server* (the `/mcp` address the Studio server answers on the same port, only for programs on the same computer) can also list compositions, create a composition, start, watch, and cancel server-side renders, and install, update, and remove components. The Studio page shows nothing when an agent connects or acts. The [changes from outside Studio](cross-cutting/changes-from-outside-studio.md) document owns what the user sees.

**Code editor.** The text editor or IDE on the user's computer, outside Studio, in which the Studio server can open a file or folder when the user presses 📝 (Open in Editor) on a composition tile or an asset tile. Studio does not choose it and does not report whether one opened: the development server underneath Studio picks the editor named in the `LAUNCH_EDITOR` environment variable of the `helios studio` process or one it finds running, and prints a message in that process's terminal when it finds none. Not to be confused with the *Props Editor*.

**Composition.** A folder in the project that contains a file named `composition.html`. Studio finds compositions by scanning the project when the page loads, skipping folders named `node_modules`, `.git`, `dist`, `build`, and `.helios`, and not looking inside a folder once it has found a composition there. The [project and compositions](foundations/project-and-compositions.md) document owns the details.

**Composition ID.** The composition folder's path relative to the project root, with forward slashes (`simple-canvas-animation`, `scenes/intro`). It is what Studio uses to remember things per composition. A `composition.html` directly in the project root has an empty ID.

**Composition name.** The name Studio shows. It is derived from the composition folder's own name, never stored: the folder name is split at hyphens and each part is capitalized ("simple-canvas-animation" becomes "Simple Canvas Animation"). Renaming a composition therefore renames its folder. After its settings are saved or its props auto-saved, a composition in a subfolder is named from its whole ID instead ("Scenes/intro Card") until the page is reloaded (see [the project and compositions](foundations/project-and-compositions.md#edge-cases)).

**Active composition.** The composition open in the stage. There is at most one. It is *remembered* and reopened when the page loads.

**Composition metadata.** The optional `composition.json` file in a composition folder: `width`, `height`, `fps`, `duration` (in seconds), and `defaultProps`. Studio uses the width and height as the *canvas size* when the composition opens, and again whenever its copy of the composition changes, and applies the default props when it opens. Studio reads the file when it lists the compositions, not again by itself. The frame rate and duration in this file do not change how long the composition plays; the composition's own code decides that.

**Default props.** The `defaultProps` object in `composition.json`. Studio applies it to the composition when it opens, and the Props Editor rewrites it automatically with the *auto-save*.

**Studio's copy.** What Studio last read or was told about a composition: its ID, name, and description, its *composition metadata* (size, frame rate, duration, default props), and its thumbnail. It is replaced for every composition when Studio lists the compositions again (page load, creating, duplicating, setting a thumbnail), and for one composition when its settings are saved or its props are auto-saved. An edit made to `composition.json` outside Studio does not reach it until then, and Studio's next save writes its copy over that edit.

**Thumbnail.** A `thumbnail.png` file in the composition folder, shown in the Compositions panel and the Omnibar. Studio writes it from the current frame when asked (Composition Settings, "Set from Current Frame").

**Composition tile.** One composition's entry in the Compositions panel: a card 140 pixels wide with the composition's thumbnail (cropped to 16:9, or 🎬 on gray when it has none) above its name, and a blue border when it is the *active composition*. While the pointer is over the thumbnail, three buttons appear on it: 📝 (Open in Editor), 📑 (Duplicate), and × (Delete). Clicking anywhere else on the tile opens the composition. The [Compositions panel](compositions/the-compositions-panel.md) document owns what a tile does.

**Template.** One of the starting points the New Composition dialog offers: Title explainer, Vanilla JS (the default choice), React, Vue, Svelte, Solid, and Three.js. Only Title explainer, Vue, Svelte, and Solid compositions can connect to the player, and the last three only in a project that compiles their framework; in the verification project only Title explainer does (see [templates](foundations/project-and-compositions.md#templates)).

**Asset.** A file Studio lists in the Assets panel: an image, video, audio, font, 3D model, JSON, or shader file, recognized by its extension, or a folder. Assets are taken from the project's `public/` folder if it exists, otherwise from the whole project, in which case every composition folder is an asset folder too (as in the verification project).

**Asset tile.** One square in the Assets panel's list, standing for one asset. A folder's tile is 100 pixels square and shows 📁 above the folder's name; clicking it opens the folder. A file's tile is 100 pixels wide and shows a preview made for the asset's type above the file name, and, while the pointer is over it, three small round buttons at its top right: 📝 (Open in Editor), ✎ (Rename Asset), and × (Delete Asset). Every tile can be dragged. The [asset actions](assets/asset-actions.md) document owns what a tile does.

**Current folder.** The folder the Assets panel is showing, named in the panel's breadcrumb row ("Home / images / icons"). "Home" is the top level of the assets: the `public/` folder, or the project root when there is none (the panel's drop message calls it "Root"). Files uploaded and folders made in the panel go into the current folder. It starts at Home whenever the panel appears and is not remembered.

**Renders folder.** The `renders/` folder at the project root, where server-side renders are written as `render-{id}.mp4`, next to `jobs.json`, the render job history.

**Project configuration.** The optional `helios.config.json` file at the project root, written by `helios init` and by installing a component. Studio reads it only for components: the folder components are installed into (`src/components/helios` unless it names another), the project's framework, a registry address, and the list of installed components. Without it, components cannot be installed. The verification project has none.

**Component.** A piece of reusable code for compositions, such as a React timer or a watermark, that the Components panel copies into the project from the *component registry*. It is not a composition: installing one writes its source files into the project's components folder and lists it in the *project configuration*, and it does nothing until a composition's own code imports it.

**Component registry.** The list of components the Components panel offers. `helios studio` reads it once, when it starts: from the address in the project configuration or in the `HELIOS_REGISTRY_URL` environment variable, if one is set and answers within 5 seconds, and otherwise from the list built into the `helios` command (four React components: `use-video-frame`, `timer`, `progress-bar`, and `watermark`). When the project configuration names a framework, only components for that framework and plain JavaScript ("vanilla") ones are offered.

## The preview

**Player.** The `<helios-player>` element in the stage that loads the active composition's page and drives it. In Studio it has no controls bar of its own; Studio's *transport controls* and *timeline* replace it.

**Click layer.** The transparent layer the player lays in front of the composition. It catches every press on the composition: a click toggles playback and gives the player keyboard focus, a double-click enters fullscreen, and the composition's own buttons and links cannot be clicked.

**Connected.** The player is connected when it has found the composition's Helios instance and Studio has noticed (Studio checks every 200 milliseconds). Until then the transport controls are disabled (except loop), the Props Editor says "No active controller", and the timeline shows a placeholder length of 100 frames (or, right after a switch, the previous composition's numbers). A composition that has not connected within 5 seconds shows "Connection Failed..." in the stage.

**Clock-bound composition.** A composition that binds itself to the browser's document clock (its code calls `bindToDocumentTimeline()`), as every example and every Studio template does. In an ordinary browser tab the code makes such a composition take its frame from that clock, so it keeps advancing on its own and Studio's seeks and pauses do not hold. The [preview player](foundations/the-preview-player.md#clock-bound-compositions) document owns this behavior; it is the first thing verification checks.

**Hot reload.** The player reloading the composition's page because a file the composition uses changed on disk. Studio notices the new connection and puts back the frame, the playing state, and the input props it last saw.

**Canvas size.** The width and height, in composition pixels, at which the player is laid out in the stage and at which renders, exports, and job specs are made. It is set from the composition's metadata when the composition opens, and again whenever Studio's copy of the composition changes (its settings are saved, its props are auto-saved, or a thumbnail is set), and can be changed from the stage toolbar in between. It is not remembered.

**Frame.** One still image of the composition. Frames are numbered from 0. A composition with a duration of 5 seconds at 30 frames per second has *total frames* of 150, and Studio lets the playhead go anywhere from frame 0 to frame 150 inclusive.

**Current frame.** The frame the composition is showing. While playing it advances in fractions of a frame, so after a pause it can be a fractional number such as 45.73; the timecode shows it rounded down and the "Fr:" readout rounded to the nearest frame.

**Total frames.** The composition's duration multiplied by its frame rate. Until the player is connected the timeline uses 100 as a placeholder.

**Timecode.** A position written as hours, minutes, seconds, and frames, `HH:MM:SS:FF`, two digits each. At 30 frames per second, frame 45 is `00:00:01:15`.

**Playhead.** The red vertical line on the timeline at the current frame. It cannot be grabbed; a press anywhere on the timeline's track area moves it.

**Ruler.** The strip at the top of the timeline's track area with tick marks labeled in timecodes.

**Hover guide.** The faint dashed vertical line that follows the pointer over the timeline's track area, with a small timecode label above it. During a scrub or a marker drag it stays where the drag began. The [timeline](playback/the-timeline.md#the-hover-guide) owns it.

**Composition track.** The dark 24-pixel bar under the timeline's ruler that stands for the composition. The playback range's shading, the in and out markers, caption bars, composition markers, and time-prop markers sit on it.

**Timecode field.** The current-frame timecode at the left of the timeline's header row. Clicking it turns it into a text box that takes a timecode or a frame number.

**Playing / paused.** Whether the current frame is advancing on its own. When playback reaches the end of the *playback range* with *loop* off, it stops and the composition is paused there.

**Playback rate.** How fast and in which direction playback advances: -4, -2, -1, 0.25, 0.5, 1, 2, or 4 times real time. Negative rates play in reverse. It belongs to the composition and goes back to 1 when the composition reloads.

**In point / out point.** The first and last frame of the *playback range*, set with I and O or by dragging the blue markers on the timeline. The out point is never less than the in point plus 1.

**Playback range.** The span from the in point to the out point. Playback stops or loops at its ends. Server-side renders started from the Renders panel, client-side exports, and job specs cover it from the in point up to, but not including, the out point; the Omnibar's "Start Render" ignores it. When it covers the whole composition, Studio clears it in the composition and plays the full length.

**In and out markers.** The two thin blue lines with small triangles on the composition track at the in point and the out point, which can be dragged. The [playback range](playback/the-playback-range.md) owns them.

**Loop.** Whether playback wraps from the end of the playback range back to its start (or, in reverse, from the start to the end) instead of stopping. Off by default; remembered per composition.

**Timeline state.** The record Studio remembers for each composition ID: in point, out point, loop, and the frame the playhead was on. It is restored when the composition opens.

**Input props.** The values the composition is drawn with, such as a title or a color. The composition declares them; the Props Editor shows and changes them. A change applies to the preview at once.

**Schema.** The composition's optional description of its input props: each prop's type, label, limits, and group. With a schema, the Props Editor shows a field made for each type; without one, it guesses from each value.

**Time prop.** An input prop that the schema declares as a number with the format "time", holding seconds. Each time prop with a numeric value shows on the composition track as a cyan diamond that can be dragged.

**Prop field.** The control in a Props Editor row that shows one input prop and changes it. When the *schema* lists the prop, the field is made for the type it declares: a text box, a number box (with a slider when the schema gives both limits), a check box, a color field (a swatch and a text box), a drop-down menu, a date or clock-time picker, a *time field* (a box that shows a time prop as a timecode, not to be confused with the timeline's *timecode field*), an *asset field* (a text box that suggests the project's assets of one type and accepts one dropped on it), a *JSON box* (a text area that is applied only when it is left), or a nested list or object of further fields. A prop the schema does not list gets an *inferred* field, chosen from the kind of value it holds. Most fields apply every keystroke at once; the time field and the JSON box wait until they are left. The [prop fields](props/prop-fields.md) document owns them.

**Auto-save.** The Props Editor writing the input props into the composition's default props in `composition.json`, with a "Composition updated" toast, once one second has passed with nothing in Studio changing. Read from the code, that is not simply a second after the props stop changing: the wait starts again on every change anywhere in Studio, including the once-a-second check on render jobs and every frame of playback, so while paused the save comes one to a few seconds after the last edit, and while playing, or for a *clock-bound composition*, it does not come. The [Props Editor](props/the-props-editor.md#while-ongoing) owns the details.

**Composition marker.** A named point in time that the composition declares (in seconds). It shows on the composition track as a small diamond in its own color, orange if it has none; pressing it seeks there. The documents say "composition marker" to tell it from the *in and out markers* and the *time-prop markers*.

**Time-prop marker.** The cyan diamond on the composition track at the value of a *time prop*, which can be dragged to change that prop. [Timeline tracks](playback/timeline-tracks.md) owns composition markers and time-prop markers.

**Captions.** Timed text cues the composition carries. They show on the timeline as bars and can be edited in the Captions panel.

**SRT file.** A SubRip caption file: blocks separated by blank lines, each made of an optional number line, a `HH:MM:SS,mmm --> HH:MM:SS,mmm` line, and the cue's text. It is the only format the Captions panel imports and exports; WebVTT files are refused there. The [Captions panel](panels/the-captions-panel.md) document owns the details.

**Audio track.** One source of sound in the composition, as Studio lists it. The Audio panel lists every audio and video element in the composition's page, named by its `data-helios-track-id` attribute, else its `id`, else `track-0`, `track-1`, and so on by its position, together with any track the composition reports itself. The timeline draws a lane only for the tracks the composition reports (see [timeline tracks](playback/timeline-tracks.md)), so the Audio panel can list more tracks than the timeline shows.

**Audio mix.** The per-track volume and mute set in the Audio panel, including what *solo* changes. It lives only in the running composition: it is not saved or remembered, and it is lost on reload, hot reload, and switching compositions. It shapes the preview and client-side exports, not server-side renders. The [audio mixer](panels/the-audio-mixer.md) document owns it.

**Solo.** The Audio panel's "S" button on a track: it mutes every other track so that this one is heard alone, and pressing it again puts every track's mute back as it was when solo began.

**Level meter.** The two small bars beside the Audio panel's title, titled "Master Levels" (the UI's words): the strength of the left and right channels of the sound coming from the composition's audio and video elements, updated on every frame the page draws while the Audio panel is shown.

## The stage view

**Stage view.** How the composition is framed in the stage: its *zoom* and its *pan*. The [stage view](stage/the-stage-view.md) document owns it.

**Zoom (stage).** The scale at which the composition is drawn in the stage, shown in the stage toolbar as a percentage. 100% draws one composition pixel as one screen pixel. It ranges from 10% to 500%.

**Zoom (timeline).** How wide the timeline draws each frame, set with the slider in the timeline's header row: "Fit" at its left end makes the whole composition exactly as wide as the timeline, and each of its 100 other steps gives a fixed width per frame. It is remembered for all compositions. The [timeline](playback/the-timeline.md#zooming-the-timeline) owns it.

**Pan.** How far, in screen pixels, the composition is moved from the center of the stage, horizontally and vertically.

**Fit.** The stage toolbar button titled "Fit to Screen". It sets the zoom to 100% and the pan to zero; it does not scale the composition to the stage's size. Not to be confused with the "Fit" end of the timeline's zoom slider (see *zoom (timeline)*).

**Transparency grid.** The checkerboard drawn behind the composition (on by default), toggled with 🏁.

**Safe-area guides.** Dashed overlays on the composition, toggled with # or the ' key: an action-safe frame at 5% from each edge (cyan), a title-safe frame at 10% (yellow), and a center crosshair.

## Interactions

**Interaction.** The unit these documents narrate: anything the user starts with one input and that ends with another. A mouse press and its release, a key press, opening a dialog and closing it, starting playback and its stopping, starting a render and its completion. Every interaction has five phases: *starting*, *ending at once*, *becoming ongoing*, *while ongoing*, and *finishing*.

**Ongoing.** An interaction is ongoing from the moment it can no longer end at once: for a mouse drag, the first mouse move with the button held (Studio has no distance threshold, so a one-pixel move counts); for a dialog, the first edit; for an inline field, the first keystroke; for playback, the first frame advance; for a render, the server accepting the job. A keyboard shortcut is never ongoing unless the key is held and repeats.

**Drag.** A mouse interaction that became ongoing: the button went down on something, and the mouse moved before it came up. Studio's drags start on a press with no threshold and follow the pointer at once. They come in three kinds: bound to an area (the stage pan, which ends when the pointer leaves the stage), bound to the page (the scrub, the marker drags, and the panel dividers, which follow the pointer anywhere on the page), and the browser's own drag and drop (assets and desktop files). The [input model](foundations/input-model.md#three-kinds-of-drag) owns the difference.

**Scrub.** Pressing on the timeline's track area, which jumps the playhead to the frame under the pointer, and dragging, which keeps it under the pointer. The [timeline](playback/the-timeline.md) document owns it.

**Snapping.** While seeking or dragging a marker on the timeline with the mouse, pulling the frame onto the nearest of frame 0, the total frames, the in and out points, composition markers, caption starts and ends, and time props, when one is within 10 screen pixels. Shift turns it off. A dragged marker snaps to its own position too, so it moves in steps of about 10 pixels unless Shift is held.

**Drop target.** A place that accepts something dragged with the browser's own drag and drop: a folder or the empty area of the Assets panel, an asset or text field in the Props Editor, or the timeline's track area. It highlights while something is dragged over it.

**Click.** A press and release of the mouse button on the same element. The browser fires a click even if the mouse moved in between, which matters on the composition (see [the preview player](foundations/the-preview-player.md#the-player-inside-the-stage)).

**Shortcut.** A key, with or without modifiers, that Studio acts on wherever the pointer is. The [input model](foundations/input-model.md#the-shortcut-map) owns the full list.

**Keyboard focus.** Where key presses go. For these documents it is one of three places: a *text field*, the *player*, or elsewhere (the page, a button, a link). Most shortcuts are ignored while focus is in a text field.

**Text field.** Any input element, whatever its kind (text and number boxes, but also check boxes, color swatches, sliders, date and clock-time pickers, and file choosers), any text area, any drop-down menu (`select`), and any editable text. Studio treats them all the same when deciding whether to ignore a shortcut, so a focused check box or slider turns the shortcuts off just as a text box does. Buttons and links are not text fields.

**Commit.** To make an interaction's result durable: an in point set, a field's value applied, a file written. **Discard** is the opposite: the interaction ends and leaves things as they were before it started.

## Events that end or interrupt an interaction

These are the rows of every "Cancel and interrupt" table. The [input model](foundations/input-model.md#the-interrupt-rows) defines what each one does in Studio in general; each document says what it does to that feature.

**Escape.** The Escape key. Studio has no general Escape behavior: it closes the Omnibar, the Keyboard Shortcuts dialog, and the confirmation dialogs (every one of them that is open), cancels editing in the timecode field and the Assets panel's inline rename fields, and puts back the time shown in a Props Editor time field. It does not stop drags, playback, renders, or exports, and it does not close the other dialogs.

**Another shortcut, click, or command.** The user doing something else before the interaction is over: pressing a shortcut, clicking another control, running an Omnibar command, or opening a dialog.

**Composition switched.** The active composition changing, from the Compositions panel, the Omnibar, or as a side effect of creating, duplicating, renaming, or deleting a composition. The player is replaced and must connect again.

**Window loses focus.** Another window or application takes focus, or the Studio tab is hidden. Studio does not listen for this; whatever was in progress continues, and a mouse button released elsewhere is never seen. The browser does report a focused field as left (and focuses it again on return), so a field that commits when it is left commits (Chromium's usual behavior, to confirm; see [the input model](foundations/input-model.md#the-interrupt-rows)).

**Pointer leaves the window.** The pointer leaves the element an interaction started on, or the browser window, or the mouse button is released outside it.

**Server request fails or server stops.** A request from the Studio page to the Studio server fails, returns an error, or never answers, or the `helios studio` process stops. Studio has no general offline handling; each feature handles a failure its own way, and several report success anyway.

**Reload or tab closed.** The Studio page is reloaded, closed, or navigated away. What was *remembered* comes back; what was only on the page is gone. What is in progress on the server (a render) continues.

**Hot reload.** See the term above. As an interrupt row, it asks what happens to an interaction when the composition reloads under it.

**Project changed on disk.** Files in the project added, renamed, or deleted by anything other than this Studio page: the user's editor or file manager, another Studio tab, or an agent working through Studio's MCP server. Studio lists compositions and assets when the page loads and after its own changes, and does not watch the folder.

## Persistence

**Saved.** Written to a file in the project by the Studio server. Saved things survive anything that happens to the browser, and are seen by every Studio tab after a reload.

**Remembered.** Kept in this browser's local storage for the Studio page's address. Remembered things survive a reload of the same address in the same browser profile, are not seen by another browser or profile, and are shared by every project served at the same address and port. The [workspace](foundations/the-workspace.md#what-studio-remembers) document lists them all.

## Rendering and output

**Render job.** A server-side render of the active composition, started from the Renders panel or the Omnibar (or of any composition, by an *agent*). Its status is one of queued, rendering, completed, failed, or cancelled, shown in the Renders panel as a badge in capitals (QUEUED, RENDERING, COMPLETED, FAILED, CANCELLED). Jobs are saved in the renders folder and survive a restart; a job that was queued or rendering when the server stopped comes back as failed with "Server restarted during render".

**Render settings.** The options under "Server-Side Render" in the Renders panel: preset, mode (canvas or DOM), video bitrate, video codec, concurrency, hardware acceleration, WebCodecs preference, and resolution scale. Server-side renders use them all; a job spec records the mode, the video codec, and the WebCodecs preference, and uses the concurrency and the scale for its chunks and size; a client-side export uses the mode, the bitrate, and the scale; snapshots and thumbnails use the mode. They are remembered for all compositions. The [server-side renders](output/server-renders.md#the-render-settings) document owns them.

**Render mode.** The render setting shown as "Mode" in the Renders panel, which decides how a picture of a frame is taken from the composition. Canvas (the default) takes the picture from the first `<canvas>` element in the composition's page, so anything the composition draws outside that canvas is left out, and a composition with no canvas cannot be captured. DOM takes a picture of the composition's whole page. The same setting applies to server-side renders, client-side exports, snapshots, and thumbnails. The [server-side renders](output/server-renders.md#the-render-settings) document owns it.

**Client-side export.** Rendering the playback range to an MP4 or WebM file inside the browser, without the server, and downloading it.

**Snapshot.** A PNG of the current frame as captured from the composition, downloaded by the browser as `snapshot-{composition name}-{frame}.png`.

**Job spec.** A JSON file describing how to render the playback range in chunks with the `helios` CLI, downloaded as `job-{timestamp}.json`. It records the frames, the size, the frame rate, and some of the render settings, but not the input props.

**Chunk.** One part of a job spec: a run of consecutive frames of the playback range, with the `helios render` command that renders them into a file of their own. A job spec has as many chunks as the Concurrency (Workers) render setting asks for (one by default), or fewer when there are fewer frames, all the same length except a shorter last one, and one `helios merge` command that joins the chunk files into the final video. The [snapshots and job specs](output/snapshots-and-job-specs.md) document owns it.

## Units

**Screen pixels and composition pixels.** Screen pixels are the browser's CSS pixels on the Studio page; the pan, the panel sizes, and the snapping distance are in screen pixels. Composition pixels are the composition's own; the canvas size, renders, and snapshots are in composition pixels. At a stage zoom of 100% one equals the other.

**Frames and seconds.** Studio's in and out points, the current frame, and the timecode count frames. The composition's duration, time-typed input props, and markers count seconds. Caption cues count milliseconds.
