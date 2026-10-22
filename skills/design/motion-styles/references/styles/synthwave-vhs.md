# Synthwave VHS

A night drive into a striped sunset on an endless neon grid, with a chrome title, recorded onto a worn videotape and played back on a deck. **Not:** a pink-and-cyan gradient with a grid PNG and a "glitch" filter: the chrome is lit by the scene's own horizon, the grid moves at a real speed, and the tape damage has the grammar of an actual playback (stutter, rewind, tracking).

| Best for | Route | Difficulty | Needs |
|---|---|---|---|
| Title cards, retro product or event openers, music/visualizer intros, "now playing" bumpers | Canvas 2D (chrome title built once with offset-fillText extrusion; perspective grid by projection) + optional raw-WebGL VHS pass | Medium | Fonts: Archivo (expanded italic 900), Mr Dafoe, Michroma, VT323 |

Demo: [synthwave-vhs.html](synthwave-vhs.html) — `npx -y @helios-project/cli@latest render synthwave-vhs.html -o synthwave-vhs.mp4 --duration 8 --preset medium` (add `?novhs` to the URL to see the clean picture)

## Look
- **Palette:** sky top `#06010f` → `#1a0636` → `#4d0c55` → horizon `#a8237a`; floor `#2a0640` → `#05000c`; grid magenta `#ff6ee6` over a `rgba(255,30,190,.16)` glow; sun `#fff3a0` → `#ffd23f` → `#ff8a3c` → `#ff3d7f` → `#e0237a`; mountain rims cyan `#3ee8ff` (left) and magenta `#ff4fd8` (right); neon script `#ff1fb0` with a `#ffd6f4` core; tagline cyan `#c8fbff`; OSD white `#f4f4ff` with a hard black drop.
- **Colour rules:** two light colours do all the work (magenta and cyan), and one warm object (the sun) is the only place orange and yellow appear — the chrome face picks them up as a *reflection* of that sun. Black stays purple-black, never neutral grey. Nothing is lit from nowhere: every glow is attached to a light source (grid line, horizon, sun, tube).
- **Alternative palette (dawn):** sky `#14213d` → `#fca311`, grid `#7df9ff`, sun `#ffe066` → `#ff6b6b`, script cyan. Same rules.
- **Type:** chrome headline in **Archivo Black-weight italic, expanded width (wdth 125, wght 900)**, cap height ≈ 0.16 H, centred at y ≈ 0.33 H. A brush script (**Mr Dafoe**) at ≈ 0.19 H, rotated −7°, overlapping the headline's lower-right corner as the neon line. Tagline in **Michroma** 28 px (0.026 H), tracked 13 px, in cyan glow above the headline. Deck OSD in **VT323** 84 px (0.078 H), white with a 4 px black offset, corners only. Captions, if any, are OSD-style VT323 lines, never the chrome face.
- **Materials & texture:** chrome = a stack of 14 dark-purple copies of the word offset down-right (the extrusion), a neon stroke at the very back, a dark outline, a rim gradient stroke, then the face gradient split hard at its middle (blue sky above, near-black seam, orange ground below), grid lines reflected into the lower half, and two 2–3 px bevel slivers. The tape is a post pass: chroma smeared horizontally while luma stays sharp, red shifted 2 px right, a dark scanline every 3 px, a rolling tracking band only when the deck is struggling.

## Motion
- **Easing:** title punch-in `easeOutExpo` from scale 1.7 → 1.0 over 0.55 s; tagline tracking closes 30 → 13 px with `easeOutCubic` over 1.2 s; sun rise `easeOutCubic` over 2.4 s; grid kick pump `1 + 0.35·e^(−7·age)` on each beat (0.6 s at 100 BPM).
- **Two clocks:** typography runs on real `t`; the *world* (grid, sun, slats) runs on `sceneTime(t)`, the tape clock. Tape clock grammar: 15 fps (every other frame held) while the deck locks on in the first second, two frames played *backwards* at the rewind cue, 15 fps drag into the slam, then clean 30 fps.
- **Camera:** dolly forward only, at a speed that ramps and brakes (7 → 19 → 9 units/s with an exponential surge after the slam). Position is the integral of speed, tabulated once — never `z = speed·t` when speed changes. A gentle lateral sway (±0.35 units, 0.7 rad/s) is the only other move. **Banned:** cuts to unrelated angles, rotations of the horizon, zoom blur, shaking the OSD.
- **Transitions:** the tape gives you them — tracking noise in, a rewind blip, a flash on the slam. No wipes, no crossfades between scenes.
- **Holds:** the end hold keeps the grid gliding, the slats scrolling, stars twinkling and the timecode ticking.

