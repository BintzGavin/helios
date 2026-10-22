# Mechanism / proof

A machine or diagram where every motion is one logical step, so the viewer watches the answer being produced and reads it off the mechanism, then sees the general rule and its limits stated plainly.

| Typical length | Format | Best styles | Demo |
|---|---|---|---|
| 30–90 s | 16:9 (mechanism left, readout right) | `swiss-grid`, `blueprint`, `bauhaus-poster` | [mechanism-proof.html](mechanism-proof.html) |

Good subjects: a marble or abacus adder, a sorting network, gears that multiply, a balance that solves an equation, a visual proof (1 + 3 + 5 + … + (2n−1) = n² as growing L-shaped layers, or a triangle rearranged into a rectangle).

## Structure

| Beat | Share | What happens |
|---|---|---|
| Problem | 10 % | The worked example is loaded and legible: inputs in place, written in tabular figures ("A 1011₂ = 11", "B 0110₂ = 6"). One line states the single rule. |
| Load | 15 % | Inputs enter the mechanism. The live readout rolls up as they land. |
| Operate | 40 % | The rule fires once per motion, highlighted where it happens, with a step caption ("Carry: two ×2 → one ×4"). No two operations overlap, so each can be followed. |
| Read | 10 % | The mechanism comes to rest; the answer is read from its state and turns accent-coloured. |
| Generalise | 15 % | One sentence: why this works for every input. |
| Limit | 10 % | One explicit "not shown" line: what this example doesn't prove or cover (overflow, negative numbers, efficiency, the case n = 0, how real hardware does it). |

## Look

- **The mechanism is the hero, the readout panel is its gauge.** The panel holds the inputs, a big live value, per-part digits (tray counts, layer sizes), and the step counter with its caption. All numbers are tabular mono.
- **Quiet grid ground** (`#f3f2ee` with a 6 % ink grid), ink `#16171a`. Two input colours (A `#ff5a1f`, B `#2f6fdb`) that stay with their pieces. The accent marks an illegal or pending state (a "2" in a binary column) and the final answer.
- **Labels on the machine, not in a legend:** weights (×16 … ×1) under each tray, A and B beside their hoppers, "out of play" by the bin.
- Pairs with `swiss-grid` (the demo), `blueprint` for a drafted machine, `bauhaus-poster` for a geometric proof.

## Technique

