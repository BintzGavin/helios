# Acting: emotions, helpers and principles

Everything here is a pure function of time. No state, no integration, no counters.

## Emotions are data

Each emotion is a face, a colour, a take size and an idle body motion:

```js
const EMO = {
  neutral:   { eyes: 'normal', mouth: null,    take: .3, body: (t) => ({ dy: -.25 * abs1(t) }) },
  happy:     { eyes: 'happy',  mouth: 'smile', take: .6, blush: .3, body: (t) => ({ dy: -1.2 * abs1(t), aL: .4 + .4 * s1(t), aR: .4 - .4 * s1(t) }) },
  surprised: { eyes: 'wide',   mouth: 'O',     take: 1.3, emote: '!', fade: true, body: (t) => ({ sq: -.08, aL: 1.1, aR: .9 }) },
  sad:       { eyes: 'sad',    mouth: 'frown', take: .3, tint: 'blue', body: (t) => ({ dy: .3, aL: -.5, aR: -.6, lookY: .5 }) },
  scared:    { eyes: 'wide',   mouth: 'wobble', take: 1.1, tint: 'pale', emote: 'sweat',
               body: (t) => ({ dx: .1 * Math.sin(t * TAU * 22), aL: .9 + .1 * Math.sin(t * TAU * 17), aR: .8 + .1 * Math.sin(t * TAU * 19) }) },
  // thinking, idea, angry, proud, sleepy, confused ([narrow, wide] eyes + '?'), ...
};
const s1 = (t) => Math.sin(beat(t) * Math.PI), abs1 = (t) => Math.abs(s1(t));
```

- `take` is how big the reaction is when the character switches *into* this emotion: about .2 for bored, .6 for happy, 1.3 for surprised.
- `body(t)` is a beat-locked idle. It returns pose offsets. Scared shivers at 22 Hz with the arms at 17 and 19 Hz so they don't twin; bored sighs every four beats; happy bounces on every beat.
- `feel(name, t)` merges the face fields with `body(t)`: `character(x, y, u, feel('happy', t))`.

A useful starting set of about 30: neutral, happy, excited, laugh, love, shy, proud, smug, relieved, sad, cry, angry, furious, scared, surprised, confused, thinking, idea, determined, sleepy, bored, nervous, suspicious, disgusted, dizzy, cool, starstruck, knocked-out, playful, mischief, hopeful. Build only the ones the storyboard uses.

## Acted transitions: `emotions(t, keys)`

```js
const mood = emotions(lt, [[0, 'neutral'], [1.9, 'surprised'], [3.1, 'happy']]);
```

Around each key:

| When | What |
|---|---|
| 0.1 s before the key | The eyes squint shut (anticipation). The next emotion's take starts its small squash. |
| At the key | The face swaps, hidden under the squint. |
| 0 → 0.14 s after | The eyes open. |
| 0 → ~0.5 s | The take: a big stretch that springs back, sized by the new emotion's `take`. |
| 0 → 0.4 s | Pose fields (`dy, sq, rot, dx, aL, aR, lookX, lookY`) blend from the previous emotion with `backOut` overshoot. |
| 0 → 0.3 s | Body colour, blush and gloom cross-fade. |
| 0.06 → 0.32 s | The emote pops in with `backOut`. One-off emotes (`!`, `?`) fade out over 1.4 → 1.8 s. |

The starter page implements this in about 20 lines. Never swap `eyes` or `mouth` between two frames by hand.

## Closed-form helpers

```js
const backOut = (x) => { x = clamp(x); const s = 1.9; return 1 + (s + 1) * (x - 1) ** 3 + s * (x - 1) ** 2; };
// Damped spring kicked at t0: secondary motion and settles (a hat after landing, an antenna, a tail).
const spring = (t, t0, k = 6, w = 18) => t < t0 ? 0 : Math.exp(-k * (t - t0)) * Math.sin(w * (t - t0));
const ring = (t, events, k, w) => events.reduce((s, e) => s + spring(t, e, k, w), 0);   // one kick per event
// Hold each drawing for two frames. Wrap a character's time in it for snappier, hand-timed motion; keep the camera on ones.
const onTwos = (t) => Math.floor(t * 12 + 1e-4) / 12;
// A point on a thrown arc from p0 to p1, peaking h px above the straight line; k = 0..1 along the flight.
const arcPt = (p0, p1, h, k) => [lerp(p0[0], p1[0], k), lerp(p0[1], p1[1], k) - h * 4 * k * (1 - k)];
// Camera shake that changes 24 times a second, from a hash, never from Math.random.
const shakeXY = (t, amt) => { const f = Math.floor(t * 24); return [(hash(f * 1.7) - .5) * 2 * amt, (hash(f * 2.3 + 9) - .5) * 2 * amt]; };
```

`jump(t, t0, t1, h)` and `take(t, t0, amt)` are in the starter. A jump is: 0.12 s crouch (anticipation), stretch on takeoff, parabola, damped-cosine squash on landing. A take is: a small squash just before, then a big stretch up that springs back.

**Walks.** Drive a leg phase from distance travelled, not time, so feet don't skate: `walk = x / strideLength`. In a side view with four legs, diagonal pairs swing together and lift on the forward swing: `ph = (walk + [0, .5, .5, 0][i]) * TAU`. Ease the walk's start and stop; bob the body twice per stride.

**Beat moves.** A dance is pose offsets from the beat phase: bounce (`dy` on every beat with a squash on the hit), sway (`rot`), wave (one arm), stomp. Use two or three, not a library.

## The principles, as code problems

Code moves every part at once, on the same curve, by the same amount. Each principle fixes a version of that:

- **Anticipation:** a small opposite move before a big one. `jump` crouches; `emotions` squints first.
- **Squash and stretch:** `sq`, volume-keeping.
- **Slow in, slow out:** run every `lerp` through an easing. Linear is for machines.
- **Weight:** heavy things start and stop slowly and barely bounce; light things snap, bounce and flutter.
- **Arcs:** thrown props, hops and arm swings travel on arcs (`arcPt`), never straight lines.
- **Overlap and follow-through:** the eyes lead, the body follows, then arms, hats and props drag and settle last. Offset each by a few frames and add a `spring` settle.
- **Avoid twinning:** give one arm the action and the other something smaller; offset phases and blink seeds between characters; never let a crowd bounce in unison.
- **Exaggeration:** push poses, takes and leans further than feels natural. If it looks like too much on the sheet, pull back a little.
- **Strong key poses:** block each shot's storytelling poses as stills first. If they don't read, motion won't fix them.
- **Show the thought:** the character notices, thinks, then acts.
- **Secondary action:** a hat bob, a popping emote, grass stirring. It supports the main action and never competes with it.
