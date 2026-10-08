---
title: "Scripted Cursor"
description: "A mouse pointer that moves like a person and clicks on the times you give"
---

# Scripted Cursor

The `cursor` registry component draws a mouse pointer for product demos and screen-style videos. You write a script of actions, and each action's time is the moment of its key event: when a move arrives, when a click presses. So a click can land exactly on a beat or a sound.

The script is compiled once. After that the pointer at any time is a pure function of `t`, so frames render the same in any order and on distributed workers.

## Install

```bash
helios add cursor
```

This copies `cursor.ts` into your components folder. It has no dependencies.

## Usage

```ts
import { createCursor } from './components/helios/cursor';

const cursor = createCursor([
  { type: 'move', t: 0.9, to: [640, 360] },
  { type: 'click', t: 1.38, at: [912, 540] },
  { type: 'down', t: 2.3, at: [300, 200] },   // drag a file...
  { type: 'move', t: 3.1, to: [1700, 900] },  // ...to the bin
  { type: 'up', t: 3.25 },
], { start: [1500, 900] });

window.renderAt = (t) => {
  drawScene(ctx, t);
  cursor.draw(ctx, t);
};
```

With the [beat clock](/examples/beat-clock), put clicks on beats: `{ type: 'click', t: clock.beats[12], at: [912, 540] }`.

### Actions

| Action | Key event at `t` |
|---|---|
| `{ type: 'move', t, to }` | Arrives at `to`. |
| `{ type: 'click', t, at? }` | Presses. With `at`, it arrives there 70 ms before. Releases 80–120 ms later. |
| `{ type: 'down', t, at? }` / `{ type: 'up', t, at? }` | Presses or lets go, for drags. |

Any action can take `duration` (seconds for the reach) and `width` (the target's size in pixels, default 40).

A target is a point `[x, y]` or a function `(t) => [x, y]`. A function is called for every frame with that frame's time, so the pointer homes in on a target that moves. On a DOM page it can return the centre of an element:

```ts
const center = (el: Element) => () => {
  const r = el.getBoundingClientRect();
  return [r.left + r.width / 2, r.top + r.height / 2] as const;
};
createCursor([{ type: 'click', t: 2, at: center(saveButton) }]);
```

### How it moves

- **Reaches** follow a minimum-jerk profile (10τ³ − 15τ⁴ + 6τ⁵): they start and stop smoothly, along a path that bows slightly to one side, overshoot by a few pixels (4% of the distance, at most 6 px) and settle back onto the target.
- **Durations** come from Fitts' law, MT = a + b·log2(D/W + 1), with a = 0.1 s and b = 0.15 s/bit: 0.37 s for 100 px and 0.76 s for 800 px to a 40 px target. A reach never starts before the previous click has let go; if the gap is shorter, the reach is faster.
- **Variation** (the bow, the overshoot, the release time) is seeded from each action's index. The same script gives the same pixels every time; `createCursor(script, { seed: 2 })` gives a different take with the same timing.

## Drawing

`cursor.at(t)` returns `{ x, y, pressed, click }`, where `click` is `{ index, progress }` from press (0) to release (1), or `null`.

`cursor.draw(ctx, t, options)` draws a classic arrow with its tip on a whole device pixel. Options: `scale` (default 1, a 12 × 20 px arrow), `fill`, `stroke`, `shadow` (default `true`) and `pressedScale` (the arrow shrinks to 0.9 around its tip while the button is down).

On a DOM page, `cursor.apply(element, t)` moves an element with a CSS transform and sets `data-pressed`. Place the element at the top left of the page with the arrow's tip at its corner. `ARROW_PATH` is the same arrow as an SVG path:

```html
<svg id="pointer" width="13" height="21" viewBox="0 0 13 21"
     style="position: fixed; left: 0; top: 0; overflow: visible">
  <path d="M0 0L0 16L4 12L7 19L10 18L7 11L11 11Z" fill="#fff" stroke="#000" stroke-linejoin="round" />
</svg>
```

```ts
window.renderAt = (t) => {
  layout(t);
  cursor.apply(document.getElementById('pointer')!, t);
};
```
