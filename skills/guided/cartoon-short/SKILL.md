---
name: guided-cartoon-short
description: "Hand-drawn cartoon shorts drawn in code: a character you design, acted emotions, drawn turnarounds, and boiling ink-and-paint linework, as one Helios renderAt(t) page. Covers storyboarding by reads, the character rig, the emotion timeline, closed-form acting helpers (jump, take, spring), transitions and the review loop. Use for animated shorts, mascot-style explainers, story-driven cartoons and character loops."
---

# Cartoon short

A short cartoon where a character wants something, something happens, and they react. It looks hand-painted: flat colour, ink lines that boil, paper grain. Everything is drawn in Canvas 2D inside one `window.renderAt(t)` page, so the [make-video](../../../plugins/helios/skills/make-video/SKILL.md) contract applies: every frame is a pure function of `t`.

Start from [starter.html](starter.html). It's a complete, tested 6-second shot: an original character goes bored → surprised → happy and jumps, with boil, paper, grain and iris transitions. Copy it, then replace the character, the emotions and the shots.

Code-drawn characters are a deliberate style: simple, iconic shapes with boiling ink. They don't replace a real illustration. If the brief needs a detailed or realistic character, say so and ask for artwork.

## The three goals

- **Handmade.** Brush-like ink that boils, flat 2D, soft palette, paper underneath. No vector-perfect shapes, no 3D projection.
- **Alive.** Something always moves. Faces act and never snap. The character is big enough to feel.
- **One piece.** One short film with an arc, not a pile of clips. Plan it before you draw it, and link every shot to the next.

Underneath all three, the viewer has to follow it. Timing is what generated animation gets wrong most often.

## Design your own character

Never reuse an existing mascot or a well-known character, even a "simplified" one. Design one for this video:

- A silhouette that reads when filled solid black: one main shape (bean, sock, box, drop), a few parts (eyes, arms, legs).
- A size unit `u`. Every coordinate in the rig is a multiple of `u`, so the same function draws a wide shot and a close-up.
- A two- or three-colour body: base, a lighter pool, a darker settle. No pure black or white anywhere; use a dark ink like `#2b2233` and a cream like `#fff5e2`.

See [references/rig.md](references/rig.md) for the rig contract, face drawers, a views table for turnarounds, and a model sheet page.

## 1. Storyboard first, timed by reads

Write `STORYBOARD.md` before any scene code:

```
Logline: <character> wants ___, but ___, so ___.
World: setting, 4–6 colours, light, and how the colour changes across the video.
Motif: the thing that recurs and pays off.
Arc: the emotion keys across the whole video.
Shots:
  A  0.0–4.2  [in: iris from paper]  what's seen · EVENT · reaction · camera
     reads: 0.4–1.6  bored character in a meadow
            1.9–2.6  something pops behind them (eye is led there by a look)
            2.6–3.6  surprise → delight
  B  4.2–7.0  [match cut on the jump]  ...
  [out: iris to the character's face]
```

A **read** is one thing the viewer must understand. Each needs time to be found, understood and registered before the next starts.

- **One read at a time.** Put a cause and its reaction in sequence, never on top of each other.
- **Fast actions, slow meanings.** A move can be quick if it's anticipated; what it means needs a hold.
- **Lead the eye.** Before an important read, a character looks at it, the camera moves to it, or it moves first.
- **Let reads set the length.** Lengthen a shot or cut a read; never squeeze. The last read needs time to land before the end.

A worked example of fixing a rushed ending, from ~1.3 s to ~4 s: throw 0.15 s, flight 0.8 s, payoff 0.45 s, reaction 0.6 s, wave 0.45 s, reply 0.4 s, iris and hold 1.2 s.

Check the storyboard: an event in every shot, time for every read, a transition at every seam, no text, and an ending that rhymes with the opening (same place, pose or motif, changed).

## 2. Rules

1. **Every shot has an event.** Something changes between its first and last frame. "Character stands in a meadow being cute" is not a shot.
2. **No text.** No captions, labels, signs or speech-bubble words. Reactions are painted marks: `!`, `?`, sweat drops, hearts, a bulb, a rain cloud. A sign that repeats the story is the classic failure. If the brief truly needs a word, paint it into the scene once.
3. **Flat 2D only.** Turns go through drawn key views (front, ¾, side, back), never a 3D rotation. Depth comes from overlap, scale and colour: farther is smaller, bluer and paler.
4. **Nothing is ever still.** Every emotion has an idle; cameras drift or push; grass sways; lines boil. A frozen frame reads as a bug.
5. **The character is big.** In `u` for a 10u-wide character: wide shot 10–16, medium 20–28, close-up 40–70. Tiny is only for establishing shots.
6. **One pulse.** Idles, bounces and hits share one beat (`BPM` in the starter, or real beats from `helios analyze`), even with no music.
7. **Transitions at every seam:** in, between every pair of shots, and out. Pick one that belongs to the story: iris or shaped iris, brush wipe, whip pan with a smear, match cut, cut on action, camera carry. Props arrive and leave on arcs; they never pop.

