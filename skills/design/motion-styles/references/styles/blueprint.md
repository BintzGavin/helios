# Blueprint

An engineering drawing that draws itself on one sheet of cyanotype paper: white line work on uneven Prussian blue, laid down in drafting order by a glowing nib, with dimensions, balloons and notes that letter themselves in. **Not:** a glowing sci-fi hologram HUD with 3D wireframes, nor a flat blue background with a white vector icon on it.

| Best for | Route | Difficulty | Needs |
|---|---|---|---|
| How-it-works and product anatomy, engineering or architecture stories, "the making of", launch reveals that end with an approval | Canvas 2D: procedural sheet built once, polylines drawn on by arc length in sheet space under a 2D camera | Medium | OFL fonts: a hand-lettering face (Architects Daughter), a technical sans (B612), a script for the signature (Allura) |

Demo: [blueprint.html](blueprint.html) — `npx -y @helios-project/cli@latest render blueprint.html -o blueprint.mp4 --duration 8 --fps 24 --mode canvas`

## Look
- **Palette:**
  - Sheet: a value field between two Prussian blues, `#18336B` → `#2A58A6`.
  - Line work: one pale blue-white `#E7F0F9`. Its weight and softness vary; its hue never does.
  - Table: `#0D1116` around the sheet, with a soft drop shadow.
  - **One non-blue ink, used exactly once:** a red rubber stamp `#D7262E` that carries the verdict (APPROVED / REJECTED / VOID). A green or black stamp works too, but only one.
  - Alternatives: sun-bleached `#3A6DA8` → `#5B8CC4`; over-exposed `#0F2350` → `#1D3F80`.
- **Type:**
  - Hand lettering (Architects Daughter, uppercase) for the header (~0.06 H at the wide), labels and notes.
  - B612 for dimension values, the title-block fields and NOTE cells. Allura for the signature only.
  - Text letters itself on left to right behind the nib, like any other line.
  - **Captions are drawing notes:** a translucent box with double white rules, a "NOTE / n" cell, and text lettered on in ~0.35 s, placed in empty sky for the shot, never at the bottom. Each note is also lettered into the sheet's GENERAL NOTES column, so the final wide reads as the whole script.
- **Materials & texture:** cyanotype on paper.
  - Build the sheet once in `ready`, in **sheet coordinates** (2400 × 1350 units): 3-octave value-noise fbm between the two blues, faint coating streaks, bleached edges, two fold creases (whitened band + bright edge + dark edge), irregular water stains with pale tide lines, sparse light specks.
  - Lines carry a 2 px soft bleed (`shadowBlur`).
  - Hatching runs at 45° with 12-unit spacing.
  - Dashes in sheet units: centre line long-short `[34,7,6,7]`, hidden `[10,6]`, phantom long-short-short.

## Motion
- **Drafting order:** centre lines → outlines → detail → hatching → dimensions → balloons → labels → notes. Each layer starts on a beat, and items stagger inside it (hatch lines every 0.018 s).
- **Draw-on by arc length** with a glowing nib (radial white glow ~16 px on screen) at every live head. Lines are linear in time, so their speed reads as a hand.
- **Line width on screen = sheet width × zoom^0.65.** In sheet space, set `lineWidth = w * zoom^0.65 / zoom`. Close-ups don't turn lines into sausages, and wides don't lose them.
- Four weights in sheet units: outline 3.2, detail 2.0, thin 1.25, hair 0.9.
- Camera on ones (24 fps): a medium close-up on the figure while it's drafted, then one continuous pull-out to the whole sheet (0.6 s, cubic in-out). Other moves: hard cuts on downbeats, 2× close-ups on the mechanism, a lateral pan Fig. 1 → Fig. 2. A 4 px bump only for physical impacts (the stamp). No dissolves, no 3D orbit.
- The stamp lands in 0.08 s (scale 1.25 → 1.0) at 90 % opacity, with its own ink voids.

