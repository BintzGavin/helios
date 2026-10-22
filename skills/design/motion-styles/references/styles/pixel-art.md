# Pixel Art

A tiny indexed framebuffer — every pixel a palette slot, every colour from one fixed master palette — blown up by a whole number so each logical pixel is a crisp square. **Not:** a high-res illustration with a "pixelate" filter, smooth sub-pixel motion, alpha fades, or soft glows; light, time of day and transitions are done by swapping colour tables and dithering.

| Best for | Route | Difficulty | Needs |
|---|---|---|---|
| Game-flavoured explainers, product "quests", story shorts with dialog, nostalgic launch teasers | Canvas 2D: `Uint8Array` slot buffer at 320×180 → per-stage LUT → `putImageData` → integer `drawImage` with smoothing off | Medium | Press Start 2P (Google Fonts) for text |

Demo: [pixel-art.html](pixel-art.html) — `npx -y @helios-project/cli@latest render pixel-art.html -o pixel-art.mp4 --duration 8 --fps 30 --mode canvas --preset medium`

## Look
- **Palette:** one fixed 32-colour master palette (the demo's: inks `#0b0a14 #1b1a2e #2a2c4f #3d4775`, skies `#566aa6 #7fa3d9 #b5d8f2`, white `#f4f1e6`, warm ramp `#4d2d45 #7a3e5c #b8576a #e8826a #f5b56b #fbe39a`, greens `#173126 #23502f #3a7a3c #6aa84f #a6d06a`, earth `#3b2a22 #5e3f2c #8a5f3c #c08f5a`, stone `#4a4f5e #757c8c #a9b0bd`, water `#1f6f8b #2fa4c4 #7ee3e8`, red `#e04a3f`, skin `#f0d0b0`).
- **Colour rules:** the picture is drawn in **semantic slots** (SKY0, GR1, CL0, SCARF…), never in colours. Each time-of-day stage is a LUT slot → master index; stages change on a cut, never by blending. 2–3 **protected** slots (the hero's scarf, the crystal, UI text) ignore every stage and every light. Light is a second LUT (slot → one step brighter/warmer or cooler), applied through a mask; air and distant layers are never lit. Gradients exist only as 4×4 Bayer dither between two neighbouring slots.
- **Type:** a pixel font at its native size inside the framebuffer — Press Start 2P at 8 px for dialog (≈ 0.044 H on screen) and 16 px for the title (≈ 0.09 H), 1 px ink outline (8-neighbour) and a 1 px drop shadow, title coloured by rows (cream / amber / coral). Captions are a **dialog box**: ink + white border, dark dithered fill, typed at 24 chars/s, ▼ blinking at 1 Hz when done. The floor line stays above the box.
- **Materials & texture:** everything is flat slots plus dither: sky in three dithered bands, dirt with sparse seeded specks, pines as stepped triangles, a shrine of stone blocks with a 1-px lit edge. Sprites are string art with a legend (`k` ink, `h` hair, `r` scarf…), 12×18 px, outlined in ink, lit from the upper left. No textures are loaded.

## Motion
- **Rates:** poses at 10 fps (`floor(t*10)/10`) — 2-frame walk (stride / pass) with a 1-px bob; idle breath 1 px at 2 fps; palette cycling at 6–8 fps; title drop quantised to 15 fps.
- **Positions are integers:** sprites, camera and every parallax layer round their own offset (far 0.25×, hills 0.5×, ground 1×). No sub-pixel easing.
- **Camera:** horizontal follow-scroll with parallax; **zoom only in integer scale steps** (×6 → ×7 → ×8 and back), each step held, never a smooth zoom.
- **Transitions:** palette stage cuts (day → golden → sunset → dusk → night, held 0.6–0.7 s each), Bayer dissolves (the title disappears pixel by pixel by threshold, not by alpha), dialog boxes opening vertically over 0.25 s. **Banned:** alpha fades, blur, rotation, non-integer scaling.

## Signature checklist
1. Logical resolution 320×180, displayed at an integer scale (×6 = 1920×1080); every edge in a still lands on a 6-px grid.
2. ≤ 32 distinct colours in any frame, all from the master palette.
3. Day → night happens in ≥ 4 discrete palette stages, with the same pixels (stars present all day, invisible until the night LUT maps them to white).
4. At least one palette-cycled element (water stripes, firefly blink, crystal facets) rotating at 6–8 fps with no pixel redrawn.
5. Sprite animation changes pose ≤ 10 times per second; idle has a 1-px breath.
6. Light pools: solid inner 60 % of the radius, Bayer-dithered rim to 100 %; the sky gets only a sparse (≤ 55 %) dithered halo.
7. Zoom changes in whole-number steps (6/7/8), each held ≥ 0.15 s.

## Native moves
- **Night by table.** The world doesn't move; its LUT steps from day to night in five cuts, the sun sinks behind the hills, stars "appear" because their slot finally maps to white. *Fits:* time passing; a mood turning; a before/after with nothing redrawn.
- **The protected colour ignites.** At the peak, the crystal's protected slots switch on and cycle while a cool light LUT spreads in a dithered pool, and the camera steps in ×6 → ×8. *Fits:* a product's key feature lighting up; a goal reached; "level complete".
- **Dialog box as subtitle.** The line types into a framed box inside the framebuffer, with a blinking ▼. *Fits:* a character's one line; a tagline; a call to action.

## Core technique
```js
const buf = new Uint8Array(320 * 180);                 // palette SLOTS, not colours
const img = lctx.createImageData(320, 180), U32 = new Uint32Array(img.data.buffer);
// in ready: one LUT per stage, slot -> master index (tinted, then re-quantised to the master palette)
LUTS = STAGES.map(st => SLOT_DEF.map(([name, day, prot]) => prot ? day : nearest(MASTER[day].map((v, k) => v * st.tint[k]))));
// per frame: draw slots into buf (dither = choose between two slots by Bayer threshold) ...
const L = LUTS[stage].slice();
for (let k = 0; k < 3; k++) L[S['W' + k]] = LUTS[stage][S['W' + ((k + Math.floor(t * 6)) % 3)]];   // palette cycling
for (let i = 0; i < buf.length; i++)
  U32[i] = PACK[lit[i] === 1 ? LIT_W[stage][buf[i]] : lit[i] === 2 ? LIT_C[stage][buf[i]] : L[buf[i]]];
lctx.putImageData(img, 0, 0);
out.imageSmoothingEnabled = false;                       // integer scale only
out.setTransform(k, 0, 0, k, -sx * k, -sy * k); out.drawImage(low, 0, 0);   // k ∈ {6,7,8}, sx/sy integers
```
Drawing slots instead of colours is what makes palette shifts, cycling and lighting free: they are table lookups at present time. `nearest()` keeps every tinted stage inside the master palette, so the image never gains colours. See `world()`, `hero()` and `lightPool()` in the demo.

## Pitfalls
- Drawing colours instead of slots → no palette tricks are possible later; decide slots first.
- Smooth camera or sprite motion → shimmering half-pixels; `Math.round` every layer offset, quantise poses with `floor(t*fps + 1e-4)/fps`.
- Non-integer scale (`drawImage(low, 0, 0, 1920, 1080)` from 274 px wide) → uneven pixel widths; zoom with an integer `setTransform` and crop.
- A light LUT that brightens everything → the sky turns grey and hills turn into brown discs; exempt air and far layers, and let a small lantern light only the near ground.
- Night LUT so dark the hero vanishes → keep an ink outline, give the hero a contrasting cloth, and carry a light.
- Fine 1-px dither everywhere at ×6 is fine for encoding (6-px cells), but per-frame random dither is not → dither is a fixed Bayer pattern in world or screen space, never re-rolled.
- Pixel font rendered at a non-native size → blurry glyph edges; render masks at the font's own size in `ready` (threshold alpha) and blit them as slots.
- Render at 30 fps but animate at 10 → that is intended; don't add easing between the steps.

## Check on stills
- `sheet --at 1,1.1,1.2,1.3 --crop 360,660,200,200` — the walk alternates stride/pass, scarf tail moves, everything on the 6-px grid.
- `sheet --every 0.5 --duration 8` — five distinct palette stages between 1.8 s and 3.7 s; stars only at night.
- `still --at 5.5` — integer zoom ×8, crystal facets cyan, cool pool lights stone and hills but only a sparse halo in the sky.
- `still --at 7.6` — dialog text crisp, ink shadow 1 logical px, ▼ visible.

Source: adapted from mg-styles-15 — https://github.com/Vincentwei1021/mg-styles-15/tree/main/demos/20-pixel (MIT, Vincentwei1021) and lemo-opuscar — https://github.com/lemomo-ai/lemo-opuscar/tree/main/styles/pixel-rpg (MIT, LemoLab). Written in our own words; no assets copied.