## 3. Build

**Boil.** Line wobble is reseeded 12 times a second, so each drawing holds for two frames like hand-drawn animation. Give **every element its own seed** from a stable key and the boil index: `rng('hill')`, `rng('tuft' + i)`, `rng(key + 'armL')`. With one shared random stream, a moving element uses a different amount of randomness each frame and everything drawn after it jitters. Things that must never move (tuft positions, star layout) use `hash(i)`, which doesn't boil.

**Render hand-drawn pieces at 24 fps** so each 12 fps drawing holds exactly 2 frames. At 30 fps they hold for 2 or 3 frames unevenly, which stutters. If you must render at 30, boil at 15.

**Paint recipe** for each solid shape: wobbly fill slightly off the line, a light pool top-left, a darker settle along the bottom, then the ink outline last with a fainter dry second pass. Backgrounds get soft fills with no outline or a thin one. Light (a glow, a lamp) is additive (`globalCompositeOperation = 'lighter'` or `'screen'`), not paint. See [references/look.md](references/look.md).

**Shots** are `fn(t, lt, dur)`: video time, time since the shot started, shot length. Each paints the whole frame. Keep them in a list and pick the active one in `renderAt`, as the starter does.

**Acting** comes from data and closed-form helpers, never from state:

```js
const mood = emotions(lt, [[0, 'bored'], [1.9, 'surprised'], [3.1, 'happy']]);  // acted changes
const hop = jump(lt, 3.6, 4.2, 3.2);                                            // crouch, arc, squash
bean(960, 900, 46, { ...mood, dy: mood.dy + hop.dy, sq: mood.sq + hop.sq });   // add shared fields, don't overwrite
```

`emotions()` never swaps a face between two frames. Around each key the eyes squint shut over 0.1 s, the face swaps under the squint, the eyes open over 0.14 s, a take fires sized by the new emotion, the pose blends with overshoot over 0.4 s, and colour cross-fades over 0.3 s. See [references/acting.md](references/acting.md) for the emotion table, the helpers, walks and the animation principles.

## 4. Look at it

You can't see motion by reading code. Use the Helios review tools at three zoom levels:

```bash
npx -y @helios-project/cli@latest sheet short.html --at 0.2,1.9,2.4,3.6,4.1,5.8 --duration 6   # every shot's first, key and last frames
npx -y @helios-project/cli@latest sheet short.html --strip 1.8:2.6 --fps 24                    # every frame of a take, jump or transition
npx -y @helios-project/cli@latest sheet short.html --at 2.2 --crop 700,250,520,420              # a face that carries the story
npx -y @helios-project/cli@latest verify short.html --duration 6                               # catches boil seeded from a shared stream
```

Check:
- **Read:** is each shot's event clear from its sheet alone? Is the character big, and separate from the background?
- **Timing:** render a sheet at a fixed 0.1–0.15 s step and read it in order. At each frame, where is the viewer looking, and do they understand it yet? Count the frames each read gets (24 = 1 s).
- **Motion:** in strips, does every move have anticipation and follow-through? Any pops or snaps? Are both arms or two characters moving in unison (twinning)? Are poses pushed far enough?
- **Boil:** in a 24 fps strip, each pair of frames should match except where something moves. Anything still that changes every frame needs its own seed.
- **Contacts:** feet on the ground, held props touching the hand, thrown things leaving from the hand.
- **Seams:** the first and last 0.5 s of every shot.
- **Rules:** any text, 3D, dead stretch, pure black or white?

Budget: at least one sheet per shot, a strip for every key motion and transition, and a crop for every face that carries the story.

## 5. Render

```bash
npx -y @helios-project/cli@latest render short.html -o short.mp4 --duration 12 --fps 24 --mode canvas --preset medium
```

Add `--audio track.mp3` for music, and land hits on its beats: see the make-video skill's music reference.

## Common failures

- Faces swapped between two frames instead of through `emotions()`.
- Everything at one brisk speed; reads overlapping; the ending over before it's understood.
- A tiny character in the middle of a big empty frame for the whole video.
- Both arms mirrored, two characters blinking together, a crowd bouncing in unison.
- Lines that jitter every frame on still things (shared random stream) or never boil at all.
- A sign or caption that explains the joke.
- Hard cuts with no transition; a video that starts on a hard frame or just stops.
- A rotated 3D box instead of a drawn turnaround.
- Props that pop into existence instead of arriving on an arc.

## Credits

The working method (reads-based timing, per-element boil seeding, the acted emotion timeline, the views table and the review checklist) is adapted from [ClaudeAnimationBase](https://github.com/JohnHeibel/ClaudeAnimationBase) by John Heibel, MIT License. See [THIRD_PARTY.md](../../THIRD_PARTY.md).
