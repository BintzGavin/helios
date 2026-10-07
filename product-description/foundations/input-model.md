# Input model

## Summary

This document owns how Studio receives input: which mouse presses start what, how drags begin and end, what the wheel does, where key presses go, every keyboard shortcut and when it is ignored, what modifier keys change, how dragging and dropping works, and what each row of the "Cancel and interrupt" tables means in Studio in general. Feature documents link here instead of restating these rules.

Studio listens for mouse events, keyboard events, wheel events, and the browser's native drag and drop. It does not listen for touch or pen events or for the window losing focus, and it never captures the pointer. It has no global Escape behavior and no notion of a modal state: while one thing is in progress, everything else stays live.

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

1. **A [text field](../glossary.md#interactions) has focus.** The field gets the key, as in any web page: typing, moving the caret, toggling a check box, opening a menu. Studio ignores every shortcut in the [shortcut map](#the-shortcut-map) except Ctrl/Cmd+K and the Escape, ↑, ↓, and Enter keys of an open Omnibar. Studio counts every input element as a text field, not only boxes you type in: number boxes, check boxes, color swatches, sliders (the volume slider, the timeline's zoom slider, the Audio panel's sliders, range sliders in the Props Editor), date and clock-time pickers, and file choosers, as well as text areas and drop-down menus (the speed menu, the preset menu, a template menu, the render settings' menus).
2. **The player has focus.** The player gets the key first and acts on its own keys (see [Keys the player adds](#keys-the-player-adds-when-it-has-keyboard-focus)); then Studio gets the same key press and acts on its shortcuts too. Both act. The player takes focus when the composition is pressed or clicked, or when it is reached with Tab, and keeps it until something else is focused or the page is pressed outside it (a press on the timeline does not take it away).
3. **Anything else has focus** (the page itself, a Studio button, a link, a list item). Studio's shortcuts act. A focused button or link does not respond to Enter or Space, because Studio cancels the browser's own action for both (see [Keys Studio cancels everywhere](#keys-studio-cancels-everywhere)): Space toggles playback instead, and Enter does nothing.

Whichever receiver has the key, three keys never do what the browser would normally do with them: Enter and ↑ and ↓ everywhere, and Space outside a text field. [Keys Studio cancels everywhere](#keys-studio-cancels-everywhere) describes what that takes away.

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
| ' | Show or hide the safe-area guides. | Yes | [Stage toolbar](../stage/the-stage-toolbar.md) |
| ? | Open the Keyboard Shortcuts dialog. | Yes | [Shortcuts and diagnostics](../help/shortcuts-and-diagnostics.md) |
| Ctrl/Cmd+K | Open the Omnibar. Also pauses (see [Modifier keys](#modifier-keys)). | No, it works everywhere | [Omnibar](../compositions/the-omnibar.md) |
| Escape | Close the Omnibar, the Keyboard Shortcuts dialog, and a confirmation dialog, every one of them that is open. | No | [Escape](#the-interrupt-rows) |
| ↑ / ↓ / Enter | Move through and choose in the Omnibar, only while it is open. While it is closed they do nothing, but their browser action is still cancelled (see [Keys Studio cancels everywhere](#keys-studio-cancels-everywhere)). | No | [Omnibar](../compositions/the-omnibar.md) |

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
| End | Go to the end: the total frames, one past the last frame a render draws | Nothing | The end of the timeline. |
| , / . | Step one frame back or forward | Nothing | One step. |
| 0 to 9 | Go to 0%, 10%, ... 90% of the composition | Nothing | The jump. |
| I / O | Set the composition's own playback range from the current frame | Set the in or out point | Studio's in or out point; Studio's range replaces the player's as soon as the point changes. |
| X | Clear the composition's own playback range | Nothing | Playback ignores the in and out markers until one of them changes again, although they still show. |
| M | Mute or unmute | Nothing | Mute toggles; the transport's mute button follows. |
| F | Enter or leave fullscreen | Nothing | The composition fills the screen with no controls; Escape leaves. |
| C | Show or hide captions | Nothing | Captions toggle on the picture. |
| ? | Show or hide the player's own shortcut list over the composition | Open the Keyboard Shortcuts dialog | Both at once. The first Escape then closes only the player's list (see the Escape row). |
| Shift+D | Show or hide the player's diagnostics panel over the composition | Nothing | A panel inside the stage. Only Shift+D closes it again; Escape does not. |
| Escape | If the player's shortcut list is open, close it and keep the key from going any further | Nothing in that case; otherwise as in the map above | The player's list closes, and an open Omnibar, Keyboard Shortcuts dialog, or confirmation stays open until a second Escape. |
| Ctrl/Cmd+K | Toggle playback (it reads only the K) | Open the Omnibar and pause | The Omnibar opens and playback is paused. |

### Keys Studio cancels everywhere

Read from the code, Studio asks the browser not to perform its own action for these keys, on the whole page:

- **Enter, ↑, and ↓, always.** The Omnibar listens for them on the whole page from the moment Studio loads, even while it is closed, and cancels each key press before it checks whether it is open. Modifiers make no difference (Shift+Enter and Ctrl/Cmd+Enter are cancelled too).
- **Space, outside a text field.** Studio's play-or-pause shortcut cancels it whenever focus is not in a text field, even with no composition open.
- ←, →, and Home are cancelled outside text fields too, which only stops them scrolling the page; in a text field Studio leaves them alone.

What that takes away, everywhere in Studio:

| The browser would normally | In Studio |
| --- | --- |
| Submit a form when Enter is pressed in one of its fields | Never. The New Composition, Duplicate Composition, and Composition Settings dialogs can be submitted only by clicking their button. |
| Press a focused button with Enter or Space, or follow a focused link with Enter | Never. Enter does nothing, and Space toggles playback instead. Confirmation dialogs therefore cannot be confirmed from the keyboard, and Escape is the only key that answers them. |
| Start a new line in a text area with Enter | Never. The Props Editor's JSON boxes and the Captions panel's cue text cannot get a line break by typing; a pasted one is kept. |
| Step a number box, move a slider, or change a closed drop-down menu with ↑ or ↓ | Never. ← and → still move sliders and (on Windows and Linux) change a closed menu's choice, Home and End still work in fields, and a menu whose list is open is driven by the browser's own list. |
| Move the caret between the lines of a text area, or open a text box's suggestions, with ↑ or ↓ | Never. |
| Scroll a list, a panel, or the page with ↑, ↓, or Space | Never. The wheel and the scrollbars still scroll. |

Keys that Studio's own code handles are not affected, because they are read before the cancelling happens: Enter and Escape in the [timecode field](../playback/the-timeline.md#the-timecode-field), in the Props Editor's [time fields](../props/prop-fields.md#the-time-field), and in the [asset rename fields](../assets/asset-actions.md#starting); Enter in the [Helios Assistant](../help/the-assistant.md)'s question box; and ↑, ↓, Enter, and Escape in the open Omnibar.

> Technical note: the Omnibar component stays mounted while it is closed, and its keyboard hooks (`useKeyboardShortcut` with `preventDefault: true`, `Omnibar.tsx` lines 180 to 196) call `preventDefault()` before their callbacks check whether the Omnibar is open (`hooks/useKeyboardShortcut.ts` lines 30 to 34). The Space shortcut in `GlobalShortcuts.tsx` does the same outside text fields. A cancelled keydown suppresses the keypress and keyup actions that press buttons, submit forms, and insert line breaks. React's own key handlers run on the root element, before the window's listeners, which is why the fields that handle Enter themselves still work.

### Keys inside fields and dialogs

- **The timecode field.** Enter commits, Escape cancels. See [the timeline](../playback/the-timeline.md#the-timecode-field).
- **The Props Editor's time fields.** Enter commits and leaves the field; Escape puts back the time the field showed and keeps focus in it. See [prop fields](../props/prop-fields.md#the-time-field).
- **The inline rename fields in the Assets panel.** Enter opens the rename confirmation if the name changed, Escape cancels. See [asset actions](../assets/asset-actions.md).
- **The Helios Assistant's question box.** Enter builds the prompt. See [the Helios Assistant](../help/the-assistant.md#finishing).
- **Confirmation dialogs.** Escape closes them as Cancel would. The dialog opens with focus on Cancel for a delete and on the confirming button otherwise, but neither Enter nor Space presses the focused button, so confirming needs the mouse.
- **The New Composition, Duplicate, and Composition Settings dialogs.** Enter in a text field does not submit the dialog, and Escape does nothing; only the mouse submits or closes them.
- **Text areas.** Enter does not start a new line.
- **A drop-down menu or slider with focus** (the speed menu, the volume slider, the preset menu, a render setting's menu) is a text field, so Space, ←, →, Home, and End go to it rather than to Studio's shortcuts, and ↑ and ↓ do nothing at all. After using one, Space and the arrows act on that control, or on nothing, not on playback, until focus moves elsewhere.

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

The Assets panel starts the only drags of this kind that come from inside Studio. Dragging a file asset carries three things at once: the asset's details for Studio, its path on disk for moving it, and its URL as plain text for anything else. Dragging a folder carries only the first two, so it gives nothing to a text field or to another application. What each drop target does with it:

| Drop target | Accepts | What happens |
| --- | --- | --- |
| A folder in the Assets panel, or the panel's empty area | An asset or folder from the panel, or files from the desktop | Moves the asset into that folder, or uploads the files there. See [the Assets panel](../assets/the-assets-panel.md). |
| A Props Editor field for an image, video, audio, font, model, JSON, or shader | An asset of the same type, or plain text dragged from outside Studio | Sets the field to the asset's URL or the text. An asset of another type does nothing. See [prop fields](../props/prop-fields.md). |
| A Props Editor text field | Any plain text, including a file asset's URL | Replaces the field's value with the text. A folder does nothing. |
| The timeline's track area | A video or audio asset | Sets the composition's first prop of that type to the asset, and a matching time prop to the drop position. See [timeline tracks](../playback/timeline-tracks.md). |

A drop target highlights while something is dragged over it. A drop of the wrong kind on a target is accepted and does nothing. A file dragged in from the desktop and dropped anywhere that is not a drop target is handled by the browser, which opens the file in the Studio tab in place of Studio (see [Open questions](#open-questions-and-verification)).

## The variant rows

Every "Modifiers" table has the same six rows. In general:

- **Shift**, **Ctrl/Cmd**, **Alt/Option**: as in [Modifier keys](#modifier-keys).
- **Keyboard focus**: in a text field, on the player, or elsewhere, as in [Keyboard focus and who receives a key](#keyboard-focus-and-who-receives-a-key).
- **Playback**: whether the composition is playing or paused. Apart from the commands that pause (Space, K, the ❚❚ button, a click on the composition, and Ctrl/Cmd+K, which opens the Omnibar and pauses unless focus is in a text field), switching compositions, starting a client-side export, and a [browser prompt](../glossary.md#the-workspace), which freezes the whole page until it is answered, nothing the user does in Studio stops playback; a drag, a dialog, or an edit happens while the frame keeps advancing.
- **Player connection**: whether the player is [connected](../glossary.md#the-preview). Before it is, everything that needs the composition (seeking, playing, input props, snapshots, exports) does nothing, while everything that is only Studio's own state (the in and out points, loop, the stage view, the layout, dialogs, the server) works.

## The interrupt rows

Every "Cancel and interrupt" table has the same nine rows. This is what each means in Studio in general; each document says what it does to its feature.

- **Escape.** Closes the Omnibar, the Keyboard Shortcuts dialog, and confirmation dialogs, all of those that are open at once; cancels the timecode field and the asset rename fields; puts back the time shown in a Props Editor time field; and, when the player has focus and its shortcut list is open, closes that list instead of anything else, because the player keeps that Escape to itself. It also leaves fullscreen and cancels a browser drag and drop, as the browser always does. It does nothing else: it does not stop a drag, playback, a render, or an export, and it does not close the New Composition, Duplicate, Composition Settings, System Diagnostics, Helios Assistant, or Render Preview dialogs.
- **Another shortcut, click, or command.** Never blocked. A shortcut pressed during a drag acts, and the drag continues. A dialog opening over the area a drag is bound to ends that drag at the next mouse move, because the dialog's overlay is now under the pointer.
- **Composition switched.** The player is replaced and has to connect again; see [the preview player](the-preview-player.md#switching-compositions).
- **Window loses focus.** Studio does not listen for it. Playback continues while the tab is visible. A drag whose release happens in another window is not told about it (see [Three kinds of drag](#three-kinds-of-drag)). A hidden tab stops drawing frames, which affects playback (see [the transport controls](../playback/the-transport-controls.md#cancel-and-interrupt)). The browser itself, though, reports a focused field as left when another window takes focus or the tab is hidden, and gives it focus back when the window returns (Chromium's usual behavior, to confirm). So a field that commits when it is left commits at that moment: the [timecode field](../playback/the-timeline.md#the-timecode-field), the Props Editor's time fields and JSON boxes, the Captions panel's fields, and an asset rename field, which opens its confirmation if the name changed.
- **Pointer leaves the window.** A drag bound to an area ends when the pointer leaves that area. A drag bound to the page continues while the pointer is anywhere on the page, and keeps following it while the button is held outside the window if the browser keeps reporting the pointer there.
- **Server request fails or server stops.** Studio has no offline mode and retries nothing. Each feature handles a failed request its own way: some show an error toast, some fail silently, and several report success without checking the server's answer. The [project and compositions](project-and-compositions.md#when-a-request-fails) document lists which.
- **Reload or tab closed.** Studio never asks for confirmation before the page goes away. What was [remembered](../glossary.md#persistence) or [saved](../glossary.md#persistence) comes back; the content of any open dialog, a client-side export in progress, and anything only shown on the page are lost. A server-side render continues on the server.
- **Hot reload.** The player reloads the composition in place; see [the preview player](the-preview-player.md#hot-reload).
- **Project changed on disk.** Studio does not watch the project; see [the project and compositions](project-and-compositions.md#when-the-project-changes-underneath-studio).

## Edge cases

- **Focus left in a field.** After typing in a Props Editor field and then pressing on the timeline, focus stays in the field, so Space types into it and ← and → move its caret instead of controlling playback. Pressing on the stage or Tabbing out fixes it.
- **The player keeps focus.** After the composition has been clicked, every later key acts on the player and on Studio until focus moves. J and L then jump ten seconds as well as changing the speed.
- **Two dialogs at once.** Ctrl/Cmd+K works inside a dialog's text field, and anywhere else while a dialog is open, but the Omnibar is drawn beneath every other dialog (see [dialogs](the-workspace.md#dialogs)). It opens hidden behind the dialog already shown and takes keyboard focus there: typing filters a list the user cannot see, Enter runs its highlighted item, and Escape closes it together with a Keyboard Shortcuts or confirmation dialog that is open above it. See [the Omnibar](../compositions/the-omnibar.md#edge-cases).
- **Right-click on the timeline.** The press seeks and starts a scrub, and the browser's context menu opens. The release may go to the menu instead of the page, leaving the scrub following the pointer until the next release.
- **Keyboard layouts.** Shortcuts compare the character the key produces, not the physical key. On a layout where ? or ' need other keys, those keys work; on a layout where a letter shortcut produces another character, that shortcut is unreachable.
- **No keyboard route through forms.** Because Enter and Space never press a button, every dialog with a submit button, every confirmation, and every panel button (Upload, + Add, Install, Start Render Job, Export) needs a click. Tab still reaches them, which only moves focus.
- **Number boxes that do not step.** ↑ and ↓ do nothing in the canvas size fields, the dialogs' number boxes, and the Props Editor's number boxes; typing, pasting, and the small step arrows that appear in the box under the pointer still change them.

## Open questions and verification

- **First to verify: the cancelled keys.** Read from the code, Enter, ↑, and ↓ lose their browser action everywhere and at all times, and Space outside text fields (see [Keys Studio cancels everywhere](#keys-studio-cancels-everywhere)). Confirm in Chromium that Enter does not submit the New Composition dialog from its name field, that neither Enter nor Space presses a focused button (a confirmation's Cancel, a toolbar button) and Space toggles playback instead, that Enter adds no line break to a caption's text, and that ↑ and ↓ neither step a number box nor change the focused speed menu. If confirmed, this may be worth treating as a high-severity bug: Studio's forms and buttons cannot be used from the keyboard.
- Confirm what the open list of a drop-down menu, and an asset field's suggestion list, do with ↑ and ↓: read from Chromium's usual behavior, an open list takes the keys itself, before the page, so the arrows should work there.
- Confirm that Chromium reports a focused field as left when another window takes focus and when the tab is hidden, and gives it focus back on return, which commits the fields that commit when left.
- Confirm that a desktop file dropped on the stage, the sidebar, or the header replaces Studio with the file in the tab. Studio does not prevent this default outside its drop targets. If confirmed, this may be worth treating as a bug.
- Confirm that, with the player focused and its shortcut list open (after ?), the first Escape closes only that list and leaves Studio's Keyboard Shortcuts dialog open: the player's key handler stops the Escape from reaching the page when it closes one of its panels (`packages/player/src/index.ts`, the start of `handleKeydown`). The player's diagnostics panel (Shift+D) does not close on Escape at all.
- Confirm the combined behavior when the player has focus, key by key, against the table above. The order (player first, Studio second) is read from the code, as are the outcomes for Space at the end (restart from frame 0), K from paused, X, and I or O at the current in or out point (Studio's point does not change, so the player's range stays).
- Confirm whether Chromium delivers the release to the page when a page-bound drag is released outside the browser window, and keeps reporting moves while the button is held outside.
- Confirm that Ctrl/Cmd+I and Ctrl/Cmd+O set the in and out points as well as triggering the browser's own action, and what Ctrl+L does (it may play forward and also focus the address bar).
- The Keyboard Shortcuts dialog's "/" key and the Omnibar's "N", "S", and "L" hints do not match the code; this may be worth treating as a bug.
- Read from `useKeyboardShortcut.ts`, `useKeyboardShortcut.test.ts`, `GlobalShortcuts.tsx`, `GlobalShortcuts.test.tsx`, `Omnibar.tsx`, `App.tsx`, `AssetsPanel/FolderItem.tsx` and `AssetItem.tsx` (the drag contents), and the player's key handler in `packages/player/src/index.ts`; not yet confirmed by hand.

Verified against helios commit `c2bfddb`
