# Kinetic typography

A short line of text is read one phrase at a time, and each word ends up as an object in the picture (a column, a plank, a lintel, a path), so the finished sentence is also a finished image.

| Typical length | Format | Best styles | Demo |
|---|---|---|---|
| 15–25 s | 1:1 loop (1080×1080), or 9:16 | `swiss-grid`, `bauhaus-poster`, `risograph` | [kinetic-type.html](kinetic-type.html) (1080×1080, 18 s) |

## Structure

The copy is short (two to four phrases, 6–15 words) and locked. Each phrase gets one slot, and each slot has the same internal order: **enter → reading hold → travel into its role**. Nothing travels while it is being read.

Write the timeline in **story time** (reveal → phrases → held composition → reset), then **rotate the loop phase** so the seam sits inside the held composition: video time `v` shows story time `(v + PHASE) mod T`. Frame 0 is then the finished poster (the "frame 1 is a finished picture" rule), and the occluder reset happens mid-video, where nobody judges a thumbnail. Demo: `PHASE = 13`, so video time = story time − 13 (+18).

| Beat (story time) | Share | Video time in demo | What happens |
|---|---|---|---|
| Held composition (opening) | 20–30 % | 0–4.2 s | Frame 0 is the finished image: doorway, labels, figure crumb. One slow, quiet change (light rising inside the doorway) keeps it alive. |
| Loop reset | ~1 s | 4.2–5.55 s | A solid ink panel wipes up over the frame. Underneath it, the scene resets to the empty field. |
| Reveal | 0.5 s | 5.1–5.6 s | The panel leaves; the empty field and its mono crumbs (ground ticks, figure number) are already set. |
| Phrase 1 | ~12 % | 5.8–8.8 s | The first words enter by mask and are held for ≥ `letters / 15 + 1.5` s, then travel into their physical role. Camera operation 1 happens during this hold, to lean in. |
| Phrase 2 | ~12 % | 9.0–11.2 s | Enters, holds, then acts on what phrase 1 built (the demo's HOLD UP slides under the columns and lifts them). |
| Stillness | 400–700 ms | 11.35–11.95 s | Nothing on screen moves at all: not the camera, not a crumb. This is the breath before the hero word. |
| Phrase 3 (hero) | ~15 % | 12.3–15.1 s | The heaviest word arrives where the weight will come from, is read, then lands in its role with an impact. Camera operation 2 follows it. |
| Reveal | ~8 % | 15.7–17.6 s | Camera operation 3 steps back so the whole structure, plus its labels, fits. The video ends a moment later, back on frame 0. |

The opening frame is the end hold: a composition you could print, which also works as the thumbnail. The hook is the first word changing role (around 8 s into the demo). The hero moment is the landing of the hero word.

## Look

- **Three type voices, each with one job.** A display face for the words that become structure (DM Serif Display), a heavy grotesque for verbs and connectives (Archivo 800), and a mono for crumbs: figure numbers, dimension labels, small tick marks (JetBrains Mono 500, ~17 px). Crumbs are never part of the copy and never compete with it.
- **Palette of three or four hexes with roles.** The demo uses paper `#EDE6D8`, ink `#1C1B19`, one accent `#D9472B` reserved for a single phrase (the force in the sentence), and stone `#8F877A` for crumbs and guides.
- **Size floor.** The phrase being read is ≥ 64 px tall at 1080 after the camera zoom. Once a word has been read it may shrink to anything its role needs (the plank is 70 px, the caption 40 px).
- **A ground.** A hairline baseline with ticks gives the words something to stand on and makes gravity readable.
- **What stays on screen:** the ground, the figure crumb, and every word once it has arrived. Nothing is removed until the loop panel covers it.

## Technique

**1. Words sit on their ink, not their em box.** Measure each word once in `ready` with `measureText` (`actualBoundingBoxLeft/Right/Ascent/Descent`) at 100 px, then draw at 100 px under `ctx.scale(px / 100)`. That keeps scaling linear, and lets structure meet exactly: a column whose font size makes its ink exactly 360 px long, a lintel whose ink spans both columns, a column foot resting on the plank's cap line. For true outlines (offset strokes, glyphs as collision shapes), load the TTF with opentype.js and use `font.getPath()`. CSS `woff2` from Google Fonts won't parse.

**2. One draw call per word, positioned by ink centre**, so rotation into a column turns about the middle of the visible glyphs:

```js
function word(w, cx, cy, px, rot = 0, rise = 1) {
  const m = M[w], k = px / 100;                       // M[w]: ink box measured at 100 px in ready
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(k, k);
  ctx.translate(m.L - m.w / 2, m.A - m.h / 2);        // ink centre → origin
  if (rise < 1) {                                     // masked entrance from below its own baseline
    ctx.beginPath(); ctx.rect(-m.L - 8, -m.A - 8, m.w + 16, m.h + 16); ctx.clip();
    ctx.translate(0, (1 - rise) * (m.h + 16));
  }
  ctx.font = font(WORDS[w].voice, 100); ctx.fillText(w, 0, 0); ctx.restore();
  window.heliosDrawnText?.add(w);                     // canvas text is invisible to verify --cues otherwise
}
// reading hold: travel progress is 0 until the hold ends, by construction
const p = inOut(seg(t, WORDS[w].hold, WORDS[w].hold + 0.85));
word(w, lerp(540, colX, p), lerp(rowY, footY - PILLAR / 2, p), lerp(150, pillarPx(w), p), -Math.PI / 2 * p, rise);
```

**3. Cue file = the copy.** Keep the locked copy as `{"words":[{"w","start","end"}]}`, where each word's window is its reading hold. Run `verify --cues kinetic-type.cues.json` to prove every word is on screen while it should be read. Retiming a phrase means editing its `in` and `hold` in the `WORDS` table and the cue file together.

**4. Camera = three named operations in a table**, each a single eased segment with a stated purpose (PUSH to lean into phrase 1, CRANE to rise to the hero word and ride it down, PULL to reveal). Between operations the camera is exactly still. See `camera()` in the demo.

**5. Loop under occlusion, with the seam on a composed frame.** Write the reset into story time (the occluder enters over the end of the held composition, the scene resets beneath it, and it leaves over the reveal). Then render `t = (v + PHASE) mod T`, with `PHASE` placing video frame 0 inside the held composition. Frame T equals frame 0 exactly, frame 0 is a finished picture, and the reset is never visible. Cue times are video times, so shift them by the same phase (`v = s − PHASE`, wrapped).

Springs, stagger and the reading-time formula are in [../techniques.md](../techniques.md) and [../brief.md](../brief.md).

## Gotchas

- **A word starts its travel while it is still being read**, so the eye can't finish it → give each word an explicit `hold` time and derive travel progress from `seg(t, hold, …)`, never from the entrance.
- **The phrase being read is blurred, skewed or tiny** → no motion blur or smear on the active phrase, and check the ≥ 64 px floor after camera zoom. Blur is allowed only on words that have already been read and are leaving.
- **The stillness is not still.** A drifting background, a camera ease tail or a ringing spring breaks it → end every move with a non-overshooting ease before the window opens, and check with `sheet --strip` that the frames inside it are identical.
- **Structure floats a few pixels off**, because the em box includes side bearings and line gap → place everything with measured ink bounds. Remember that rotating −90° swaps width and height.
- **Too many camera moves.** Every phrase gets a push and the film feels seasick → three operations in total, each with a purpose you can write down, and stillness between them.
- **Copy drift.** Someone adds a tagline or changes a word, and the cue file and the timings fall out of sync → the copy lives in one table, and `verify --cues` fails if a word is missing.
- **The video opens on a blank or covered frame**, because the reset was put at the seam → rotate the phase so the seam lands inside the held composition, and keep the occluder mid-video. Resetting without any cover pops.
- **Cues out of sync after a phase change** → derive the cue file from story times with the same `PHASE`, and re-run `verify --cues`.
- **Glyphs pass through each other mid-travel** → order travel so the word that moves out of the way goes first (the demo lifts the columns before the plank slides under).

## Stills to check

Times are video times in the demo (story time + 5, wrapped).

- **Frame 0 and the last frame** (0, 17.967 s): the finished doorway with its labels, the two frames matching. This is the thumbnail.
- **End of each reading hold** (7.8, 10.6, 14.5 s): the phrase is complete, centred, ≥ 64 px, and nothing else is moving.
- **Middle of each travel** (8.4, 10.95, 14.9 s): glyphs don't collide, and the role is already legible.
- **Inside the stillness** (`sheet --strip 11.35:11.95 --fps 30`): every frame identical.
- **Hero landing** (15.1–15.4 s strip): contact is exact, the squash reads, the dust is brief.
- **Loop reset** (4.4, 4.8, 5.4 s): the panel fully covers the reset, and the field it reveals is clean.

## Example brief

```
INPUTS      The line (2–4 phrases), accent hex, square or vertical, loop yes/no. Defaults below.
CONCEPT     "The sentence builds the thing it describes."
            Central rule: every word ends up as a part of one structure.
            Hero object: the doorway made of words.
LOCKED COPY SMALL WORDS / HOLD UP / THE WHOLE SENTENCE.  (exact text, exact order, nothing else)
            Crumbs (not copy): fig. 01–04 captions, "column · 5 letters", "lintel · 8 letters",
            "plank · 6 letters" (all counted from the copy).
LOOK        1080×1080, 30 fps, 18 s loop. Paper #EDE6D8, ink #1C1B19, accent #D9472B (HOLD UP only),
            stone #8F877A (crumbs). DM Serif Display / Archivo 800 / JetBrains Mono 500.
            Camera: PUSH (lean into phrase 1), CRANE (meet the lintel, ride it down), PULL (reveal).
MOTION      Masked rise entrances 0.4 s; cubic in-out travel 0.85 s; gravity ease-in for the drop.
            Rules: no travel before a word's hold ends; 600 ms of absolute stillness before phrase 3.
BANNED      Motion blur on read text, letter-by-letter typewriter, glow, particles, shake,
            more than three camera moves, any word not in the copy.
STRUCTURE   Video time (story time + 5): 0–4.2 held doorway (frame 0 = poster), light rising;
            4.2–5.55 ink panel reset; 5.8–7.9 SMALL WORDS (hold) → columns; 9.0–10.7 HOLD UP (hold)
            → plank lifts columns; 11.35–11.95 stillness; 12.3–14.6 THE WHOLE SENTENCE. (hold) →
            lintel drops at 15.1; 15.7–17 pull back; 18 = frame 0.
BUILD       Ink-box metrics in ready; one word() per word; heliosDrawnText for every drawn word;
            camera table; t = (v + PHASE) mod T, so the seam sits in the held composition.
GATES       Stills at 0 and 17.967, each hold end, each travel midpoint, the landing; strip over the
            stillness; verify --duration 18 --width 1080 --height 1080 --cues kinetic-type.cues.json.
```