## Signature checklist
1. Horizon line at ≈ 0.59 H with a 2–3 px hot line (`#ffe2f6`) and a pink haze band ≈ 110 px tall.
2. Grid: longitudinal lines converge to one vanishing point at the horizon; transverse lines scroll toward camera and fade out by ≈ 35 grid units of depth, and longitudinal lines fade with depth too (no moiré mush at the horizon).
3. Sun: ≥ 5 horizontal slats in its lower half, gap width growing from ≈ 1 % to ≈ 8 % of the diameter toward the bottom, scrolling down.
4. Chrome face: hard colour break at exactly 50 % of the cap height (light blue-white above, near-black seam, orange below), with an extrusion depth of ≈ 14 offset copies (≈ 16 px down-right).
5. The world runs on a tape clock with deck grammar, not on `t`: at least one of a 15 fps lock-in, FF cue-search bars, SLOW, a PAUSE freeze with a jittering field, or a short rewind (in the demo, frames 0–29 change only on even frames and two frames step *back* at the rewind cue).
6. VHS pass: scanline period 3 px at ≤ 14 % darkening; chroma blur ≈ 7 px, red offset 2 px; tracking band only when the OSD says the deck is busy (PLAY lock-in, REW).
7. One neon "strike" on the hero beat: lit → one dim frame-pair → lit, then steady (≤ 2 flashes, small area).

## Native moves
- **Rewind into the slam.** OSD flips to `◀◀ REW`, the world steps two frames backwards and drags at 15 fps, then everything snaps to 30 fps as the chrome flashes and a glint sweeps the face. *Fits:* the drop of a track; the reveal of a product name; the emotional peak of the piece.
- **Neon strike.** The script is visible first as unlit glass (a 35 %-alpha stroke), then the tube fires with one stutter. *Fits:* a subtitle or sub-brand arriving after the headline; "Live", "Tonight", a date.
- **Deck grammar.** `▶▶ FF` with horizontal noise bars and the world at 4–8× speed (cue search), `SLOW` at ¼ speed, `❚❚ PAUSE` holding one field with a 1–2 px vertical jitter, a short `◀◀ REW`. All are `sceneTime(t)` remaps plus an OSD label. *Fits:* skipping ahead in a story, dwelling on one moment, a freeze-frame reveal.
- **Deck OSD as the narrator.** `PLAY ▶`, `◀◀ REW`, `SP 0:00:12` are the only UI, drawn crisp on top of the tape (the deck generates them, so the VHS pass never touches them). *Fits:* countdowns, chapter markers, timestamps that carry meaning.