## Signature checklist
- [ ] Only blue values and one white line colour, plus exactly one stamp colour appearing once.
- [ ] Four distinguishable line weights (outline ≈ 3.5× hair) and at least one centre line with the long-short dash.
- [ ] Layers appear strictly in drafting order; no dimension or balloon appears before its outline is complete.
- [ ] A visible nib glow sits at the head of every line still being drawn.
- [ ] Measured on screen, an outline is ~2.5 px at the wide (0.96×) and ~3.4 px at 1.55× zoom: it grows, but less than the zoom.
- [ ] Captions sit in NOTE boxes in empty sky, and the same text exists in the GENERAL NOTES column at the end.
- [ ] Folds, stains and fbm mottling stay fixed to the paper as the camera moves; they never swim.

## Native moves
- **Drafting order.** The object assembles the way an engineer would draw it: axis, outline, section hatching, dimensions, balloons, labels, one layer per beat. *Fits:* a product's anatomy; a building; a recipe's "parts list".
- **The title block is the story.** After the pull-out to the whole sheet, the red APPROVED stamp thumps onto the status field with a camera bump: the one colour, once. This is the demo's peak (5.4 s). *Fits:* a launch sign-off; a permit after years; a rejected first draft (REJECTED).
- **Live annotations.** Dimensions, balloons and notes letter themselves beside moving parts. A phantom beam or dashed flow line marches slowly during the hold. *Fits:* a mechanism explained; data flowing through a system; light, air or water paths.

## Core technique
```js
// sheet-space camera; line weight follows zoom^0.65 on screen
const S = 0.8 * cam.z;                                   // screen px per sheet unit (zoom 1 = sheet fills width)
ctx.setTransform(S, 0, 0, S, W / 2 - S * cam.fx, H / 2 - S * cam.fy);
ctx.drawImage(SHEET, 0, 0);                              // procedural cyanotype, built once in ready
const lw = Math.pow(cam.z, 0.65) / cam.z;
// draw-on by arc length, nib at the head
for (const it of ITEMS) {
  const f = prog(t, it.t0, it.t0 + it.dur); if (f <= 0) continue;
  const seg = partByLength(it.pts, f);                  // truncate the polyline at f of its length
  ctx.setLineDash(it.dash || []);                       // dash lengths in sheet units stay on the paper
  ctx.lineWidth = it.w * lw; strokePolyline(seg);
  if (f < 1) nib(...seg[seg.length - 1]);
}
// drafting order is just the schedule:
// centre lines 0.0-0.9 · outlines 0.95-2.7 · hatching 2.55-3.3 · dimensions 3.0-3.9 · balloons 3.75-4.4 · labels 4.1-4.8
```
Every mark is a polyline in sheet space with a start time and duration, so drafting order, staggering and the camera are all data. The sheet texture lives in the same coordinates, so paper and ink move together. See `dim()` and `balloon()` for the annotation builders, and `buildSheet()` for the cyanotype.

## Pitfalls
- Line width multiplied by zoom gives sausages in close-ups; constant screen width makes the drawing look printed on glass → use `zoom^0.65`.
- Dashes set in screen pixels crawl during zooms → set them in sheet units (inside the sheet transform).
- High-contrast low-frequency fbm reads as clouds or camo → keep the blue range narrow and the noise fine. Blue varies in value only.
- Stains drawn as perfect circles read as drawn circles → overlap several offset blooms and use partial, faint tide arcs.
- Using the stamp colour anywhere else (a red dimension, a red note) kills the verdict → one stamp, once.
- Labels lettered into the frame edge during the close-up → plan label positions against the close-up framing, not just the wide.
- Per-pixel sheet generation is slow, and a readback canvas without the flag is nondeterministic → build it in `ready` with `willReadFrequently: true`, never in `renderAt`.
- Thin 0.9 px hairlines shimmer when encoded at the wide → keep the wide's hair weight ≥ 0.7 px on screen, and render the final file with `--preset medium`.

## Check on stills
- `still --at 4.4` (close-up): four weights visible, nib glows at the live heads, hatching at 45° inside the base section only, labels inside the frame.
- `still --at 7.9` (wide): header, figure, GENERAL NOTES, title block, signature, and exactly one red stamp. Folds and stains stay in place.
- `sheet --strip 0:3.5 --fps 4`: the layers come in strict drafting order.
- `sheet --at 4.6,5.0,5.3 --crop 600,300,400,300`: outline thickness changes much less than the zoom does.

Source: adapted from lemo-opuscar — https://github.com/lemomo-ai/lemo-opuscar/tree/main/styles/blueprint (MIT, LemoLab). Written in our own words; no assets copied.