**Run the machine once, bake it, and read every number from the baked state.** In `ready`, the schedule applies the rule (here, right to left: if a tray holds two marbles, the left one rolls to the next tray's free seat and the right one drops out). It records for each marble its motion segments (closed-form fall with bounce, arc roll) and its intervals in each tray. Counts and value are then sums over marbles at time `t`. They are never written into the timeline. **Tie the bookkeeping to physical events:** the carried marble's worth doubles at the same instant its partner leaves play, so the total is exactly invariant during carries (17 stays 17, which is the point of the proof). Digits roll only while a change is in progress and sit sharp otherwise.

```js
// bake (in ready): the one operation, applied to whatever the machine holds
for (let c = 0; c < NC - 1; c++) {
  const [l, r] = trays[c]; if (!(l && r)) continue;
  const free = trays[c + 1][1] ? 0 : 1, t0 = tc, tArr = t0 + ROLL;
  l.seg.push({ t0, t1: tArr, type: 'arc', a: [...l.at], b: [seatX(c + 1, free), TRAY_Y] });
  l.cnt.at(-1).tout = t0;     l.cnt.push({ c: c + 1, tin: tArr, tout: 1e9 });      // physical presence
  l.worth.at(-1).tout = tArr; l.worth.push({ c: c + 1, tin: tArr, tout: 1e9 });    // value: doubles on landing…
  r.seg.push({ t0: tArr, t1: tArr + fallTime(BIN_Y - TRAY_Y), type: 'fall', a: [...r.at], b: [r.at[0] + 8, BIN_Y] });
  r.cnt.at(-1).tout = tArr;   r.worth.at(-1).tout = tArr;                          // …exactly as its partner leaves
  trays[c] = [null, null]; trays[c + 1][free] = l; tc += CARRY;
}
// read (in renderAt): nothing but sums over the state
const rise  = (t, t0) => smooth((t - t0) / 0.24);                 // a digit rolls for 0.24 s after a change
const live  = (iv, t) => rise(t, iv.tin) - rise(t, iv.tout);
const count = (c, t) => marbles.reduce((a, m) => a + m.cnt.filter(iv => iv.c === c).reduce((s, iv) => s + live(iv, t), 0), 0);
const value = t => marbles.reduce((a, m) => a + m.worth.reduce((s, iv) => s + live(iv, t) * 2 ** iv.c, 0), 0);
```

The odometer draws `floor(v)` and the next digit offset by the fractional part, clipped to exactly one digit cell. A value at rest is an integer and renders sharp. For a visual proof the same pattern holds: the layers are the state, and the total `n²` is counted from the drawn squares, not printed from the formula. See `odometer()` and `machine()` in the demo.

## Gotchas

- **Faked answer.** A label that animates to "17" on a timer can disagree with the machine. Compute nothing in the panel; sum the mechanism's state.
- **Value dips mid-move.** If the carried marble's worth changes on departure and its partner's on arrival, the total wobbles (17 → 13 → 17) and the proof looks wrong. Change both at one instant.
- **Too many things at once.** Overlapping operations can't be read. Space them (1.8 s per carry here) and highlight the active column.
- **Rolling digits that never settle,** or that roll through neighbours outside their cell. Roll only while the value is between integers, and clip to one cell (`y − 0.8·size` to `y + 0.1·size`).
- **Proportional digits jitter.** Use tabular mono for every number, fixed cells for multi-digit values, and no leading zeros.
- **Symbols missing on the first frame.** `₂ → × Σ` live in separate font subsets. Load fonts with the real text as the sample (`document.fonts.load(font, text)`), or frames differ (verify reports noise).
- **The claim outruns the demo.** One example is not a proof. State the general rule as a rule, and add a "not shown" line naming the case the example skips.
- **Unreadable mechanism.** Every part that moves must have a visible reason (a gate opens, a tray tips, a trapdoor drops). If a piece teleports, the logic breaks.

## Stills to check

- **t = 0:** problem fully legible, mechanism loaded, readout at 0, step 1 caption showing.
- **Mid-load** (`sheet --strip` across the drop at 10 fps): digits rolling only in the cells that change, nothing outside its clip.
- **Each operation's midpoint:** the highlighted column, the moving piece on its path, the caption naming the operation, the total unchanged.
- **At rest after the last operation:** the per-part digits equal the answer's representation (10001₂), and the big value is in accent.
- **Final hold:** the general sentence and the "not shown" line, both ≥ 4.5:1 contrast and on screen ≥ 3 s.

## Example brief

```
INPUTS      Operation (default: binary addition), worked example (default 11 + 6), accent.
CONCEPT     "A machine that adds by moving marbles, and only by moving marbles."
            Central rule: one motion = one logical step (two in a tray → one in the next tray left).
            Hero object: the row of trays, whose state is the number.
LOCKED COPY "Adding with marbles"; "Rule: two marbles in a tray → one marble in the tray to its left.";
            "A 1011₂ = 11", "B 0110₂ = 6"; captions: Load A and B / Drop A / Drop B / Carry: two ×2 → one ×4 /
            Carry: two ×4 → one ×8 / Carry: two ×8 → one ×16 / Read the trays: 10001₂ = 16 + 1;
            general: "For any two binary numbers: drop both, carry every pair one tray left — the trays then
            read the sum."; limit: "Not shown: overflow. With only four trays, the ×16 marble would have nowhere to go."
LOOK        1920×1080, 30 fps, 18 s. Ground #f3f2ee + 6 % grid, ink #16171a, A #ff5a1f, B #2f6fdb.
            Inter 800/700/500, JetBrains Mono 700/500 tabular. Camera locked.
MOTION      Gravity falls with a damped bounce; arc rolls inOut over 1.0 s; digits roll 0.24 s.
BANNED      Numbers that animate on their own timer, sparkles on the answer, overlapping operations, shake.
STRUCTURE   0–2.2 problem; 2.2 drop A; 3.4 drop B; 5.0 / 6.8 / 8.6 carries; 10.1 read; 11.7 general; 14.3 limit; hold to 18.
BUILD       Bake the run in ready (segments + tray intervals); pure function of t; fonts loaded with real text.
GATES       Stills at 0, 4.3, 5.5, 10.5, 15.5; strip 3.3–4.3 at 10 fps; verify --duration 18.
```