## Core technique
```js
// Chrome title, built once in ready on an offscreen canvas `g` (font: italic 900 expanded Archivo)
for (let k = 14; k >= 1; k--) {                         // extrusion: offset copies, darkest at the back
  const q = k / 14; g.fillStyle = `rgb(${lerp(96,22,q)|0},${lerp(18,4,q)|0},${lerp(132,46,q)|0})`;
  g.fillText(TITLE, x + k * 0.35, y + k * 1.15);
}
g.strokeStyle = '#0a0014'; g.lineWidth = 10; g.strokeText(TITLE, x, y);
const face = g.createLinearGradient(0, y - asc, 0, y);   // sky / hard seam at 50 % / ground
[[0,'#0b1a4d'],[.32,'#5fb8ff'],[.495,'#fff'],[.505,'#2b0a26'],[.70,'#c2452f'],[.94,'#ffd98a']]
  .forEach(s => face.addColorStop(...s));
g.fillStyle = face; g.fillText(TITLE, x, y);
l.fillText(TITLE, x, y); l.globalCompositeOperation = 'source-in';   // grid reflection clipped to the letters
for (let k = 1; k <= 7; k++) l.fillRect(0, hz + (y - hz) * Math.pow(k / 7.4, 1.55), w, 2);
g.drawImage(L, 0, 0);

// Tape clock and camera: pure functions of t
function sceneTime(t) {
  const fr = Math.round(t * 30), r0 = Math.round(REW * 30);
  if (fr < 30) return Math.floor(fr / 2) * 2 / 30;                // 15 fps lock-in
  if (fr >= r0 && fr < r0 + 2) return (r0 - 1 - (fr - r0)) / 30;  // two frames backwards
  return t;
}
// in ready: ZT[i] = trapezoid integral of speed(); camZ(ts) interpolates ZT
// grid: screenY = HY + f * camH / depth, depth = k * S - (camZ(ts) % S)
```
The chrome is all layering of one `fillText`: the extrusion is just offset copies, and the "metal" is a gradient with a hard seam that mirrors the horizon behind it. The world is driven by `sceneTime(t)`, so stutter and rewind cost nothing and stay deterministic; the camera reads a precomputed integral of a speed curve so it can accelerate and brake without drift. See `buildChrome`, `floor` and the shader in the demo.

## Pitfalls
- Grid lines bunching into a solid pink band at the horizon → fade transverse lines by depth (`alpha = 1.15 − d/34`) and let the haze gradient cover the last few px. Fade longitudinal lines with depth as well (draw each in depth segments, or stroke with a gradient toward the horizon); with a high camera or a curved floor they otherwise pile into a band.
- Slats only in the sun's lower half → a setting sun loses them behind the horizon; start them higher (from ≈ 0.3 R above the centre) or place them relative to the horizon line instead of the disc.
- Camera as `z = speed * t` after a speed change → jumps; integrate the speed curve once in `ready` and look positions up.
- `sceneTime` built from accumulated state ("if we rewound last frame…") → breaks `verify`; it must only read `t`.
- Heavy per-pixel tape noise all the time → huge files and smeared encodes; keep grain off, scanlines ≥ 3 px period, and the noisy tracking band only for ~1 s total.
- Neon strike or slam flash as full-frame white strobes → flash-safety risk; keep the flash inside the chrome letters, ≤ 2 off/on changes per second.
- OSD put through the VHS pass → blurry, unreadable timecode; draw it on its own canvas above the WebGL output (render in default `dom` mode).
- Scene canvas uploaded to WebGL every frame without `willReadFrequently` → history-dependent antialiasing; create it with `{ willReadFrequently: true }`.
- Chrome redrawn from scratch each frame → slow; build it once in `ready` and only add the glint (clipped with `destination-in` to a face mask) per frame.

## Check on stills
- `still --at 0.3,4.55` — tracking band and `PLAY` / `◀◀ REW` OSD visible; OSD sharp while the picture is softened.
- `still --at 5.4` — chrome seam is a crisp line at mid-height, the grid reflection reads in the lower face, the script is glowing hot pink and overlaps the headline's lower right.
- `sheet --strip 0:1 --fps 30` — pairs of identical frames (15 fps); `sheet --strip 4.4:4.9` — two frames going backwards.
- `sheet --at 5.4 --crop 0,560,1920,200` — no moiré at the horizon; the hot line is continuous.

Source: adapted from mg-styles-15 — https://github.com/Vincentwei1021/mg-styles-15/tree/main/demos/10-synthwave (MIT, Vincentwei1021), with the VHS/CRT pass informed by lemo-opuscar `styles/cel-anime-80s` and `core/post/crt.js` — https://github.com/lemomo-ai/lemo-opuscar/tree/main/styles/cel-anime-80s (MIT, LemoLab). Written in our own words; no assets copied.
