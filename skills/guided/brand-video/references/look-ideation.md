# Finding a look that isn't the obvious one

Adapted from the find-idea-gaps workflow. If a **find-idea-gaps** skill is installed, you may follow it instead; keep the inputs and outputs below.

Why this exists: asked for "three different directions", agents write nearly the same three every time (for a dev tool: a terminal, a chart, cut paper), and most of them pun on the product's name. Letting the seed pick among those three still gives the same few videos. So the randomness goes in **before** the ideas are written, and the obvious answers are named and set aside first.

```text
brief + brand + roll → map the obvious → 3 lens candidates + 1 gap candidate → compare → seed picks a survivor
```

## 1. Map the obvious (2 minutes, written down)

List what this brief would get by default. Write each as a few words:

- The **literal name pun**: what the product's name suggests (Beacon → lighthouse; Forge → sparks and anvils; Harvest → fields and wheat).
- The **category default**: what videos for this kind of product usually look like (dev tool → terminal, code, dark UI; finance → charts going up; AI → glowing gradient).
- The **stock looks**: dark gradient with floating orbs or particles, glassmorphism cards, word-by-word fade-ups, neon glow on black.
- The **recent looks**: every entry in `direction.json`'s `recent_looks`.

These are off limits unless the brief explicitly asks for one ("make it about lighthouses"). A candidate that is one of them in different words is also off limits. What's off limits is the default look, not the subject: a table of records is fine if it's made of something unexpected.

## 2. Write four candidates

**Three lens candidates.** `direction.json` holds three `lenses`, randomly drawn from a large list of unrelated fields (a weather map, a sewing pattern, a departures board…). Write one candidate per lens by borrowing that field's **mechanism**, not its decoration: how it shows information, what moves and why, what its materials are. A receipt lens might mean the whole story prints out as one long strip that the camera follows; a knitting chart might mean data built row by row from symbol cells.

Read the seed string for one concrete choice inside each candidate (a digit run sets a count, a repeated fragment becomes a refrain), as apply-randomness describes. Map each observation to its choice before computing anything from it.

**One gap candidate.** From step 1, name something the obvious answers all assume (a dark screen, a literal metaphor, showing the product's UI, a flat front-on camera) and write a candidate that drops that assumption. This keeps one option grounded in the brief rather than in chance.

For each candidate write, in two or three lines: what the image is made of, palette within the brand, type treatment, how things move, and the one moment it builds to. Every candidate uses the rolled `ground` and `scale`, and must still serve the format's arc and the rolled staging. Make the candidates differ in what the image is made of, not just in subject: if all four are thin lines on paper, replace two.

## 3. Compare and cut

For each candidate, name the nearest item in your step 1 list and say what's actually different. Remove any candidate that:

- collapses into an obvious answer or a recent look,
- is a cosmetic variant of another candidate (if two could share a still frame, drop one),
- only sounds unusual and wouldn't make the product clearer,
- can't be built well in the time and runtime you have.

If fewer than two survive, write a replacement from the gap or from a lens, then compare again.

## 4. Let the seed choose

Number the survivors 1 to n in any order you fix before running, then run:

```bash
node <this-skill>/scripts/roll-direction.mjs --pick <number of survivors> --seed-file videos/<slug>/seed.txt
```

Build the candidate it prints. Don't re-run it or override it because another candidate seems nicer; a survivor already passed the bar in step 3.

## 5. Record it

Set `picks.look.label` in `direction.json` to a few words naming the chosen look (e.g. "receipt strip, followed by camera"), so the next video lists it under recent looks. In the spec, include the obvious list, the four candidates, what was cut and why, and the pick.
