# Input model

## Summary

This document owns how Studio receives input: which mouse presses start what, how drags begin and end, what the wheel does, where key presses go, every keyboard shortcut and when it is ignored, what modifier keys change, how dragging and dropping works, and what each row of the "Cancel and interrupt" tables means in Studio in general. Feature documents link here instead of restating these rules.

Studio listens for mouse events, keyboard events, wheel events, and the browser's native drag and drop. It does not listen for touch or pen events, for the window losing focus, or for the pointer being captured. It has no global Escape behavior and no notion of a modal state: while one thing is in progress, everything else stays live.

## Mouse presses and drags

### Which buttons

- **The stage** pans on the left or middle button and ignores the others. See [the stage view](../stage/the-stage-view.md).
- **The timeline** acts on any button: a press with the left, middle, or right button seeks and starts a scrub, and a right press also opens the browser's context menu. See [the timeline](../playback/the-timeline.md).
- **The panel dividers** resize on any button.
- **Buttons, menus, fields, and list items** act on a left click, as in any web page.

### No threshold

No Studio drag has a distance or time threshold. A drag is [ongoing](../glossary.md#interactions) from the first mouse move with the button held, however small, and what is dragged follows the pointer from that move on. One press acts before any move: a press on the timeline's track area seeks at once.

### Three kinds of drag

Studio's drags end in three different ways, and the difference shows up in every "Pointer leaves the window" and "Window loses focus" row.

1. **Bound to an area.** The stage pan follows mouse moves only inside the stage, and ends when the button is released inside the stage or as soon as the pointer leaves the stage. It never continues outside.
2. **Bound to the page.** The timeline's scrub, the in and out marker drags, the time-prop marker drags, and the panel dividers follow mouse moves anywhere on the Studio page, including over the stage and the composition, and end when the button is released anywhere on the page. Moving outside the area they started in does not end them.
3. **The browser's drag and drop.** Dragging an asset or a folder out of the Assets panel, or a file in from the desktop, uses the browser's own drag: a translucent image follows the pointer, possible drop targets highlight, and Escape or a drop outside any target cancels it. See [Drag and drop](#drag-and-drop).

None of Studio's drags captures the pointer, and none listens for the window losing focus. If the browser never delivers the release, a drag of the first two kinds stays in progress: a stage pan until the pointer leaves the stage or the next click, a page-bound drag until the next mouse release anywhere on the page.

### Clicks after drags

The browser fires a click when the button goes down and comes up on the same element, whether or not the mouse moved in between. Studio does not suppress these clicks. On the composition this means a pan that starts and ends on the picture also toggles playback (see [the preview player](the-preview-player.md#the-player-inside-the-stage)); on a toolbar button it means a drag that starts and ends on the button also presses it.

### Presses and keyboard focus

Most presses move keyboard focus the way any web page does: a press on something focusable focuses it, and a press on anything else takes focus out of the field that had it. A field that commits when it is left commits at that moment. The exception is the timeline's track area, which keeps focus where it was: pressing on the timeline does not take focus out of a text field, and does not take it away from the player.

## The wheel

Only the stage gives the wheel a meaning of its own: the wheel pans, and Ctrl/Cmd with the wheel zooms (see [the stage view](../stage/the-stage-view.md)). Everywhere else the wheel scrolls whatever is under the pointer in the browser's usual way: the sidebar lists, the inspector, the dialogs, and the timeline's track area when it is zoomed wider than the panel. Ctrl and the wheel outside the stage are left to the browser, which zooms the whole page on Windows and Linux.

## Keyboard focus and who receives a key

Every key press goes to one of three receivers, decided by where [keyboard focus](../glossary.md#interactions) is when the key goes down.

1. **A text field has focus.** The field gets the key, as in any web page: typing, moving the caret, opening a menu. Studio ignores every shortcut in the [shortcut map](#the-shortcut-map) except Ctrl/Cmd+K and the Escape, ↑, ↓, and Enter keys of an open Omnibar. Text fields include number inputs, sliders (the volume slider, range sliders in the Props Editor), and drop-down menus (the speed menu, the preset menu, a template menu), not only boxes you type in.
2. **The player has focus.** The player gets the key first and acts on its own keys (see [Keys the player adds](#keys-the-player-adds-when-it-has-keyboard-focus)); then Studio gets the same key press and acts on its shortcuts too. Both act. The player takes focus when the composition is pressed or clicked, or when it is reached with Tab, and keeps it until something else is focused or the page is pressed outside it (a press on the timeline does not take it away).
3. **Anything else has focus** (the page itself, a Studio button, a list item). Studio's shortcuts act. A focused button also receives Enter and Space the way buttons always do (see [Open questions](#open-questions-and-verification)).

Dialogs do not change this. While a dialog is open, Studio's shortcuts keep working whenever focus is not in one of the dialog's text fields: with the System Diagnostics dialog open, Space still toggles playback behind it. Dialogs do not trap focus, so Tab can leave them.

> Technical note: Studio's shortcuts are all listeners on the window, and each decides whether to ignore the key by looking at which element has focus at that moment. The player's keys are a listener on the player element itself, which the browser calls before the window's listeners. Nothing stops a key from reaching both.

## The shortcut map

### Studio's shortcuts

| Key | What it does | Ignored in a text field | Owner |
| --- | --- | --- | --- |
| Space | Play if paused, pause if playing, at the current playback rate. Does not restart from the in point at the end. | Yes | [Transport controls](../playback/the-transport-controls.md) |
| K | Pause. | Yes | [Transport controls](../playback/the-transport-controls.md) |
| J | Play in reverse at 1x; if already playing in reverse, play twice as fast, up to 4x. | Yes | [Transport controls](../playback/the-transport-controls.md) |
| L | Play forward at 1x; if already playing forward, play twice as fast, up to 4x. | Yes | [Transport controls](../playback/the-transport-controls.md) |
| Shift+L | Toggle loop. | Yes | [Transport controls](../playback/the-transport-controls.md) |
| ← / → | Step one frame back or forward. | Yes | [Transport controls](../playback/the-transport-controls.md) |
| Shift+← / Shift+→ | Step ten frames back or forward. | Yes | [Transport controls](../playback/the-transport-controls.md) |
| Home | Go to the in point. | Yes | [Transport controls](../playback/the-transport-controls.md) |
| I | Set the in point at the current frame. | Yes | [Playback range](../playback/the-playback-range.md) |
| O | Set the out point at the current frame. | Yes | [Playback range](../playback/the-playback-range.md) |
| ' | Show or hide the safe-area guides. | Yes | `stage/the-stage-toolbar.md` |
| ? | Open the Keyboard Shortcuts dialog. | Yes | `help/shortcuts-and-diagnostics.md` |
| Ctrl/Cmd+K | Open the Omnibar. Also pauses (see [Modifier keys](#modifier-keys)). | No, it works everywhere | `compositions/the-omnibar.md` |
| Escape | Close the Omnibar, the Keyboard Shortcuts dialog, or a confirmation dialog, if one is open. | No | [Escape](#the-interrupt-rows) |
| ↑ / ↓ / Enter | Move through and choose in the Omnibar, only while it is open. | No | `compositions/the-omnibar.md` |

Every one of these is active from the moment the page loads, whether or not a composition is open. The playback keys do nothing until the player is [connected](../glossary.md#the-preview); I, O, Shift+L, ', ?, and Ctrl/Cmd+K work before that.

Other lists of shortcuts disagree with this map. The Keyboard Shortcuts dialog draws a "/" key cap between Space and K for play and pause, as if "/" were a key (it does nothing), and does not list '. The Omnibar shows "N" next to Create Composition and "S" next to Take Snapshot, which do nothing, and "L" next to Toggle Loop, which plays forward instead. Outside Studio, the Studio package's README also lists L as "Toggle Loop", and the user guide in `docs/site/guides/using-studio.md` says K toggles play and pause, which it does only when the player has focus.

### Keys the player adds when it has keyboard focus

When the player has focus, these keys act on the player first, and then Studio acts on the same key according to the map above.

| Key | The player does | Studio then does | What the user sees |
| --- | --- | --- | --- |
| Space | Toggle playback; at the end, restart from frame 0 | Play or pause from its last known state | Playback toggles. At the end it restarts from frame 0, not from the in point. |
| K | Toggle playback; at the end, restart from frame 0 | Pause | Pause only. From paused nothing visible happens, except at the end, where the composition jumps to frame 0 and stays paused. |
| J | Jump back 10 seconds | Play in reverse, or faster in reverse | Both: a jump back, then reverse playback. |
| L | Jump forward 10 seconds | Play forward, or faster; with Shift, toggle loop | Both: a jump forward, then playback. Shift+L jumps forward 10 seconds and toggles loop. |
| ← / → (with Shift) | Step 1 (10) frames, stopping at the last frame | Step 1 (10) frames from the same starting frame | One step, not two. |
| Home | Go to frame 0 | Go to the in point | The in point. |
| End | Go to the last frame | Nothing | The last frame. |
| , / . | Step one frame back or forward | Nothing | One step. |
| 0 to 9 | Go to 0%, 10%, ... 90% of the composition | Nothing | The jump. |
| I / O | Set the composition's own playback range from the current frame | Set the in or out point | Studio's in or out point; Studio's range replaces the player's as soon as the point changes. |
| X | Clear the composition's own playback range | Nothing | Playback ignores the in and out markers until one of them changes again, although they still show. |
| M | Mute or unmute | Nothing | Mute toggles; the transport's mute button follows. |
| F | Enter or leave fullscreen | Nothing | The composition fills the screen with no controls; Escape leaves. |
| C | Show or hide captions | Nothing | Captions toggle on the picture. |
| ? | Show the player's own shortcut list over the composition | Open the Keyboard Shortcuts dialog | Both at once. |
| Shift+D | Show the player's diagnostics panel over the composition | Nothing | A panel inside the stage. |
| Escape | Close the player's own panels if open | As in the map above | The panel closes. |
| Ctrl/Cmd+K | Toggle playback (it reads only the K) | Open the Omnibar and pause | The Omnibar opens and playback is paused. |

### Keys inside fields and dialogs

- **The timecode field.** Enter commits, Escape cancels. See [the timeline](../playback/the-timeline.md#the-timecode-field).
- **The inline rename fields in the Assets panel.** Enter commits, Escape cancels. See `assets/asset-actions.md`.
- **Confirmation dialogs.** Escape closes them as Cancel would. The focused button responds to Enter and Space; for a destructive confirmation (Delete), the focused button is Cancel.
- **The New Composition, Duplicate, and Composition Settings dialogs.** Enter in a text field submits the dialog. Escape does nothing.
- **A drop-down menu or slider with focus** (the speed menu, the volume slider, the preset menu) takes the arrow keys and Space itself. After using one, Space and the arrows change that control, not playback, until focus moves elsewhere.

## Modifier keys

Studio reads modifiers in only a few places:

- **Shift** turns ← and → into ten-frame steps, turns L into "toggle loop", and turns off snapping while dragging on the timeline.
- **Ctrl/Cmd** makes K open the Omnibar and makes the wheel zoom the stage. Studio treats Control and Command as the same key on every platform, so Control+K opens the Omnibar on a Mac too.
- **Alt/Option** is never read.

Every other shortcut compares only the key and ignores modifiers. Holding a modifier does not stop a shortcut from firing:

- Shift with a letter still fires it: Shift+I sets the in point, Shift+K pauses, Shift+J plays in reverse.
- Ctrl/Cmd with a letter fires the letter's shortcut and whatever the browser does with the combination. Ctrl/Cmd+K both opens the Omnibar and, unless focus is in a text field, pauses playback. Ctrl/Cmd+I and Ctrl/Cmd+O also set the in or out point.
- Alt with a letter fires it on Windows and Linux. On a Mac, Option with a letter types a different character, so the shortcut does not fire; Option with an arrow key still steps one frame.

Modifiers are read from the key press itself. Pressing or releasing a modifier during a drag changes nothing until the next mouse move, which reads Shift again (on the timeline) or ignores it (everywhere else).

## Key repeat

Holding a key repeats it at the operating system's repeat rate, and Studio acts on every repeat: holding → steps frame after frame, holding Shift+→ steps ten at a time, holding J or L doubles the speed on each repeat until it reaches 4x. A key repeat is the only way a shortcut becomes [ongoing](../glossary.md#interactions); it finishes when the key is released.

## Drag and drop

The Assets panel starts the only drags of this kind that come from inside Studio. Dragging an asset (or a folder) carries three things at once: the asset's details for Studio, its path on disk for moving it, and its URL as plain text for anything else. What each drop target does with it:

| Drop target | Accepts | What happens |
| --- | --- | --- |
| A folder in the Assets panel, or the panel's empty area | An asset or folder from the panel, or files from the desktop | Moves the asset into that folder, or uploads the files there. See `assets/the-assets-panel.md`. |
| A Props Editor field for an image, video, audio, font, model, JSON, or shader | An asset of the same type, or plain text dragged from outside Studio | Sets the field to the asset's URL or the text. An asset of another type does nothing. See `props/prop-fields.md`. |
| A Props Editor text field | Any plain text, including an asset's URL | Replaces the field's value with the text. |
| The timeline's track area | A video or audio asset | Sets the composition's first prop of that type to the asset, and a matching time prop to the drop position. See [timeline tracks](../playback/timeline-tracks.md). |

A drop target highlights while something is dragged over it. A drop of the wrong kind on a target is accepted and does nothing. A file dragged in from the desktop and dropped anywhere that is not a drop target is handled by the browser, which opens the file in the Studio tab in place of Studio (see [Open questions](#open-questions-and-verification)).

## The variant rows

Every "Modifiers" table has the same six rows. In general:

- **Shift**, **Ctrl/Cmd**, **Alt/Option**: as in [Modifier keys](#modifier-keys).
- **Keyboard focus**: in a text field, on the player, or elsewhere, as in [Keyboard focus and who receives a key](#keyboard-focus-and-who-receives-a-key).
- **Playback**: whether the composition is playing or paused. Apart from switching compositions and starting a client-side export, nothing else the user does in Studio stops playback; a drag, a dialog, or an edit happens while the frame keeps advancing.
- **Player connection**: whether the player is [connected](../glossary.md#the-preview). Before it is, everything that needs the composition (seeking, playing, input props, snapshots, exports) does nothing, while everything that is only Studio's own state (the in and out points, loop, the stage view, the layout, dialogs, the server) works.

## The interrupt rows

Every "Cancel and interrupt" table has the same nine rows. This is what each means in Studio in general; each document says what it does to its feature.

- **Escape.** Closes the Omnibar, the Keyboard Shortcuts dialog, and confirmation dialogs; cancels the timecode field and the asset rename fields; and, when the player has focus, closes the player's own panels. It also leaves fullscreen and cancels a browser drag and drop, as the browser always does. It does nothing else: it does not stop a drag, playback, a render, or an export, and it does not close the New Composition, Duplicate, Composition Settings, System Diagnostics, Helios Assistant, or Render Preview dialogs.
- **Another shortcut, click, or command.** Never blocked. A shortcut pressed during a drag acts, and the drag continues. A dialog opening over the area a drag is bound to ends that drag at the next mouse move, because the dialog's overlay is now under the pointer.
- **Composition switched.** The player is replaced and has to connect again; see [the preview player](the-preview-player.md#switching-compositions).
- **Window loses focus.** Studio does not listen for it. Playback continues while the tab is visible. A drag whose release happens in another window is not told about it (see [Three kinds of drag](#three-kinds-of-drag)). A hidden tab stops drawing frames, which affects playback (see [the transport controls](../playback/the-transport-controls.md)).
- **Pointer leaves the window.** A drag bound to an area ends when the pointer leaves that area. A drag bound to the page continues while the pointer is anywhere on the page, and keeps following it while the button is held outside the window if the browser keeps reporting the pointer there.
- **Server request fails or server stops.** Studio has no offline mode and retries nothing. Each feature handles a failed request its own way: some show an error toast, some fail silently, and several report success without checking the server's answer. The [project and compositions](project-and-compositions.md#when-a-request-fails) document lists which.
- **Reload or tab closed.** Studio never asks for confirmation before the page goes away. What was [remembered](../glossary.md#persistence) or [saved](../glossary.md#persistence) comes back; the content of any open dialog, a client-side export in progress, and anything only shown on the page are lost. A server-side render continues on the server.
- **Hot reload.** The player reloads the composition in place; see [the preview player](the-preview-player.md#hot-reload).
- **Project changed on disk.** Studio does not watch the project; see [the project and compositions](project-and-compositions.md#when-the-project-changes-underneath-studio).

## Edge cases

- **Focus left in a field.** After typing in a Props Editor field and then pressing on the timeline, focus stays in the field, so Space and the arrows still type into it instead of controlling playback. Pressing on the stage or Tabbing out fixes it.
- **The player keeps focus.** After the composition has been clicked, every later key acts on the player and on Studio until focus moves. J and L then jump ten seconds as well as changing the speed.
- **Two dialogs at once.** Ctrl/Cmd+K works inside a dialog's text field, so the Omnibar can open on top of the New Composition dialog. Escape then closes only the Omnibar.
- **Right-click on the timeline.** The press seeks and starts a scrub, and the browser's context menu opens. The release may go to the menu instead of the page, leaving the scrub following the pointer until the next release.
- **Keyboard layouts.** Shortcuts compare the character the key produces, not the physical key. On a layout where ? or ' need other keys, those keys work; on a layout where a letter shortcut produces another character, that shortcut is unreachable.

## Open questions and verification

- Confirm what a focused Studio button does with Space: the button's own activation and Studio's play or pause shortcut may both happen. Studio asks the browser not to perform Space's default action, which may or may not stop the button.
- Confirm that a desktop file dropped on the stage, the sidebar, or the header replaces Studio with the file in the tab. Studio does not prevent this default outside its drop targets. If confirmed, this may be worth treating as a bug.
- Confirm the combined behavior when the player has focus, key by key, against the table above. The order (player first, Studio second) is read from the code, as are the outcomes for Space at the end (restart from frame 0), K from paused, X, and I or O at the current in or out point (Studio's point does not change, so the player's range stays).
- Confirm whether Chromium delivers the release to the page when a page-bound drag is released outside the browser window, and keeps reporting moves while the button is held outside.
- Confirm that Ctrl/Cmd+I and Ctrl/Cmd+O set the in and out points as well as triggering the browser's own action, and what Ctrl+L does (it may play forward and also focus the address bar).
- The Keyboard Shortcuts dialog's "/" key and the Omnibar's "N", "S", and "L" hints do not match the code; this may be worth treating as a bug.
- Read from `useKeyboardShortcut.ts`, `useKeyboardShortcut.test.ts`, `GlobalShortcuts.tsx`, `GlobalShortcuts.test.tsx`, and the player's key handler in `packages/player/src/index.ts`; not yet confirmed by hand.

Verified against helios commit `c2bfddb`
