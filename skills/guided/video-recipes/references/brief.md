# The video brief

Short prompts can produce great videos, but only because the agent then makes every decision itself and checks its own work. A written brief makes those decisions explicit, so the result is reproducible and reviewable. For anything longer than about 10 seconds, write the brief first, even if the user gave one line.

## Template

```
INPUTS      What to ask the user for, each with a default if they skip it:
            name, one-line promise, the 3–12 states/objects/facts to show, accent colour,
            song and its licence, any footage, photos or screenshots. Ask once, in one message, then proceed.

SEED        A random string (apply-randomness, or `tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 256`),
            and a short map: verified pattern → the creative choice it decided. Draw it before CONCEPT.

CONCEPT     One sentence.
            One CENTRAL VISUAL RULE: "the baseline is a trajectory", "one shape, never cut",
            "one pencil line promoted three times", "every scene is born from the last".
            One HERO OBJECT that carries through every scene.

LOCKED COPY Exact on-screen text, in exact order. No extra slogans.
            A facts file is the only source of numbers, names and claims.

LOOK        Size, fps, duration. Palette as hex with roles (ground / type / accent / secondary).
            1–3 typefaces with weights and tracking. Safe margins.
            Camera rule (locked; or only push, pull, roll; or velocity-matched).
            Texture (grain, paper) or none. A named style from the motion-styles library only if the user asked for it.

MOTION      One easing personality (a named curve, or a spring with frequency and damping).
            Stagger. Transition grammar (morph, flood, iris, mask line, match cut).
            Rules: "nothing pops in", "no hold longer than 1 s", "outgoing text leaves before incoming arrives".

BANNED      An explicit list. Starters: particle bursts, lens flares, glows on everything, RGB split,
            camera shake without an impact, crossfades between unrelated scenes, bouncy easing on UI,
            gradients on UI chrome, decorative corner labels and frames, purple-to-blue gradients by default.

STRUCTURE   A beat grid (BPM, bars, what lands on each beat), or a timestamp table:
            time | start state | visible change | end state | exact text | what carries into the next shot.
            Name three signature moments without naming effects. Loops: the last frame equals the first.

BUILD       Numbered technical rules: pure function of t; springs summed per target; how footage and
            images are loaded; where sound comes from; motion blur or not.

GOTCHAS     Known failure modes for this technique (see techniques.md).

GATES       Before code: the storyboard or beat map.
            Before the full render: stills at named times, plus a strip over the hardest 2–4 seconds.
            After: verify, check, and the measured checks below.
```

## The highest-leverage directives

0. **Diverge before you converge.** Draw a seed and write three genuinely different directions before picking one. Don't open a style library or a demo to find the idea; they pull every video toward the same few looks.
1. **One central visual rule and one hero object.** A single idea the viewer can feel ("an orange dot links every scene", "the button is the only saturated thing") does more than any effect.
2. **Every scene is made from the previous one.** Shapes morph, floods contract, objects carry across. A cut or crossfade between unrelated scenes is a slideshow.
3. **Locked copy and a facts file.** Never invent a number, a feature, a review or a result. Label anything illustrative as illustrative.
4. **A banned list.** Most of the "template look" comes from a handful of effects. Name them and ban them.
5. **Palette as hex with roles, type with weights and tracking.** Decide light or dark deliberately; dark is not the only premium look.
6. **A beat grid, and what lands on each beat.** Start moves about 0.05 s early so they land on the beat. Cue spoken-word and voiceover pieces to phrases, never to a dance beat.
7. **Storyboard first, then stills at named times before the full render.** Each still should work as a poster.
8. **Measurable quality bars:**
   - At most about 1 s with nothing moving per 30 s, and no still stretch over about 0.5 s unless it's a deliberate hold.
   - Text contrast of at least 4.5:1.
   - Frame 1 is a finished composition: no empty or half-built first frame.
   - The film makes sense with the sound off.
   - Text stays on screen long enough to read: at least `letters / 15 + 1.5` seconds, and at least 1.8 s.
9. **A fresh critic.** After the build, review it as someone who hasn't seen the code (a second agent if you can): a contact sheet every 0.2–0.5 s, dense strips around transitions, full-size crops of text. Return a ranked list of problems with timestamps; fix the worst first; keep a log of each round.
10. **Real assets and real data.** No placeholder screenshots, fake reviews or invented metrics. Inspect the product's repo or site first. Generated or drawn imagery is for supporting shots and is labelled as concept.
11. **Show, don't label.** Every transition demonstrates something; every action produces a visible result.
12. **Simulate the real thing.** A random walk is an actual seeded random walk; a mechanism computes its answer by its own motion.
13. **Reading holds.** No word starts decorative travel before it has been read; text being read is never motion-blurred; the phrase being read is at least 64 px tall at 1080.
14. **Sound per event.** Every visible impact has a sound, every sound has a visible cause, effects sit under the music, and the mix is checked.
15. **Autonomy.** "Make the calls; finish when every gate passes." Then the agent must actually run the gates.

## Self-score and revise

After the first full render, score it 1–10 on seven axes:

| Axis | 6 = template | 8 = agency | 9 = award |
|---|---|---|---|
| Fidelity to the chosen style or genre | | | |
| Concept and wow | | | |
| Motion craft | | | |
| Design and typography | | | |
| Finish and texture | | | |
| Sound and sync | | | |
| Technical (determinism, encode, safety) | | | |

Fix the lowest axis first. Write 5–10 fixes, each with a timecode, what, why and how (with numbers), including at least one fix that raises the wow factor. Re-render and score again. Two rounds is usually enough.
